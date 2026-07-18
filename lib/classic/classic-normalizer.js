/**
 * Classic mode (Bijoy) text normalization utilities.
 * Builds on Unicode normalization to add Bijoy-specific comparison rules.
 */

import { normalizeUnicodeBengaliForComparison } from "../unicode/bengali-normalizer.js";

const TRAILING_PUNCT_RE = /^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu;

/**
 * Classic mode: apply all ANSI-to-Unicode conversion artefact fixes ON TOP
 * of the base Unicode equivalences. These rules are intentionally NOT applied
 * to real Unicode input because they would create false matches (e.g.
 * treating ং and ঁ as equal even though they are distinct phonemes).
 *
 * @param {string} text - Text to normalize (may contain conversion artefacts)
 * @returns {string} Normalized text safe for Classic mode comparison
 */
export function normalizeClassicBengaliForComparison(text) {
  const base = normalizeUnicodeBengaliForComparison(text);
  if (!base) return "";
  return base
    .replace(/\u0982/g, "\u0981") // ং → ঁ  (ANSI conversion artefact)
    .replace(/\u09CE/g, "\u09A4\u09CD"); // ৎ → ত্ (ANSI conversion artefact)
}

/**
 * Normalize a Classic mode word key for comparison.
 * Strips trailing punctuation after applying Classic normalization.
 *
 * @param {string} word
 * @returns {string}
 */
export function normalizeClassicWordKey(word) {
  const normalized = normalizeClassicBengaliForComparison(word);
  return normalized.replace(TRAILING_PUNCT_RE, "");
}