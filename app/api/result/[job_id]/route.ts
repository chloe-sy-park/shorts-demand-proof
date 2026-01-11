import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { job_id: string } }
) {
  try {
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("id", params.job_id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: error?.message ?? "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
