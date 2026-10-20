"use client";

import { useEffect, useRef, useState } from "react";

export function SearchBox({
  onSubmit,
  disabled,
  placeholder,
  autoFocus,
  quote,
  onClearQuote,
  sourcesOnly,
  onSourcesOnlyChange,
}: {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  placeholder: string;
  autoFocus?: boolean;
  quote?: string;
  onClearQuote?: () => void;
  sourcesOnly: boolean;
  onSourcesOnlyChange: (value: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (quote) inputRef.current?.focus();
  }, [quote]);

  const submit = () => {
    const q = value.trim();
    if (!q || disabled) return;
    onSubmit(q);
    setValue("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="rounded-2xl border border-line bg-surface p-2 shadow-sm focus-within:border-accent"
    >
      {quote && (
        <div className="mx-1 mb-1 flex items-start gap-2 rounded-lg bg-background px-3 py-2 text-sm text-muted">
          <span className="line-clamp-2 flex-1 border-l-2 border-accent pl-2">{quote}</span>
          <button type="button" onClick={onClearQuote} aria-label="Remove quote" className="hover:text-foreground">
            ×
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted [field-sizing:content]"
        />
        <button
          type="button"
          onClick={() => onSourcesOnlyChange(!sourcesOnly)}
          aria-pressed={sourcesOnly}
          title="Answer only from search results, with no AI background knowledge or opinions"
          className={`mb-1 flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors ${
            sourcesOnly
              ? "border-accent bg-accent/15 text-accent"
              : "border-line text-muted hover:bg-surface-hover hover:text-foreground"
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
          </svg>
          Sources only
        </button>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Search"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-opacity disabled:opacity-40"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </form>
  );
}
