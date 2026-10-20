"use client";

import { useEffect, useState } from "react";
import { analyzeSelection } from "@/lib/selection";

export type AnswerSelection = { text: string; turn: number; segments: number[]; claim: string };

type Selected = AnswerSelection & { top: number; left: number };

// Floating "Add to follow-up / Check sources" bar for text selected inside an answer.
export function SelectionToolbar({
  onFollowUp,
  onCheckSources,
}: {
  onFollowUp: (text: string) => void;
  onCheckSources: (selection: AnswerSelection) => void;
}) {
  const [selected, setSelected] = useState<Selected | null>(null);

  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("[data-selection-toolbar]")) return;
      // Wait a tick so a double-click's selection is in place.
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (!sel || !text || sel.rangeCount === 0) return setSelected(null);
        const node = sel.getRangeAt(0).commonAncestorContainer;
        const el = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as HTMLElement;
        const answer = el?.closest<HTMLElement>("[data-answer-turn]");
        if (!answer) return setSelected(null);
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelected({
          text,
          turn: Number(answer.dataset.answerTurn),
          ...analyzeSelection(range, answer),
          top: rect.top - 8,
          left: rect.left + rect.width / 2,
        });
      }, 0);
    };
    const clear = () => setSelected(null);
    document.addEventListener("mouseup", onMouseUp);
    window.addEventListener("scroll", clear, true);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("scroll", clear, true);
    };
  }, []);

  if (!selected) return null;

  const act = (fn: () => void) => () => {
    fn();
    window.getSelection()?.removeAllRanges();
    setSelected(null);
  };

  return (
    <div
      data-selection-toolbar
      style={{ top: selected.top, left: selected.left }}
      className="fixed z-40 flex -translate-x-1/2 -translate-y-full overflow-hidden rounded-xl border border-line bg-surface text-sm shadow-lg"
    >
      <button onClick={act(() => onFollowUp(selected.text))} className="px-3 py-2 hover:bg-surface-hover">
        Add to follow-up
      </button>
      <div className="w-px bg-line" />
      <button
        onClick={act(() => onCheckSources(selected))}
        className="px-3 py-2 hover:bg-surface-hover"
      >
        Check sources
      </button>
    </div>
  );
}
