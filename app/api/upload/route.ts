import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const sourceUrl = formData.get("source_url");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "file too large", max_bytes: MAX_FILE_BYTES },
        { status: 413 }
      );
    }

    const { data: job, error: insertError } = await supabaseAdmin
      .from("jobs")
      .insert({
        status: "queued",
        source_type: "upload",
        source_url: typeof sourceUrl === "string" ? sourceUrl : null,
        input_mime: file.type
      })
      .select("id")
      .single();

    if (insertError || !job) {
      return NextResponse.json({ error: insertError?.message ?? "job insert failed" }, { status: 500 });
    }

    const extensionMatch = file.name.match(/\.[0-9a-z]+$/i);
    const extension = extensionMatch ? extensionMatch[0] : ".mp4";
    const inputPath = `jobs/${job.id}/input${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from("shorts")
      .upload(inputPath, new Uint8Array(arrayBuffer), {
        contentType: file.type || "video/mp4",
        upsert: true
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("jobs")
      .update({
        input_path: inputPath,
        input_bucket: "shorts"
      })
      .eq("id", job.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ job_id: job.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
