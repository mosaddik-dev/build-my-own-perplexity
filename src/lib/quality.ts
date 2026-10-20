import { z } from "zod";

// Source labels. classifySource is free and rule-based, using only rules that are certain
// when they match: restricted domains (.gov, .edu, ...) and exact site lists. Sources it
// leaves unlabelled are labelled by a cheap model from their title and snippet
// (labelSources in labels.ts), which adds the kinds a URL alone can't reveal.

export type SourceKind =
  | "official"
  | "company"
  | "government"
  | "academic"
  | "reference"
  | "news"
  | "blog"
  | "forum"
  | "social"
  | "video";

export const SOURCE_KINDS = [
  "official", "company", "government", "academic", "reference", "news", "blog", "forum", "social", "video",
] as const satisfies readonly SourceKind[];

// What a labelling model returns: one kind per search result id, or "unknown".
export const SourceLabelsSchema = z.object({
  labels: z.array(z.object({ id: z.number(), kind: z.enum([...SOURCE_KINDS, "unknown"]) })),
});
export type SourceLabels = z.infer<typeof SourceLabelsSchema>;

export const KIND_LABEL: Record<SourceKind, string> = {
  official: "Official site",
  company: "Company site",
  government: "Government",
  academic: "Academic",
  reference: "Reference",
  news: "News",
  blog: "Blog",
  forum: "Forum",
  social: "Social media",
  video: "Video",
};

// Primary or well-established sources vs. user-generated ones.
export const TRUSTED_KINDS = new Set<SourceKind>(["official", "government", "academic", "reference"]);
export const USER_GENERATED_KINDS = new Set<SourceKind>(["blog", "forum", "social", "video"]);

const matches = (host: string, domains: string[]) =>
  domains.some((d) => host === d || host.endsWith(`.${d}`));

const ACADEMIC = [
  "arxiv.org", "nature.com", "science.org", "sciencedirect.com", "springer.com", "link.springer.com",
  "ieee.org", "acm.org", "jstor.org", "pubmed.ncbi.nlm.nih.gov", "researchgate.net", "plos.org",
  "thelancet.com", "nejm.org", "cell.com", "wiley.com", "biorxiv.org", "medrxiv.org", "ssrn.com",
];
const GOVERNMENT = ["europa.eu", "who.int", "un.org", "worldbank.org", "imf.org", "oecd.org"];
const REFERENCE = ["wikipedia.org", "britannica.com", "wiktionary.org", "merriam-webster.com", "investopedia.com"];
const NEWS = [
  "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "nytimes.com", "theguardian.com", "washingtonpost.com",
  "wsj.com", "bloomberg.com", "cnn.com", "cnbc.com", "ft.com", "economist.com", "theverge.com", "techcrunch.com",
  "wired.com", "arstechnica.com", "engadget.com", "axios.com", "npr.org", "aljazeera.com", "forbes.com",
  "businessinsider.com", "nbcnews.com", "abcnews.go.com", "cbsnews.com", "theatlantic.com", "time.com",
  "usatoday.com", "latimes.com", "independent.co.uk", "telegraph.co.uk", "thehindu.com", "indiatimes.com",
  "hindustantimes.com", "prothomalo.com", "thedailystar.net", "bdnews24.com", "dhakatribune.com",
  "venturebeat.com", "zdnet.com", "cnet.com", "9to5mac.com", "9to5google.com", "macrumors.com",
  "androidauthority.com", "tomshardware.com", "theinformation.com", "semafor.com", "politico.com",
];
const FORUM = ["reddit.com", "quora.com", "stackexchange.com", "stackoverflow.com", "news.ycombinator.com"];
const SOCIAL = ["x.com", "twitter.com", "facebook.com", "linkedin.com", "instagram.com", "tiktok.com", "threads.net"];
const VIDEO = ["youtube.com", "youtu.be", "vimeo.com"];
const BLOG = ["medium.com", "substack.com", "blogspot.com", "wordpress.com", "dev.to", "hashnode.dev", "tumblr.com"];

export function classifySource(url: string): SourceKind | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }

  if (/\.(gov|mil)(\.[a-z]{2})?$/.test(host) || /\.(gob|gouv|govt)\./.test(host) || matches(host, GOVERNMENT))
    return "government";
  if (/\.edu(\.[a-z]{2})?$/.test(host) || /\.ac\.[a-z]{2}$/.test(host) || matches(host, ACADEMIC)) return "academic";
  if (matches(host, REFERENCE)) return "reference";
  if (matches(host, FORUM)) return "forum";
  if (matches(host, SOCIAL)) return "social";
  if (matches(host, VIDEO)) return "video";
  if (matches(host, BLOG)) return "blog";
  if (matches(host, NEWS)) return "news";
  return undefined;
}
