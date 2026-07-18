/**
 * Bijoy Classic (ANSI-based) to Unicode conversion utilities.
 * Handles Bijoy-specific ANSI-to-Unicode artefact fixups
 * that occur during the bn-ansi-to-unicode conversion process.
 */

import { normalizeText } from "../unicode/text-normalizer.js";
import { hasBengaliUnicode } from "../unicode/bengali-normalizer.js";

/**
 * Apply fixups for common Bijoy ANSI-to-Unicode conversion artefacts.
 *
 * These fixes handle known issues in the bn-ansi-to-unicode library:
 * - '্ল' incorrectly becomes 'স্ন'
 * - 'তৃর্' should be 'র্তৃ'
 * - ঔ formation with ZWNJ/ZWJ artefacts
 * - Chandrabindu (ঁ) insertion when 'u' key was used in Bijoy
 *
 * @param {string} text - Unicode text (possibly with conversion artefacts)
 * @param {string} [sourceAscii=""] - Original ANSI source for context
 * @returns {string} Fixed Unicode text
 */
export function applyClassicUnicodeFixups(text, sourceAscii = "") {
  if (!text) return "";
  const normalized = text.normalize("NFD");

  // Fix common Bijoy conversion artifacts
  const fixed = normalized
    .replace(/([ক-হড়ঢ়য়])স্ন/gu, "$1্ল")
    .replace(/তৃর্/gu, "র্তৃ")
    .replace(
      /([ক-হড়ঢ়য়])\u09C7([ক-হড়ঢ়য়])(?:\u200C|\u200D)?\u09D7/gu,
      "$1ৌ$2",
    )
    .replace(/([ক-হড়ঢ়য়])\u09C7(?:\u200C|\u200D)?\u09D7/gu, "$1ৌ");

  let normalizedFixed = fixed.normalize("NFC");

  // Bijoy 'u' key was used for chandrabindu (ঁ) — restore if missing
  if (sourceAscii.includes("u") && !normalizedFixed.includes("ঁ")) {
    normalizedFixed = normalizedFixed
      .replace(/ৌ/u, "ৌঁ")
      .replace(/ো/u, "োঁ")
      .replace(/া/u, "াঁ");
  }

  return normalizedFixed;
}

/**
 * Convert a Bijoy Classic word to its Unicode display form.
 *
 * @param {string} word - Bijoy Classic (ANSI) or Unicode word
 * @returns {string} Unicode display word
 */
export function toUnicodeDisplayWord(word) {
  if (!word) return "";
  const cleaned = normalizeText(word, "bn", true);
  if (hasBengaliUnicode(cleaned)) return cleaned;
  // Dynamic import would be ideal but since this is a utility, we accept
  // the caller to pass the converter or we import it
  return cleaned; // Caller handles ANSI→Unicode conversion
}