import type { Scene } from "./segmentsToScenes";

export type ReportPayload = {
  transcript_full: string;
  scenes: Scene[];
};

export function buildReportPrompt(payload: ReportPayload) {
  const system =
    "You are a helpful creative strategist for short-form video demand proof reports. " +
    "Respond with strict JSON only. No markdown, no code fences.";

  const user = {
    instructions: {
      report_md: "Concise one-page markdown report for a manufacturer demand proof.",
      report_json:
        "Include summary, target_hypothesis, hook_options (3), comment_prompts (2), comment_taxonomy, wadiz_test_plan, manufacturer_pitch_angles.",
      conti_json:
        "Return hook_options (3) and scenes array. Each scene must include start_sec, end_sec, visual, narration, on_screen_text (<=15 Korean chars), edit_notes. End with a final CTA scene that is comment-first."
    },
    transcript_full: payload.transcript_full,
    scenes: payload.scenes
  };

  return {
    system,
    user: JSON.stringify(user, null, 2)
  };
}
