import { z } from "zod";
import { cheapJson } from "./cheap";
import { SOURCE_KINDS, type SourceKind } from "./quality";
import type { Source } from "./types";

// Kinds are validated after parsing, so an unexpected kind is dropped rather than
// failing the whole reply.
const LabelsSchema = z.object({
  labels: z.array(z.object({ id: z.number(), kind: z.string() })),
});

const LABEL_PROMPT = `Label what kind of website each search result comes from, using its URL, title and snippet.

Kinds:
- official: the website of the organization, product or person the question is about, including its docs, help center, blog and newsroom
- company: a company's own website when that company is not the subject of the question (vendor, product or marketing pages)
- government, academic, reference, news, blog, forum, social, video: as usual
- unknown: you're not confident

Only pick a kind when the evidence is clear; otherwise use unknown.

Reply with JSON only, one entry per result: {"labels": [{"id": <result id>, "kind": "<kind>"}]}`;

// Labels the sources the URL rules couldn't, on the cheapest available model (cheap.ts).
// Returns only confident labels.
export async function labelSources(question: string, sources: Source[]): Promise<Record<number, SourceKind>> {
  const unlabelled = sources.filter((s) => !s.kind);
  if (unlabelled.length === 0) return {};

  const prompt = `${LABEL_PROMPT}\n\nQuestion: ${question}\n\n${unlabelled
    .map((s) => `<result id="${s.id}">\nURL: ${s.url}\nTitle: ${s.title}\nSnippet: ${s.content.slice(0, 300)}\n</result>`)
    .join("\n")}`;

  const result = await cheapJson("labelling", prompt, LabelsSchema);

  const ids = new Set(unlabelled.map((s) => s.id));
  const known = new Set<string>(SOURCE_KINDS);
  const labels: Record<number, SourceKind> = {};
  for (const { id, kind } of result.labels) {
    if (known.has(kind) && ids.has(id)) labels[id] = kind as SourceKind;
  }
  return labels;
}
