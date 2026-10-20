import { z } from "zod";
import { cheapJson } from "./cheap";
import type { Source } from "./types";

const RelatedSchema = z.object({ questions: z.array(z.string()) });

// Suggests follow-up questions on the cheapest available model (cheap.ts).
export async function relatedQuestions(question: string, sources: Source[]): Promise<string[]> {
  const prompt = `A user asked: "${question}"

Search results they're reading:
${sources.map((s) => `- ${s.title}: ${s.content.slice(0, 300)}`).join("\n")}

Suggest 4 short follow-up questions they might ask next. Each should explore a different angle and stand on its own. Write them in the same language as the user's question.

Reply with JSON only: {"questions": ["...", "...", "...", "..."]}`;

  const { questions } = await cheapJson("related questions", prompt, RelatedSchema);
  return questions.map((q) => q.trim()).filter(Boolean).slice(0, 4);
}
