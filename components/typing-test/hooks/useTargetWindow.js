"use client";

import { useMemo } from "react";

/**
 * Hook: compute passage and ticker word windows for display.
 * Word-based (not char-based) to preserve Bengali OpenType shaping.
 */
export default function useTargetWindow({
  effectiveTargetWords,
  activeWordIndex,
  liveWordEvaluation,
  suppressTargetHighlights,
}) {
  const passageWordWindow = useMemo(() => {
    const BACK_WORDS = 15;
    const FWD_WORDS = 40;
    const start = Math.max(0, activeWordIndex - BACK_WORDS);
    const end = Math.min(
      effectiveTargetWords.length,
      activeWordIndex + FWD_WORDS,
    );
    const wordStatuses = suppressTargetHighlights
      ? null
      : liveWordEvaluation.wordStatuses;
    const words = effectiveTargetWords.slice(start, end).map((word, i) => ({
      word,
      globalIndex: start + i,
      status: wordStatuses ? (wordStatuses[start + i] ?? "pending") : "pending",
    }));
    return { start, words };
  }, [
    activeWordIndex,
    effectiveTargetWords,
    liveWordEvaluation.wordStatuses,
    suppressTargetHighlights,
  ]);

  const tickerWindow = useMemo(() => {
    const start = Math.max(0, activeWordIndex - 8);
    const end = Math.min(effectiveTargetWords.length, activeWordIndex + 36);
    return {
      start,
      end,
      words: effectiveTargetWords.slice(start, end),
    };
  }, [activeWordIndex, effectiveTargetWords]);

  return { passageWordWindow, tickerWindow };
}