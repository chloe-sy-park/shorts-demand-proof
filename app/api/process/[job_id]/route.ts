import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { buildReportPrompt } from "../../../../lib/reportPrompts";
import { segmentsToScenes, type TranscriptSegment } from "../../../../lib/segmentsToScenes";

export const runtime = "nodejs";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function parseJsonFromText(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "");
  return JSON.parse(withoutFence);
}

export async function POST(
  request: Request,
  { params }: { params: { job_id: string } }
) {
  const jobId = params.job_id;

  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const { data: job, error: jobError } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: jobError?.message ?? "Job not found" }, { status: 404 });
    }

    await supabaseAdmin.from("jobs").update({ status: "processing" }).eq("id", jobId);

    if (!job.input_path) {
      throw new Error("Job missing input_path");
    }

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(job.input_bucket ?? "shorts")
      .createSignedUrl(job.input_path, 60);

    if (signedError || !signed?.signedUrl) {
      throw new Error(signedError?.message ?? "Failed to create signed URL");
    }

    const fileResponse = await fetch(signed.signedUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch input file: ${fileResponse.status}`);
    }

    const inputBytes = await fileResponse.arrayBuffer();
    const fileBlob = new Blob([inputBytes], { type: job.input_mime ?? "video/mp4" });

    const formData = new FormData();
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("file", fileBlob, "input.mp4");

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const transcriptionData = await transcriptionResponse.json();
    const transcriptFull = transcriptionData.text ?? "";
    const segments = (transcriptionData.segments ?? []) as TranscriptSegment[];
    const scenes = segmentsToScenes(segments, 3, 6);

    const prompt = buildReportPrompt({ transcript_full: transcriptFull, scenes });

    const chatResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user }
        ]
      })
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      throw new Error(`Chat completion failed: ${errorText}`);
    }

    const chatData = await chatResponse.json();
    const content = chatData.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Chat completion missing content");
    }

    const parsed = parseJsonFromText(content);
    const { report_md, report_json, conti_json } = parsed;

    const { error: updateError } = await supabaseAdmin
      .from("jobs")
      .update({
        status: "done",
        transcript_full: transcriptFull,
        scenes,
        report_md,
        report_json,
        conti_json
      })
      .eq("id", jobId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ status: "done" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    await supabaseAdmin.from("jobs").update({ status: "error", error: message }).eq("id", jobId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
