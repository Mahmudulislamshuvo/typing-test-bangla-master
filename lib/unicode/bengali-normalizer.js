/**
 * Bengali-specific Unicode normalization utilities.
 * Handles Unicode equivalences that NFC may miss,
 * and ensures consistent reph (র-ফলা) representation.
 */

import { normalizeText } from "./text-normalizer.js";

/**
 * Unicode mode: handle standard Unicode equivalences that NFC misses.
 * Do NOT apply Classic ANSI-conversion artefact fixes here — those belong
 * only in the Classic comparison path and would corrupt real Unicode input.
 *
 * Includes NFC re-normalization for consistent reph representation.
 *
 * @param {string} text - Bengali Unicode text
 * @returns {string} Normalized text safe for comparison
 */
export function normalizeUnicodeBengaliForComparison(text) {
  const normalized = normalizeText(text, "bn", false);
  if (!normalized) return "";
  let result = normalized
    .replace(/\u09AF\u09BC/g, "\u09DF") // য + ় → য়
    .replace(/\u09A1\u09BC/g, "\u09DC") // ড + ় → ড়
    .replace(/\u09A2\u09BC/g, "\u09DD"); // ঢ + ় → ঢ়

  // Normalize different reph representations consistently via NFC.
  // Reph: র + hasanta before consonant → displayed as reph above consonant.
  result = result.normalize("NFC");

  return result;
}

/**
 * Test if text contains Bengali Unicode characters.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function hasBengaliUnicode(text) {
  return /[\u0980-\u09FF]/.test(text || "");
}

/**
 * Bengali Unicode range regex for detection.
 */
export const BENGALI_UNICODE_RE = /[\u0980-\u09FF]/;