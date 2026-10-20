import { labelWithClaude } from "./claude";
import type { SourceKind, SourceLabels } from "./quality";
import { labelWithQwen } from "./qwen";
import type { Source } from "./types";

const LABEL_PROMPT = `Label what kind of website each search result comes from, using its URL, title and snippet.

Kinds:
- official: the website of the organization, product or person the question is about, including its docs, help center, blog and newsroom
- company: a company's own website when that company is not the subject of the question (vendor, product or marketing pages)
- government, academic, reference, news, blog, forum, social, video: as usual
- unknown: you're not confident

Only pick a kind when the evidence is clear; otherwise use unknown.

Reply with JSON only, one entry per result: {"labels": [{"id": <result id>, "kind": "<kind>"}]}`;

// Labels the sources the URL rules couldn't, with Qwen (cheapest) when ALIBABA_API_KEY is
// set and Claude Haiku otherwise or when Qwen fails. Returns only confident labels.
export async function labelSources(question: string, sources: Source[]): Promise<Record<number, SourceKind>> {
  const unlabelled = sources.filter((s) => !s.kind);
  if (unlabelled.length === 0) return {};

  const prompt = `${LABEL_PROMPT}\n\nQuestion: ${question}\n\n${unlabelled
    .map((s) => `<result id="${s.id}">\nURL: ${s.url}\nTitle: ${s.title}\nSnippet: ${s.content.slice(0, 300)}\n</result>`)
    .join("\n")}`;

  let result: SourceLabels | undefined;
  if (process.env.ALIBABA_API_KEY) {
    try {
      result = await labelWithQwen(prompt);
    } catch (err) {
      console.warn("Qwen labelling failed; falling back to Claude Haiku", err);
    }
  }
  result ??= await labelWithClaude(prompt);

  const ids = new Set(unlabelled.map((s) => s.id));
  const labels: Record<number, SourceKind> = {};
  for (const { id, kind } of result.labels) {
    if (kind !== "unknown" && ids.has(id)) labels[id] = kind;
  }
  return labels;
}
