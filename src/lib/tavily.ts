import type { Source } from "./types";

type TavilyResult = {
  title: string;
  url: string;
  content: string;
  favicon?: string;
  published_date?: string | null;
};

// Splits text into sentence-sized chunks so citations can point at exact sentences.
function toChunks(content: string): string[] {
  const parts = content
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?।])\s+/);
  const chunks: string[] = [];
  for (const part of parts) {
    const last = chunks.at(-1);
    // Glue fragments like "e.g." or headings onto their neighbour.
    if (last !== undefined && last.length < 40) chunks[chunks.length - 1] = `${last} ${part}`;
    else chunks.push(part);
  }
  return chunks.filter(Boolean);
}

export async function searchWeb(query: string, maxResults = 8): Promise<Source[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: maxResults,
      include_favicon: true,
      include_published_date: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { results?: TavilyResult[] };
  return (data.results ?? [])
    .map((r) => ({ ...r, chunks: toChunks(r.content ?? "") }))
    .filter((r) => r.chunks.length > 0)
    .map((r, i) => ({
      id: i,
      title: r.title,
      url: r.url,
      content: r.content,
      favicon: r.favicon,
      publishedDate: r.published_date ?? undefined,
      chunks: r.chunks,
    }));
}
