"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  question: z.string().max(4000),
  answerPreview: z.string().max(2000),
  helpful: z.boolean(),
  citationCount: z.number().int().min(0),
});

/**
 * Thumbs up/down on an answer.
 *
 * Feeds the weekly quality review (dev plan §5: "eval deltas, thumbs-down reasons, top
 * failing queries"). Writes to `answer_feedback`, which is tenant-scoped by RLS — the
 * tenant is taken from the JWT claim inside the insert policy, not from the client.
 *
 * Failure is deliberately silent: losing a feedback row must never break the chat.
 */
export async function submitAnswerFeedback(input: {
  question: string;
  answerPreview: string;
  helpful: boolean;
  citationCount: number;
}): Promise<{ ok: boolean }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("answer_feedback").insert({
      question: parsed.data.question,
      answer_preview: parsed.data.answerPreview,
      helpful: parsed.data.helpful,
      citation_count: parsed.data.citationCount,
    });
    return { ok: !error };
  } catch {
    return { ok: false };
  }
}
