/**
 * Grapheme cluster splitting utilities.
 * Provides custom Bengali grapheme segmentation that correctly handles
 * conjuncts (যুক্তাক্ষর), reph (র-ফলা), and combining marks.
 *
 * Intl.Segmenter is used as a fallback for non-Bengali text.
 */

import { normalizeText } from "./text-normalizer.js";

/**
 * Check if a Unicode code point is a Bengali combining mark.
 * This includes vowel signs (কার), hasanta (হসন্ত), nukta (নুক্তা),
 * and the Zero-Width Joiner (ZWJ) used in conjunct formation.
 *
 * @param {number} codePoint - Unicode code point to check
 * @returns {boolean}
 */
export function isBengaliCombiningMark(codePoint) {
  return (
    (codePoint >= 0x09BC && codePoint <= 0x09CD) || // nukta, hasanta range
    codePoint === 0x09D7 ||                          // au length mark
    (codePoint >= 0x09BE && codePoint <= 0x09C4) || // vowel signs aa-ii
    (codePoint >= 0x09C7 && codePoint <= 0x09C8) || // vowel signs e, ai
    (codePoint >= 0x09CB && codePoint <= 0x09CC) || // vowel signs o, au
    (codePoint >= 0x09E2 && codePoint <= 0x09E3) || // vocalic length marks
    codePoint === 0x200D                            // ZWJ for conjuncts
  );
}

/**
 * Check if a Unicode code point is a Bengali consonant.
 * 
 * @param {number} codePoint - Unicode code point to check
 * @returns {boolean}
 */
function isBengaliConsonant(codePoint) {
  return (
    (codePoint >= 0x0995 && codePoint <= 0x09B9) || // ক to হ
    codePoint === 0x09CE || // খণ্ড ত
    (codePoint >= 0x09DC && codePoint <= 0x09DF) // ড়, ঢ়, য়
  );
}

/**
 * Custom Bengali grapheme cluster splitter.
 *
 * Groups a base character with all following combining marks into a single
 * grapheme cluster. This correctly handles:
 * - Reph (র-ফলা): e.g., "বর্তমান" → ["ব", "র্ত", "মা", "ন"]
 * - Other conjuncts: e.g., "স্কুল" → ["স্কু", "ল"]
 * - Vowel signs: e.g., "কা" → ["কা"]
 *
 * @param {string} text - Normalized Bengali text
 * @returns {string[]} Array of grapheme clusters
 */
export function splitBengaliGraphemes(text) {
  const graphemes = [];
  let i = 0;
  const len = text.length;
  const HASANTA = 0x09CD;
  const RA = 0x09B0; // র

  while (i < len) {
    let cluster = text[i];
    const baseCodePoint = text.codePointAt(i);
    i++;

    // Collect all following combining marks (vowel signs, hasanta, ZWJ, etc.)
    while (i < len && isBengaliCombiningMark(text.codePointAt(i))) {
      cluster += text[i];
      i++;
    }

    // Special handling for reph (র-ফলা):
    // If this cluster is "র্" (র + হসন্ত) and the next character is a consonant,
    // include that consonant in the cluster to form the reph.
    if (
      baseCodePoint === RA &&
      cluster.length === 2 &&
      cluster.codePointAt(1) === HASANTA &&
      i < len &&
      isBengaliConsonant(text.codePointAt(i))
    ) {
      // Include the following consonant
      cluster += text[i];
      i++;

      // Also collect any combining marks after that consonant
      while (i < len && isBengaliCombiningMark(text.codePointAt(i))) {
        cluster += text[i];
        i++;
      }
    }

    graphemes.push(cluster);
  }

  return graphemes;
}

/**
 * Split text into grapheme clusters.
 * Uses custom Bengali splitting for Bengali text to handle conjuncts correctly.
 * Falls back to Intl.Segmenter or Array.from for other languages.
 *
 * @param {string} text - Input text
 * @param {string} [locale] - Locale code (e.g., "bn", "en")
 * @param {boolean} [isClassic=false] - If true, skip Bengali-specific splitting
 * @returns {string[]} Array of grapheme clusters
 */
export function splitGraphemes(text, locale, isClassic = false) {
  const cleanText = normalizeText(text, locale, isClassic);

  // Use custom Bengali grapheme splitting for Bengali text (not classic mode)
  if ((locale === "bn" || /[\u0980-\u09FF]/.test(cleanText)) && !isClassic) {
    return splitBengaliGraphemes(cleanText);
  }

  // Fallback: use Intl.Segmenter if available
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(locale, { granularity: "grapheme" });
    return Array.from(segmenter.segment(cleanText), (x) => x.segment);
  }

  return Array.from(cleanText);
}