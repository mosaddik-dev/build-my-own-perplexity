import { Favicon } from "@/components/Favicon";
import { SourceMeta } from "@/components/SourceMeta";
import { domainLabel, timeAgo } from "@/lib/text";
import type { Source } from "@/lib/types";

const STALE_DAYS = 365;

// "Newest source: 3d ago", or a warning when every dated source is over a year old.
function Freshness({ sources }: { sources: Source[] }) {
  const dates = sources.map((s) => Date.parse(s.publishedDate ?? "")).filter((d) => !Number.isNaN(d));
  if (dates.length === 0) return null;
  const newest = new Date(Math.max(...dates)).toISOString();
  const stale = Date.now() - Date.parse(newest) > STALE_DAYS * 86_400_000;

  return stale ? (
    <p className="mt-2 flex items-center gap-1.5 text-xs text-ai">
      <span className="h-1.5 w-1.5 rounded-full bg-ai" />
      Newest source is from {timeAgo(newest)}. This may be out of date.
    </p>
  ) : (
    <p className="mt-2 text-xs text-muted">Newest source: {timeAgo(newest)}</p>
  );
}

export function Sources({ sources, onShowAll }: { sources: Source[]; onShowAll: () => void }) {
  const shown = sources.slice(0, 3);
  const rest = sources.slice(3);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {shown.map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col justify-between gap-2 rounded-lg border border-line bg-surface p-2.5 text-xs transition-colors hover:bg-surface-hover"
          >
            <span className="line-clamp-2 font-medium text-foreground">{s.title}</span>
            <span className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-muted">
                <Favicon source={s} className="h-3.5 w-3.5" />
                <span className="truncate">{domainLabel(s.url)}</span>
              </span>
              <SourceMeta source={s} />
            </span>
          </a>
        ))}
        {rest.length > 0 && (
          <button
            onClick={onShowAll}
            className="flex flex-col justify-between gap-2 rounded-lg border border-line bg-surface p-2.5 text-left text-xs transition-colors hover:bg-surface-hover"
          >
            <span className="flex -space-x-1.5">
              {rest.slice(0, 4).map((s) => (
                <Favicon key={s.id} source={s} className="h-4 w-4 ring-2 ring-surface" />
              ))}
            </span>
            <span className="text-muted">View {rest.length} more</span>
          </button>
        )}
      </div>
      <Freshness sources={sources} />
    </>
  );
}

// "N sources" pill with stacked favicons; opens the sources panel.
export function SourcesButton({ sources, onClick }: { sources: Source[]; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
    >
      <span className="flex -space-x-1.5">
        {sources.slice(0, 4).map((s) => (
          <Favicon key={s.id} source={s} className="h-4 w-4 ring-2 ring-background" />
        ))}
      </span>
      {sources.length} sources
    </button>
  );
}
