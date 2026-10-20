"use client";

import { Favicon } from "@/components/Favicon";
import { SourceMeta } from "@/components/SourceMeta";
import { domainLabel, type Support, textFragmentUrl } from "@/lib/text";
import type { Citation, Source } from "@/lib/types";

export type PanelState =
  | { mode: "all"; sources: Source[] }
  | { mode: "claim"; sources: Source[]; claim: string; citations: Citation[]; support: Support };

function SupportNotice({ support }: { support: Support }) {
  if (support === "sourced") return null;
  const text = {
    ai: "Written by the AI. No search result backs this text; it comes from the model's own knowledge or reasoning, so verify it before relying on it.",
    partial: "Part of this selection is AI-written and not backed by a source. Only the sourced part is listed below.",
    unknown: "This selection isn't part of the answer text. Try selecting a sentence.",
  }[support];
  return (
    <div className="mb-5 flex gap-2.5 rounded-xl border border-ai/40 bg-ai/10 p-3 text-sm leading-6">
      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-ai" />
      <p>{text}</p>
    </div>
  );
}

function SourceCard({ source, citation }: { source: Source; citation?: Citation }) {
  const before = citation ? source.chunks[citation.start - 1] : undefined;
  const after = citation ? source.chunks[citation.end] : undefined;

  return (
    <div className="rounded-xl bg-surface p-4">
      <div className="mb-1.5 flex items-center gap-2 text-xs text-muted">
        <Favicon source={source} />
        {domainLabel(source.url)}
      </div>
      <a
        href={textFragmentUrl(source.url, citation?.citedText)}
        target="_blank"
        rel="noreferrer"
        className="mb-2 block font-medium hover:text-accent hover:underline"
      >
        {source.title}
      </a>
      <SourceMeta source={source} className="-mt-1 mb-2" />
      {citation ? (
        <blockquote className="border-l-2 border-line pl-3 text-sm leading-6">
          {before && <span className="text-muted">…{before} </span>}
          <a
            href={textFragmentUrl(source.url, citation.citedText)}
            target="_blank"
            rel="noreferrer"
            className="rounded bg-accent/15 text-accent hover:bg-accent/25"
          >
            {citation.citedText}
          </a>
          {after && <span className="text-muted"> {after}…</span>}
        </blockquote>
      ) : (
        <p className="line-clamp-3 text-sm text-muted">{source.content}</p>
      )}
    </div>
  );
}

export function SourcesPanel({ state, onClose }: { state: PanelState; onClose: () => void }) {
  const claimCitations =
    state.mode === "claim" ? state.citations.filter((c) => state.sources[c.sourceId]) : [];

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full flex-col border-l border-line bg-background sm:w-[440px]">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="font-semibold">
          {state.mode === "all"
            ? `${state.sources.length} sources`
            : state.support === "ai"
              ? "No sources"
              : `${new Set(claimCitations.map((c) => c.sourceId)).size} sources found`}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close sources"
          className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {state.mode === "claim" ? (
          <>
            <p
              className={`mb-5 font-medium leading-7 ${state.support === "ai" ? "text-ai" : "text-accent"}`}
            >
              {state.claim}
            </p>
            <SupportNotice support={state.support} />
            {claimCitations.length > 0 ? (
              <>
                <p className="mb-3 text-sm text-muted">Sources that support this claim:</p>
                {claimCitations.map((c, i) => (
                  <SourceCard key={i} source={state.sources[c.sourceId]} citation={c} />
                ))}
              </>
            ) : null}
          </>
        ) : (
          state.sources.map((s) => <SourceCard key={s.id} source={s} />)
        )}
      </div>
    </aside>
  );
}
