import type { Citation, Segment } from "./types";

// "https://help.openai.com/en/..." -> "help.openai"
export function domainLabel(url: string): string {
  try {
    const parts = new URL(url).hostname.replace(/^www\./, "").split(".");
    const twoPartTld = parts.length > 2 && parts.at(-2)!.length <= 3 && parts.at(-1)!.length === 2;
    return parts.slice(0, twoPartTld ? -2 : -1).join(".") || parts.join(".");
  } catch {
    return url;
  }
}

// "2026-10-17" -> "3d ago"; undefined for unparseable dates.
export function timeAgo(date: string, now = Date.now()): string | undefined {
  const then = Date.parse(date);
  if (Number.isNaN(then)) return undefined;
  const days = Math.floor((now - then) / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function cleanSourceText(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // markdown links -> link text
    .replace(/[#*_`>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Builds a text-fragment URL (#:~:text=) so the browser scrolls to and highlights the quote.
export function textFragmentUrl(url: string, text?: string): string {
  const clean = text ? cleanSourceText(text) : "";
  if (!clean) return url;
  const enc = (s: string) => encodeURIComponent(s).replace(/-/g, "%2D");
  const words = clean.split(" ");
  const fragment =
    words.length > 12
      ? `${enc(words.slice(0, 5).join(" "))},${enc(words.slice(-5).join(" "))}`
      : enc(clean);
  return `${url.split("#")[0]}#:~:text=${fragment}`;
}

// Citations on a segment, one per source+range.
export function uniqueCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  return citations.filter((c) => {
    const key = `${c.sourceId}:${c.start}:${c.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// True when a segment carries real content, not just whitespace or table/list syntax.
export function isSubstantive(text: string): boolean {
  return (text.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 3;
}

// Markdown syntax a segment may start with; boundary markers go after it so tables,
// headings and lists still parse.
const LEADING_STRUCTURE = /^(?:\s+|\|[\s:|-]*(?=\n)|\|\s*|#{1,6} |[-*+] |\d+\. |> )*/;

// Markdown for the whole answer. A [!CONFLICT] tag (Claude's marker for disagreeing
// sources) becomes a #conflict link rendered as a label. Each substantive segment starts with an empty #seg-N
// link (rendered as an invisible boundary marker, used to locate its text in the DOM),
// and each cited segment ends with a #cite-N link that renders as a citation chip.
export function segmentsToMarkdown(segments: Segment[]): string {
  return segments
    .map((seg, i) => {
      if (!isSubstantive(seg.text)) return seg.text;
      const lead = seg.text.match(LEADING_STRUCTURE)![0];
      let text = `${lead}[](#seg-${i})${seg.text.slice(lead.length)}`;
      if (seg.citations.length > 0) {
        const trailing = text.match(/\s*$/)![0];
        text = `${text.slice(0, text.length - trailing.length)} [cite](#cite-${i})${trailing}`;
      }
      return text;
    })
    .join("")
    .replace(/\[!CONFLICT\]/g, "[conflict](#conflict)");
}

// How much of a selection is backed by sources: all, some, none (AI-written), or unknown
// when the selection isn't inside any answer segment.
export type Support = "sourced" | "partial" | "ai" | "unknown";

// Citations behind the answer segments a selection covers, and how well they cover it.
export function citationsForSegments(
  segments: Segment[],
  indices: number[],
): { citations: Citation[]; support: Support } {
  const covered = indices.map((i) => segments[i]).filter((s) => s && isSubstantive(s.text));
  if (covered.length === 0) return { citations: [], support: "unknown" };
  const cited = covered.filter((s) => s.citations.length);
  return {
    citations: uniqueCitations(cited.flatMap((s) => s.citations)),
    support: cited.length === 0 ? "ai" : cited.length < covered.length ? "partial" : "sourced",
  };
}
