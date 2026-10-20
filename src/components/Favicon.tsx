import type { Source } from "@/lib/types";

export function Favicon({ source, className = "h-4 w-4" }: { source: Source; className?: string }) {
  if (!source.favicon) {
    return (
      <span
        className={`${className} inline-flex shrink-0 items-center justify-center rounded-full bg-surface-hover text-[9px] font-semibold uppercase text-muted`}
      >
        {new URL(source.url).hostname.replace(/^www\./, "")[0]}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={source.favicon} alt="" className={`${className} shrink-0 rounded-full bg-white`} />;
}
