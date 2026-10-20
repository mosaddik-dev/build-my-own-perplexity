import { KIND_LABEL, TRUSTED_KINDS, USER_GENERATED_KINDS } from "@/lib/quality";
import { timeAgo } from "@/lib/text";
import type { Source } from "@/lib/types";

// Quality label and publish date for a source, e.g. "🛡 Official docs · 3d ago".
export function SourceMeta({ source, className = "" }: { source: Source; className?: string }) {
  const age = source.publishedDate ? timeAgo(source.publishedDate) : undefined;
  if (!source.kind && !age) return null;
  const tone = !source.kind
    ? ""
    : TRUSTED_KINDS.has(source.kind)
      ? "text-accent"
      : USER_GENERATED_KINDS.has(source.kind)
        ? "text-ai"
        : "";

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] text-muted ${className}`}>
      {source.kind && (
        <span
          className={`inline-flex items-center gap-1 ${tone}`}
          title={
            source.kindBy === "ai"
              ? "Labelled by AI from the page title and snippet"
              : "Identified from the web address"
          }
        >
          {TRUSTED_KINDS.has(source.kind) && (
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {KIND_LABEL[source.kind]}
        </span>
      )}
      {source.kind && age && <span aria-hidden>·</span>}
      {age && <time dateTime={source.publishedDate}>{age}</time>}
    </span>
  );
}
