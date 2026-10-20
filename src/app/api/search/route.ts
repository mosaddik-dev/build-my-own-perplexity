import { classifySource } from "@/lib/quality";
import { rewriteQuery, streamAnswer } from "@/lib/claude";
import { labelSources } from "@/lib/labels";
import { relatedQuestions } from "@/lib/related";
import { searchWeb } from "@/lib/tavily";
import type { SearchRequest, StreamEvent } from "@/lib/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  const { question, history = [], sourcesOnly = false } = (await request.json()) as SearchRequest;
  if (!question?.trim()) {
    return Response.json({ error: "question is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        const query = await rewriteQuery(question, history);
        send({ type: "query", query });

        const sources = (await searchWeb(query)).map((s) => {
          const kind = classifySource(s.url);
          return { ...s, kind, kindBy: kind && ("rule" as const) };
        });
        send({ type: "sources", sources });

        // A cheap model labels the sources the URL rules missed; sent whenever it finishes.
        const labelled = labelSources(question, sources)
          .then((labels) => {
            if (Object.keys(labels).length) send({ type: "labels", labels });
          })
          .catch((err) => console.error("labelSources failed", err));

        // Related questions only depend on the sources, so generate them alongside the answer.
        const related = relatedQuestions(question, sources).catch(() => []);

        for await (const event of streamAnswer(question, sources, history, sourcesOnly)) {
          if (event.kind === "text") send({ type: "text", block: event.block, delta: event.delta });
          else send({ type: "citation", block: event.block, citation: event.citation });
        }

        await labelled;
        send({ type: "related", questions: await related });
        send({ type: "done" });
      } catch (err) {
        console.error(err);
        send({ type: "error", message: err instanceof Error ? err.message : "Something went wrong" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
