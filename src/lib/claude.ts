import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { KIND_LABEL, type SourceLabels, SourceLabelsSchema } from "./quality";
import type { Citation, HistoryTurn, Source } from "./types";

const client = new Anthropic();
const MODEL = "claude-opus-5-5";
const LABEL_MODEL = "claude-haiku-5-5"; // cheap, fast classification of source types

const BASE_RULES = `- Don't write citation markers like [1] yourself; citations are attached automatically.
- Each search result's title notes its source type and publish date when known. When sources conflict, give more weight to the subject's own official site, government, academic and recent sources than to forums, social media or old articles.
- When sources disagree on something that matters to the answer (a number, date, status or claim), don't silently pick one. Add a short blockquote that starts with [!CONFLICT], states each position with its citation, and says which looks more reliable and why.
- If the question depends on current information and the newest relevant results are old or undated, say so in one short sentence at the start.
- Lead with the direct answer, then supporting detail. Use Markdown: short paragraphs, lists or tables where they help, and headings only for long answers.
- Don't add a references list at the end; the interface shows the sources separately.
- Latency-sensitive; begin your visible answer immediately.`;

const ANSWER_SYSTEM = `You are a research assistant that answers questions using web search results.

- Base your answer on the search results provided with each question, and cite them for every claim they support.
- If the sources don't contain enough to answer, say what's missing rather than guessing. You may add widely known background knowledge, but don't cite it.
${BASE_RULES}`;

const SOURCES_ONLY_SYSTEM = `You are a research assistant that answers strictly from web search results.

- State only what the search results support, and cite every sentence. Don't add background knowledge, opinions, recommendations or speculation.
- If the results don't answer the question, or only answer part of it, say exactly what they don't cover instead of filling the gap.
${BASE_RULES}`;

export type AnswerEvent =
  | { kind: "text"; block: number; delta: string }
  | { kind: "citation"; block: number; citation: Citation };

function searchResultBlocks(sources: Source[]): Anthropic.Beta.BetaSearchResultBlockParam[] {
  return sources.map((s) => ({
    type: "search_result",
    source: s.url,
    title: [
      s.title,
      s.kind && KIND_LABEL[s.kind],
      s.publishedDate && `published ${s.publishedDate.slice(0, 10)}`,
    ]
      .filter(Boolean)
      .join(" · "),
    content: s.chunks.map((text) => ({ type: "text", text })),
    citations: { enabled: true },
  }));
}

function historyMessages(history: HistoryTurn[]): Anthropic.Beta.BetaMessageParam[] {
  return history.flatMap((t) => [
    { role: "user" as const, content: t.question },
    { role: "assistant" as const, content: t.answer },
  ]);
}

// Turns a follow-up like "what about in Europe?" into a standalone search query.
export async function rewriteQuery(question: string, history: HistoryTurn[]): Promise<string> {
  if (history.length === 0) return question;

  const transcript = history
    .slice(-3)
    .map((t) => `User: ${t.question}\nAssistant: ${t.answer.slice(0, 1500)}`)
    .join("\n\n");

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: {
      effort: "low",
      format: zodOutputFormat(z.object({ query: z.string() })),
    },
    messages: [
      {
        role: "user",
        content: `<conversation>\n${transcript}\n</conversation>\n\nFollow-up question: ${question}\n\nWrite a concise, self-contained web search query that captures what the follow-up is asking, resolving any references to the conversation.`,
      },
    ],
  });

  return response.parsed_output?.query || question;
}

export async function* streamAnswer(
  question: string,
  sources: Source[],
  history: HistoryTurn[],
  sourcesOnly = false,
): AsyncGenerator<AnswerEvent> {
  const today = new Date().toISOString().slice(0, 10);
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default", // re-runs a safety-classifier refusal on Anthropic's recommended fallback model
    output_config: { effort: "medium" },
    system: sourcesOnly ? SOURCES_ONLY_SYSTEM : ANSWER_SYSTEM,
    messages: [
      ...historyMessages(history),
      {
        role: "user",
        content: [
          ...searchResultBlocks(sources),
          { type: "text", text: `Today's date: ${today}\n\nQuestion: ${question}` },
        ],
      },
    ],
  });

  for await (const event of stream) {
    if (event.type !== "content_block_delta") continue;
    if (event.delta.type === "text_delta") {
      yield { kind: "text", block: event.index, delta: event.delta.text };
    } else if (
      event.delta.type === "citations_delta" &&
      event.delta.citation.type === "search_result_location"
    ) {
      const c = event.delta.citation;
      yield {
        kind: "citation",
        block: event.index,
        citation: {
          sourceId: c.search_result_index,
          citedText: c.cited_text,
          start: c.start_block_index,
          end: c.end_block_index,
        },
      };
    }
  }

  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new Error("The model declined to answer this question.");
  }
}

export async function relatedQuestions(question: string, sources: Source[]): Promise<string[]> {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2000,
    output_config: {
      effort: "low",
      format: zodOutputFormat(z.object({ questions: z.array(z.string()) })),
    },
    messages: [
      {
        role: "user",
        content: `A user asked: "${question}"\n\nSearch results they're reading:\n${sources
          .map((s) => `- ${s.title}: ${s.content.slice(0, 300)}`)
          .join("\n")}\n\nSuggest 4 short follow-up questions they might ask next. Each should explore a different angle and stand on its own.`,
      },
    ],
  });

  return (response.parsed_output?.questions ?? []).slice(0, 4);
}

// Labels sources with Claude Haiku using structured outputs (the fallback when Qwen is
// unavailable; see labels.ts).
export async function labelWithClaude(prompt: string): Promise<SourceLabels> {
  const response = await client.messages.parse({
    model: LABEL_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(SourceLabelsSchema) },
    messages: [{ role: "user", content: prompt }],
  });
  return response.parsed_output ?? { labels: [] };
}
