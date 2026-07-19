"use client";

import { useCallback, useMemo, useRef } from "react";
import { splitGraphemes } from "@/lib/unicode/grapheme-splitter";
import {
  normalizeUnicodeBengaliForComparison,
} from "@/lib/unicode/bengali-normalizer";
import { alignStrictWords } from "@/lib/comparison/word-aligner";
import {
  compareWordsPositional,
  buildWordReport,
  getTargetSlice,
} from "@/lib/comparison/word-comparator";
import { splitStrictWordsLocal } from "../utils/typing-display";
import {
  toClassicComparableWord,
  splitClassicComparableWords,
} from "../utils/classic-typing";

/**
 * Hook: all typing evaluation metrics (WPM, accuracy, word stats, reports).
 * Byte-for-byte equivalent in outcome to the original inline calculations.
 */
export default function useTypingMetrics({
  typedText,
  targetWords,
  isFinished,
  isBangla,
  isClassicMode,
  isCustomSource,
  locale,
}) {
  const targetText = useMemo(() => targetWords.join(" "), [targetWords]);

  const targetChars = useMemo(
    () => splitGraphemes(targetText, locale, isClassicMode),
    [isClassicMode, locale, targetText],
  );
  const typedChars = useMemo(
    () => splitGraphemes(typedText, locale, isClassicMode),
    [isClassicMode, locale, typedText],
  );

  const liveTypedWords = useMemo(
    () => splitStrictWordsLocal(typedText, locale, false, isClassicMode),
    [isClassicMode, locale, typedText],
  );
  const finalTypedWords = useMemo(
    () => splitStrictWordsLocal(typedText, locale, true, isClassicMode),
    [isClassicMode, locale, typedText],
  );

  const liveClassicComparableWords = useMemo(() => {
    if (!isClassicMode) return [];
    return splitClassicComparableWords(typedText, false);
  }, [isClassicMode, typedText]);

  const finalClassicComparableWords = useMemo(() => {
    if (!isClassicMode) return [];
    return splitClassicComparableWords(typedText, true);
  }, [isClassicMode, typedText]);

  const comparisonTargetWords = useMemo(() => {
    if (!isClassicMode) return targetWords;
    return targetWords.map(toClassicComparableWord);
  }, [isClassicMode, targetWords]);

  const normalizedBanglaTargetWords = useMemo(() => {
    if (!isBangla || isClassicMode) return comparisonTargetWords;
    return comparisonTargetWords.map(normalizeUnicodeBengaliForComparison);
  }, [comparisonTargetWords, isBangla, isClassicMode]);

  const effectiveTargetWords = targetWords;

  const activeWordIndex = liveTypedWords.length;

  const progress = useMemo(() => {
    let typedKeystrokes = 0;
    let typedKeystrokesWithSpaces = 0;
    let correctKeystrokes = 0;
    let correctStrokes = 0;
    let correctStrokesWithSpaces = 0;

    for (let i = 0; i < typedChars.length; i += 1) {
      const typedChar = typedChars[i];
      const isSpace = /\s/u.test(typedChar);

      typedKeystrokesWithSpaces += typedChar.length;

      if (!isSpace) {
        typedKeystrokes += typedChar.length;
      }

      if (i < targetChars.length && typedChar === targetChars[i]) {
        correctStrokesWithSpaces += typedChar.length;
        if (!isSpace) {
          correctKeystrokes += typedChar.length;
          correctStrokes += typedChar.length;
        }
      }
    }

    return {
      typedKeystrokes,
      typedKeystrokesWithSpaces,
      correctKeystrokes,
      correctStrokes,
      correctStrokesWithSpaces,
    };
  }, [typedChars, targetChars]);

  const evaluateWords = useCallback(
    (typedWords, includeTrailing) => {
      const targetSlice = getTargetSlice(
        normalizedBanglaTargetWords,
        typedWords.length,
        includeTrailing,
      );
      const comparisonTypedWords = isClassicMode
        ? (includeTrailing
            ? finalClassicComparableWords
            : liveClassicComparableWords)
        : isBangla
          ? typedWords.map(normalizeUnicodeBengaliForComparison)
          : typedWords;
      const wordStatuses = isCustomSource
        ? compareWordsPositional(comparisonTypedWords, targetSlice)
        : alignStrictWords(comparisonTypedWords, targetSlice);
      const correctWords = wordStatuses.filter(
        (status) => status === "correct",
      ).length;
      const incorrectWords = wordStatuses.length - correctWords;
      const correctStrokes = typedWords.reduce((acc, word, idx) => {
        if (wordStatuses[idx] === "correct") {
          return acc + word.length;
        }
        return acc;
      }, 0);
      return { correctWords, incorrectWords, wordStatuses, correctStrokes };
    },
    [
      finalClassicComparableWords,
      isBangla,
      isClassicMode,
      isCustomSource,
      liveClassicComparableWords,
      normalizedBanglaTargetWords,
    ],
  );

  const liveWordEvaluation = useMemo(
    () => evaluateWords(liveTypedWords, false),
    [evaluateWords, liveTypedWords],
  );

  const finalWordEvaluation = useMemo(
    () => evaluateWords(finalTypedWords, true),
    [evaluateWords, finalTypedWords],
  );

  const wordStats = isFinished ? finalWordEvaluation : liveWordEvaluation;

  const typedWordReport = useMemo(
    () => buildWordReport(typedText, finalWordEvaluation.wordStatuses),
    [typedText, finalWordEvaluation.wordStatuses],
  );

  return {
    targetChars,
    typedChars,
    targetText,
    liveTypedWords,
    finalTypedWords,
    liveWordEvaluation,
    finalWordEvaluation,
    wordStats,
    progress,
    typedWordReport,
    effectiveTargetWords,
    activeWordIndex,
  };
}