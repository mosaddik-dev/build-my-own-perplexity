# Build My Own Perplexity

An open-source, Perplexity-style answer engine. Ask a question, it searches the web with [Tavily](https://tavily.com), and [Claude](https://www.anthropic.com/claude) streams back an answer where every claim is tied to the exact source sentence that supports it.

Built with Next.js, the Anthropic SDK and Tavily.

## Features

- **Cited, streaming answers.** Claude's built-in citations attach the exact supporting sentence from a search result to each claim, so citations come from the API rather than from `[1]` markers the model writes itself.
- **Domain citation chips.** Each claim gets a chip like `openai +1`. Hovering it shows the source's title, the quoted sentence, its type and date, and a pager when several sources back the claim.
- **Check sources.** Select or double-click any text in an answer for **Add to follow-up** or **Check sources**. Check sources opens a side panel with the supporting quote from each source, shown with the sentences around it. If no source backs the text, the panel says so.
- **Jump to the quote.** Source links use [text fragments](https://developer.mozilla.org/en-US/docs/Web/URI/Fragment/Text_fragments) (`#:~:text=`), so the source page opens scrolled to the quoted sentence with it highlighted. Works in Chrome, Edge, Brave and Safari.
- **Source labels.** Government, Academic, Reference, News, Blog, Forum, Social media, Video, Official site and Company site. Labels from certain rules (`.gov`, `.edu`, known site lists) appear immediately. A cheap model labels the rest, and answers "unknown" rather than guessing. Hovering a label shows how it was decided.
- **Freshness.** Sources show their publish date ("3d ago"), and a warning appears when every dated source is over a year old.
- **Disagreements.** When sources conflict, the answer includes a **Sources disagree** callout that shows each side with its citation and which looks more reliable.
- **Sources only mode.** A toggle that makes Claude answer strictly from the search results: every sentence cited, with no background knowledge or opinions.
- **Follow-ups and related questions.** Follow-up questions are rewritten into standalone searches using the conversation so far, and each answer suggests related questions in the same language as the question.
- Dark mode, and a layout that works at phone width.

## Getting started

Requires Node.js 20+.

```bash
git clone https://github.com/mosaddik-dev/build-my-own-perplexity.git
cd build-my-own-perplexity
npm install
cp .env.example .env.local   # then add your API keys
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Required | Used for |
|---|---|---|
| `TAVILY_API_KEY` | Yes | Web search ([get a key](https://app.tavily.com)) |
| `ANTHROPIC_API_KEY` | Yes | Answers and follow-up rewriting, plus source labels and related questions when Qwen isn't configured ([get a key](https://console.anthropic.com)) |
| `ALIBABA_API_KEY` | No | Runs source labelling and related questions on Qwen, the cheapest option. Use a key from Alibaba Cloud Model Studio's International (Singapore) region. Without it, Claude Haiku does both. |

`.env.local` is git-ignored. Never commit real keys.

## How it works

```
question ──► rewrite follow-up into a standalone query (Claude)
         ──► Tavily search (8 results, with publish dates)
         ──► label sources: URL rules, then Qwen or Claude Haiku   ┐ in
         ──► Claude streams the cited answer                      ├ parallel
         ──► related questions: Qwen or Claude Haiku              ┘
```

### Models

| Task | Model |
|---|---|
| Cited answer | Claude Opus 5.5 |
| Follow-up rewrite | Claude Opus 5.5 |
| Source labels, related questions | Qwen `qwen3.7-flash-2026-07-15` when `ALIBABA_API_KEY` is set (thinking off, replies validated), otherwise Claude Haiku 5.5. If Qwen fails, Haiku takes over automatically. |

### Streaming API

`POST /api/search` returns newline-delimited JSON events: `query`, `sources`, `text`, `citation`, `labels`, `related`, `error` and `done`.

- **Citations.** Each search result is split into sentences and passed to Claude as a `search_result` content block with citations enabled. Claude returns `search_result_location` citations that point at exact sentences. These become the chips, the hover cards and the Check sources panel.
- **Selections.** The rendered answer contains invisible markers at each segment boundary, so a text selection maps back to the exact segments, and their citations, that it covers (`src/lib/selection.ts`).
- **Refusals.** The answer call enables Anthropic's server-side refusal fallback (`fallbacks: "default"`).

### Project structure

```
src/
  app/
    api/search/route.ts   streaming search + answer endpoint
    page.tsx              thread UI and stream handling
  components/             answer, citation chips, sources panel, selection toolbar, search box
  lib/
    claude.ts             query rewrite, cited answer, Haiku JSON helper
    tavily.ts             web search and sentence chunking
    cheap.ts              small JSON tasks: Qwen first, Claude Haiku fallback
    labels.ts             source labelling (via cheap.ts)
    related.ts            related questions (via cheap.ts)
    qwen.ts               Alibaba Qwen client (OpenAI-compatible endpoint)
    quality.ts            URL rules for source labels
    selection.ts          maps text selections to answer segments
    text.ts               Markdown assembly, text-fragment links, helpers
```

## Costs

Rough estimates per question, depending on answer length:

| Step | Cost |
|---|---|
| Tavily advanced search | 2 credits. The free tier is 1,000 credits/month (about 500 questions), then $0.008/credit. |
| Claude Opus 5.5 (answer and follow-up rewrite) | ≈ $0.04–0.07 |
| Source labels + related questions | ≈ $0.0001 with Qwen, ≈ $0.0005 with Claude Haiku |

Ways to lower cost: `search_depth: "basic"` in `src/lib/tavily.ts` (1 credit), a lower `effort` in `src/lib/claude.ts`, or a cheaper model for the follow-up rewrite.

## Deploying

`/api/search` has no authentication or rate limiting. If you deploy this publicly, anyone who finds the URL can spend your Tavily and Anthropic credits. Put it behind auth, or add rate limiting, before sharing a public URL.

## Limitations

- Threads live in browser memory and are lost on refresh.
- Source labels from the URL rules cover a fixed list of sites. Others depend on the labelling model.
- Text-fragment highlighting only works when the live page still contains the quoted wording.
