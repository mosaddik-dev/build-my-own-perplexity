"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Favicon } from "@/components/Favicon";
import { SourceMeta } from "@/components/SourceMeta";
import { domainLabel, textFragmentUrl } from "@/lib/text";
import type { Citation, Source } from "@/lib/types";

const CARD_WIDTH = 340;

export function CitationChip({ citations, sources }: { citations: Citation[]; sources: Source[] }) {
  const cited = citations
    .map((c) => ({ citation: c, source: sources[c.sourceId] }))
    .filter((x) => x.source);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const chipRef = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [open]);

  if (cited.length === 0) return null;

  const show = () => {
    clearTimeout(closeTimer.current);
    if (open) return;
    const rect = chipRef.current!.getBoundingClientRect();
    const above = rect.bottom + 280 > window.innerHeight;
    setPos({
      top: above ? rect.top - 6 : rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - CARD_WIDTH - 8)),
      above,
    });
    setOpen(true);
  };
  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  const uniqueSources = [...new Set(cited.map((x) => x.source.id))];
  const current = cited[Math.min(page, cited.length - 1)];
  const extra = uniqueSources.length - 1;

  return (
    <>
      <span
        ref={chipRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="citation-chip"
        onClick={() => window.open(textFragmentUrl(current.source.url, current.citation.citedText), "_blank")}
      >
        {domainLabel(cited[0].source.url)}
        {extra > 0 && <span className="opacity-60"> +{extra}</span>}
      </span>
      {open &&
        pos &&
        createPortal(
          <div
            onMouseEnter={show}
            onMouseLeave={hide}
            style={{
              top: pos.top,
              left: pos.left,
              width: CARD_WIDTH,
              transform: pos.above ? "translateY(-100%)" : undefined,
            }}
            className="fixed z-50 overflow-hidden rounded-xl border border-line bg-surface text-sm shadow-xl"
          >
            {cited.length > 1 && (
              <div className="flex items-center justify-between border-b border-line px-3 py-2 text-xs text-muted">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => (p - 1 + cited.length) % cited.length)}
                    className="rounded px-1.5 py-0.5 hover:bg-surface-hover"
                    aria-label="Previous source"
                  >
                    ‹
                  </button>
                  <span className="tabular-nums">
                    {page + 1}/{cited.length}
                  </span>
                  <button
                    onClick={() => setPage((p) => (p + 1) % cited.length)}
                    className="rounded px-1.5 py-0.5 hover:bg-surface-hover"
                    aria-label="Next source"
                  >
                    ›
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="flex -space-x-1.5">
                    {uniqueSources.slice(0, 3).map((id) => (
                      <Favicon key={id} source={sources[id]} className="h-4 w-4 ring-2 ring-surface" />
                    ))}
                  </span>
                  {uniqueSources.length} sources
                </div>
              </div>
            )}
            <a
              href={textFragmentUrl(current.source.url, current.citation.citedText)}
              target="_blank"
              rel="noreferrer"
              className="block p-3 hover:bg-surface-hover"
            >
              <div className="mb-1.5 flex items-center gap-2 text-xs text-muted">
                <Favicon source={current.source} />
                {domainLabel(current.source.url)}
              </div>
              <div className="mb-1 line-clamp-2 font-medium">{current.source.title}</div>
              <SourceMeta source={current.source} className="mb-1.5" />
              <div className="line-clamp-4 text-muted">{current.citation.citedText}</div>
            </a>
          </div>,
          document.body,
        )}
    </>
  );
}
