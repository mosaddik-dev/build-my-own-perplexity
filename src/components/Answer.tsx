"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CitationChip } from "@/components/CitationChip";
import { segmentsToMarkdown } from "@/lib/text";
import type { Segment, Source } from "@/lib/types";

export function Answer({ segments, sources }: { segments: Segment[]; sources: Source[] }) {
  return (
    <div className="prose-answer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            // Invisible boundary marker; lets text selections map back to answer segments.
            const seg = href?.match(/^#seg-(\d+)$/);
            if (seg) return <span data-seg={seg[1]} />;
            if (href === "#conflict") {
              return (
                <span data-conflict className="conflict-label">
                  Sources disagree
                </span>
              );
            }
            const cite = href?.match(/^#cite-(\d+)$/);
            if (cite) {
              const segment = segments[Number(cite[1])];
              return segment ? <CitationChip citations={segment.citations} sources={sources} /> : null;
            }
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {segmentsToMarkdown(segments)}
      </ReactMarkdown>
    </div>
  );
}
