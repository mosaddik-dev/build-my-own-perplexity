// Maps a DOM selection inside a rendered answer to the answer segments it covers,
// using the invisible [data-seg] markers placed at the start of each segment.

const BLOCKS = "p, li, td, th, h1, h2, h3, h4, blockquote";

// Text of a range without citation chip labels, whitespace collapsed.
function rangeText(range: Range): string {
  const fragment = range.cloneContents();
  fragment.querySelectorAll(".citation-chip").forEach((el) => el.remove());
  return (fragment.textContent ?? "").replace(/\s+/g, " ").trim();
}

function closestBlock(node: Node): Element | null {
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return el?.closest(BLOCKS) ?? null;
}

export function analyzeSelection(range: Range, root: HTMLElement): { segments: number[]; claim: string } {
  const markers = [...root.querySelectorAll<HTMLElement>("[data-seg]")];
  let first = -1; // marker index of the segment the selection starts in
  let last = -1;
  markers.forEach((m, k) => {
    const pos = range.comparePoint(m, 0);
    if (pos < 0) first = k;
    if (pos <= 0) last = k;
  });
  if (last < 0) return { segments: [], claim: rangeText(range) };
  if (first < 0) first = 0;

  const segments = markers.slice(first, last + 1).map((m) => Number(m.dataset.seg));

  // Expand the selection to the full text of those segments (a double-clicked word
  // becomes its claim), clipped to the paragraph/cell/list item it sits in.
  const claim = document.createRange();
  claim.setStartBefore(markers[first]);
  if (markers[last + 1]) claim.setEndBefore(markers[last + 1]);
  else claim.setEnd(root, root.childNodes.length);

  const block = closestBlock(range.startContainer);
  if (block && block === closestBlock(range.endContainer)) {
    const blockRange = document.createRange();
    blockRange.selectNodeContents(block);
    if (claim.compareBoundaryPoints(Range.START_TO_START, blockRange) < 0) {
      claim.setStart(blockRange.startContainer, blockRange.startOffset);
    }
    if (claim.compareBoundaryPoints(Range.END_TO_END, blockRange) > 0) {
      claim.setEnd(blockRange.endContainer, blockRange.endOffset);
    }
  }

  return { segments, claim: rangeText(claim) || rangeText(range) };
}
