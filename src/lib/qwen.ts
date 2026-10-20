import { z } from "zod";
import { SOURCE_KINDS, type SourceKind, type SourceLabels } from "./quality";

// Alibaba Cloud Model Studio, international (Singapore) OpenAI-compatible endpoint.
const ENDPOINT = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
// Pinned snapshot: the "qwen3.7-flash" alias moves to newer snapshots, which can be priced differently.
const MODEL = "qwen3.7-flash-2026-07-15";

// JSON mode doesn't enforce a schema, so validate loosely and drop kinds we don't know.
const ReplySchema = z.object({
  labels: z.array(z.object({ id: z.number(), kind: z.string() })),
});

export async function labelWithQwen(prompt: string): Promise<SourceLabels> {
  const apiKey = process.env.ALIBABA_API_KEY;
  if (!apiKey) throw new Error("ALIBABA_API_KEY is not set");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      enable_thinking: false, // thinking tokens would cost more than the labels themselves
      max_tokens: 1000,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Qwen request failed (${res.status}): ${await res.text()}`);

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Qwen returned no content");

  const { labels } = ReplySchema.parse(JSON.parse(content));
  const known = new Set<string>(SOURCE_KINDS);
  return {
    labels: labels.map((l) => ({ id: l.id, kind: known.has(l.kind) ? (l.kind as SourceKind) : "unknown" })),
  };
}
