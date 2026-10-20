import type { z } from "zod";
import { haikuJson } from "./claude";
import { qwenJson } from "./qwen";

// Runs a small JSON task on the cheapest available model: Qwen when ALIBABA_API_KEY is
// set, Claude Haiku otherwise or when Qwen fails. The prompt must describe the JSON shape.
export async function cheapJson<S extends z.ZodType>(task: string, prompt: string, schema: S): Promise<z.infer<S>> {
  if (process.env.ALIBABA_API_KEY) {
    try {
      return await qwenJson(prompt, schema);
    } catch (err) {
      console.warn(`Qwen ${task} failed; falling back to Claude Haiku`, err);
    }
  }
  return haikuJson(prompt, schema);
}
