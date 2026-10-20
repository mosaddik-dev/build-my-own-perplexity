import type { SourceKind } from "./quality";

export type Source = {
  id: number; // 0-based position, matches Claude's search_result_index
  title: string;
  url: string;
  content: string;
  favicon?: string;
  publishedDate?: string; // ISO date, when Tavily detected one
  kind?: SourceKind; // source type label
  kindBy?: "rule" | "ai"; // certain URL rule, or Claude Haiku's judgment from title and snippet
  // Sentence-sized pieces of `content`; citations point into this array.
  chunks: string[];
};

export type Citation = {
  sourceId: number;
  citedText: string;
  start: number; // chunk range [start, end) in the source
  end: number;
};

// A run of answer text; Claude attaches citations to the run they support.
export type Segment = {
  text: string;
  citations: Citation[];
};

// One completed question/answer exchange, sent back by the client for follow-ups.
export type HistoryTurn = {
  question: string;
  answer: string;
};

export type SearchRequest = {
  question: string;
  history?: HistoryTurn[];
  sourcesOnly?: boolean; // answer strictly from the search results
};

// Newline-delimited JSON events streamed from /api/search.
export type StreamEvent =
  | { type: "query"; query: string }
  | { type: "sources"; sources: Source[] }
  | { type: "text"; block: number; delta: string }
  | { type: "citation"; block: number; citation: Citation }
  | { type: "labels"; labels: Record<number, SourceKind> } // AI labels for sources the rules missed
  | { type: "related"; questions: string[] }
  | { type: "error"; message: string }
  | { type: "done" };
