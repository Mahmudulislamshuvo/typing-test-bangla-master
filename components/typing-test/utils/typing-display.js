/**
 * Pure formatting and display helpers for the typing test.
 * No state, no side effects — just functions that take data in and return data out.
 */
import { normalizeText } from "@/lib/unicode/text-normalizer";
import { splitGraphemes } from "@/lib/unicode/grapheme-splitter";

/**
 * Split text into strict words for comparison.
 * Handles the "trailing partial word" logic for typing tests.
 *
 * @param {string} text
 * @param {string} [lang]
 * @param {boolean} [includeTrailingPartial=false]
 * @param {boolean} [isClassic=false]
 * @returns {string[]}
 */
export function splitStrictWordsLocal(
  text,
  lang,
  includeTrailingPartial = false,
  isClassic = false,
) {
  if (typeof lang === "boolean") {
    includeTrailingPartial = lang;
    lang = undefined;
  }

  const normalized = normalizeText(text, lang, isClassic).replace(/\n/g, " ");
  if (!normalized.trim()) return [];

  const words = (normalized.match(/\S+/gu) || []).slice();
  const hasTrailingWhitespace = /\s$/u.test(normalized);

  if (!includeTrailingPartial && !hasTrailingWhitespace && words.length > 0) {
    words.pop();
  }

  return words;
}

export function getWordStartIndex(targetWords, wordIndex, locale, isClassic = false) {
  let index = 0;
  const maxIndex = Math.max(0, Math.min(wordIndex, targetWords.length));

  for (let i = 0; i < maxIndex; i += 1) {
    index += splitGraphemes(targetWords[i], locale, isClassic).length + 1;
  }

  return index;
}

export function buildPassageCharStates(
  targetWords,
  typedWords,
  locale,
  isClassic = false,
) {
  const states = [];
  let cursor = 0;

  for (let i = 0; i < targetWords.length; i += 1) {
    const targetWord = targetWords[i] || "";
    const typedWord = typedWords[i] || "";
    const targetChars = splitGraphemes(targetWord, locale, isClassic);
    const typedChars = splitGraphemes(typedWord, locale, isClassic);

    for (let j = 0; j < targetChars.length; j += 1) {
      if (typedChars.length > j) {
        states[cursor + j] =
          typedChars[j] === targetChars[j] ? "correct" : "incorrect";
      } else {
        states[cursor + j] = "pending";
      }
    }

    cursor += targetChars.length;

    if (i < targetWords.length - 1) {
      states[cursor] = "space";
      cursor += 1;
    }
  }

  return states;
}

export function buildCustomWords(text, lang, isClassic = false) {
  const normalized = normalizeText(text, lang, isClassic).replace(/\n/g, " ");
  const words = (normalized.match(/\S+/gu) || []).map((word) => word.trim());
  return words.filter(Boolean);
}