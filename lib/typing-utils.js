/**
 * Central re-export module for typing test utilities.
 * All functions are now organized into sub-modules:
 *
 * - lib/unicode/text-normalizer.js   → normalizeText
 * - lib/unicode/grapheme-splitter.js → splitGraphemes, splitBengaliGraphemes, isBengaliCombiningMark
 * - lib/unicode/bengali-normalizer.js → normalizeUnicodeBengaliForComparison, hasBengaliUnicode
 * - lib/classic/bijoy-converter.js   → applyClassicUnicodeFixups
 * - lib/classic/classic-normalizer.js → normalizeClassicBengaliForComparison, normalizeClassicWordKey
 * - lib/comparison/word-aligner.js   → alignStrictWords
 * - lib/comparison/word-comparator.js → compareWordsPositional, buildWordReport, getTargetSlice
 */

// Unicode utilities
export { normalizeText } from "./unicode/text-normalizer.js";
export {
  splitGraphemes,
  splitBengaliGraphemes,
  isBengaliCombiningMark,
} from "./unicode/grapheme-splitter.js";
export {
  normalizeUnicodeBengaliForComparison,
  hasBengaliUnicode,
  BENGALI_UNICODE_RE,
} from "./unicode/bengali-normalizer.js";

// Classic (Bijoy) utilities
export { applyClassicUnicodeFixups } from "./classic/bijoy-converter.js";
export {
  normalizeClassicBengaliForComparison,
  normalizeClassicWordKey,
} from "./classic/classic-normalizer.js";

// Comparison utilities
export { alignStrictWords } from "./comparison/word-aligner.js";
export {
  compareWordsPositional,
  buildWordReport,
  getTargetSlice,
} from "./comparison/word-comparator.js";

// Word splitting (kept here as it depends on normalizeText)
import { normalizeText } from "./unicode/text-normalizer.js";

/**
 * Split text into strict words for comparison.
 * Handles the "trailing partial word" logic for typing tests.
 *
 * @param {string} text - Input text
 * @param {string|boolean} lang - Language code, or boolean (legacy API)
 * @param {boolean} [includeTrailingPartial=false] - Include the last word even without trailing space
 * @returns {string[]}
 */
export function splitStrictWords(text, lang, includeTrailingPartial = false) {
  if (typeof lang === "boolean") {
    includeTrailingPartial = lang;
    lang = undefined;
  }

  const normalized = normalizeText(text, lang).replace(/\n/g, " ");
  if (!normalized.trim()) return [];

  const words = (normalized.match(/\S+/gu) || []).slice();
  const hasTrailingWhitespace = /\s$/u.test(normalized);

  if (!includeTrailingPartial && !hasTrailingWhitespace && words.length > 0) {
    words.pop();
  }

  return words;
}