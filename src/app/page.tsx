"use client";

import { useEffect, useRef, useState } from "react";
import { Answer } from "@/components/Answer";
import { SearchBox } from "@/components/SearchBox";
import { type AnswerSelection, SelectionToolbar } from "@/components/SelectionToolbar";
import { Sources, SourcesButton } from "@/components/Sources";
import { type PanelState, SourcesPanel } from "@/components/SourcesPanel";
import { citationsForSegments } from "@/lib/text";
import type { HistoryTurn, Segment, Source, StreamEvent } from "@/lib/types";

type Turn = {
  question: string;
  sourcesOnly: boolean;
  query?: string;
  sources: Source[];
  segments: Segment[];
  blockToSegment: Record<number, number>;
  related: string[];
  status: "searching" | "answering" | "done" | "error";
  error?: string;
};

const answerText = (t: Turn) => t.segments.map((s) => s.text).join("");

// Returns the segment for a streamed content block, creating it on first sight.
function withSegment(t: Turn, block: number, edit: (s: Segment) => Segment): Partial<Turn> {
  const existing = t.blockToSegment[block];
  if (existing === undefined) {
    return {
      segments: [...t.segments, edit({ text: "", citations: [] })],
      blockToSegment: { ...t.blockToSegment, [block]: t.segments.length },
    };
  }
  return { segments: t.segments.map((s, i) => (i === existing ? edit(s) : s)) };
}

export default function Home() {
  const [turns, setTurns] = useState<Turn[]>([]);
  // The panel remembers which turn it shows so it picks up sources labelled after it opened.
  const [panel, setPanel] = useState<(PanelState & { turn: number }) | null>(null);
  const [quote, setQuote] = useState<string>();
  const [sourcesOnly, setSourcesOnly] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = turns.some((t) => t.status === "searching" || t.status === "answering");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  async function ask(input: string) {
    const question = quote ? `Regarding "${quote}": ${input}` : input;
    setQuote(undefined);

    const history: HistoryTurn[] = turns
      .filter((t) => t.status === "done")
      .map((t) => ({ question: t.question, answer: answerText(t) }));

    const index = turns.length;
    const update = (patch: (t: Turn) => Partial<Turn>) =>
      setTurns((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch(t) } : t)));

    setTurns((prev) => [
      ...prev,
      {
        question,
        sourcesOnly,
        sources: [],
        segments: [],
        blockToSegment: {},
        related: [],
        status: "searching",
      },
    ]);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history, sourcesOnly }),
      });
      if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          switch (event.type) {
            case "query":
              update(() => ({ query: event.query }));
              break;
            case "sources":
              update(() => ({ sources: event.sources, status: "answering" }));
              break;
            case "text":
              update((t) => withSegment(t, event.block, (s) => ({ ...s, text: s.text + event.delta })));
              break;
            case "citation":
              update((t) =>
                withSegment(t, event.block, (s) => ({ ...s, citations: [...s.citations, event.citation] })),
              );
              break;
            case "labels":
              update((t) => ({
                sources: t.sources.map((s) =>
                  event.labels[s.id] ? { ...s, kind: event.labels[s.id], kindBy: "ai" as const } : s,
                ),
              }));
              break;
            case "related":
              update(() => ({ related: event.questions }));
              break;
            case "error":
              update(() => ({ status: "error", error: event.message }));
              break;
            case "done":
              update(() => ({ status: "done" }));
              break;
          }
        }
      }
    } catch (err) {
      update(() => ({ status: "error", error: err instanceof Error ? err.message : String(err) }));
    }
  }

  function checkSources(selection: AnswerSelection) {
    const turn = turns[selection.turn];
    if (!turn) return;
    setPanel({
      turn: selection.turn,
      mode: "claim",
      sources: turn.sources,
      claim: selection.claim,
      ...citationsForSegments(turn.segments, selection.segments),
    });
  }

  if (turns.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
        <h1 className="mb-8 text-center text-4xl font-semibold tracking-tight">Where knowledge begins</h1>
        <div className="w-full max-w-2xl">
          <SearchBox
            onSubmit={ask}
            placeholder="Ask anything…"
            autoFocus
            sourcesOnly={sourcesOnly}
            onSourcesOnlyChange={setSourcesOnly}
          />
        </div>
      </main>
    );
  }

  return (
    <main className={`flex flex-1 flex-col transition-[padding] ${panel ? "sm:pr-[440px]" : ""}`}>
      <header className="sticky top-0 z-10 border-b border-line bg-background/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="font-semibold">Search</span>
          <button
            onClick={() => {
              setTurns([]);
              setPanel(null);
              setQuote(undefined);
            }}
            disabled={busy}
            className="rounded-lg border border-line px-3 py-1 text-sm hover:bg-surface-hover disabled:opacity-40"
          >
            New thread
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {turns.map((turn, i) => (
          <section key={i} className="mb-12 border-b border-line pb-10 last:border-b-0">
            <h2 className="mb-1 text-2xl font-semibold tracking-tight">{turn.question}</h2>
            <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              {turn.query && turn.query !== turn.question && <span>Searched for “{turn.query}”</span>}
              {turn.sourcesOnly && (
                <span className="rounded-md bg-accent/15 px-1.5 py-px text-xs text-accent">Sources only</span>
              )}
            </p>

            <h3 className="section-label">Sources</h3>
            {turn.sources.length > 0 ? (
              <Sources sources={turn.sources} onShowAll={() => setPanel({ turn: i, mode: "all", sources: turn.sources })} />
            ) : turn.status === "searching" ? (
              <p className="animate-pulse text-sm text-muted">Searching the web…</p>
            ) : null}

            <h3 className="section-label mt-6">Answer</h3>
            {turn.segments.length > 0 ? (
              <div data-answer-turn={i}>
                <Answer segments={turn.segments} sources={turn.sources} />
              </div>
            ) : turn.status === "answering" ? (
              <p className="animate-pulse text-sm text-muted">Reading sources…</p>
            ) : null}

            {turn.status === "done" && turn.sources.length > 0 && (
              <div className="mt-5">
                <SourcesButton
                  sources={turn.sources}
                  onClick={() => setPanel({ turn: i, mode: "all", sources: turn.sources })}
                />
              </div>
            )}

            {turn.status === "error" && (
              <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                {turn.error}
              </p>
            )}

            {turn.related.length > 0 && (
              <>
                <h3 className="section-label mt-8">Related</h3>
                <ul className="divide-y divide-line">
                  {turn.related.map((q) => (
                    <li key={q}>
                      <button
                        onClick={() => ask(q)}
                        disabled={busy}
                        className="flex w-full items-center justify-between py-2.5 text-left text-sm hover:text-accent disabled:opacity-50"
                      >
                        {q}
                        <span className="text-muted">+</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent px-4 pb-4 pt-6">
        <div className="mx-auto max-w-3xl">
          <SearchBox
            onSubmit={ask}
            disabled={busy}
            placeholder="Ask a follow-up…"
            quote={quote}
            onClearQuote={() => setQuote(undefined)}
            sourcesOnly={sourcesOnly}
            onSourcesOnlyChange={setSourcesOnly}
          />
        </div>
      </div>

      <SelectionToolbar onFollowUp={setQuote} onCheckSources={checkSources} />
      {panel && (
        <SourcesPanel
          state={{ ...panel, sources: turns[panel.turn]?.sources ?? panel.sources }}
          onClose={() => setPanel(null)}
        />
      )}
    </main>
  );
}
