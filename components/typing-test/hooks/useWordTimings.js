"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { splitStrictWordsLocal } from "../utils/typing-display";

/**
 * Hook: per-word timing state and delta-time accumulation.
 * Used by normal mode only (disappearing mode has no word timings).
 */
export default function useWordTimings({ typedText, locale, isClassicMode }) {
  const [wordTimings, setWordTimings] = useState([]);
  const lastTypingTimeRef = useRef(null);
  const lastWordCountRef = useRef(0);

  const updateWordTimings = useCallback(
    (rawValue, isFinished, isLoadingSource, loadError) => {
      if (isFinished || isLoadingSource || loadError) return;

      const value = rawValue.trimStart();
      const now = performance.now();

      let timeDelta = 0;
      if (lastTypingTimeRef.current !== null) {
        timeDelta = now - lastTypingTimeRef.current;
      }
      lastTypingTimeRef.current = now;

      const wordsNow = splitStrictWordsLocal(value, locale, true, isClassicMode);
      const targetLength = value === "" ? 0 : wordsNow.length;
      const currentIndex = targetLength > 0 ? targetLength - 1 : 0;

      setWordTimings((prev) => {
        // Deep Copy: safe copy (fixes double-count bug)
        let next = prev.map((item) => ({ ...item }));

        while (next.length < targetLength) {
          next.push({
            word: "",
            durationMs: 0,
          });
        }

        for (let i = 0; i < wordsNow.length; i++) {
          if (next[i]) {
            next[i].word = wordsNow[i];
          }
        }

        // Add delta time to the active word
        if (targetLength > 0 && next[currentIndex]) {
          next[currentIndex].durationMs += timeDelta;
        }

        // Backspace handling: zero out data for erased words
        const startResetIndex = targetLength === 0 ? 0 : currentIndex + 1;
        for (let i = startResetIndex; i < next.length; i++) {
          if (next[i]) {
            next[i].word = "";
            next[i].durationMs = 0;
          }
        }

        return next;
      });
    },
    [isClassicMode, locale],
  );

  const resetWordTimings = useCallback(() => {
    setWordTimings([]);
    lastWordCountRef.current = 0;
    lastTypingTimeRef.current = null;
  }, []);

  return {
    wordTimings,
    setWordTimings,
    updateWordTimings,
    resetWordTimings,
    lastTypingTimeRef,
  };
}