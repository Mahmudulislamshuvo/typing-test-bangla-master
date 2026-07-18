/**
 * General text normalization utilities.
 * Handles invisible character removal, punctuation normalization,
 * and Bengali-specific danda normalization.
 */

/**
 * Normalize text for display and comparison.
 *
 * Key: For Bengali text, ZWJ (\u200D) is PRESERVED because it's essential
 * for reph (র-ফলা) conjunct rendering. Other invisible chars are removed.
 *
 * @param {string} text - Raw input text
 * @param {string} [lang] - Language code (e.g., "bn", "en")
 * @param {boolean} [isClassic=false] - If true, skip typographic punctuation normalization
 * @returns {string} Normalized text
 */
export function normalizeText(text, lang, isClassic = false) {
  let normalized = (text || "").normalize("NFC");

  // Don't remove ZWJ (\u200D) for Bengali — it's needed for reph conjuncts
  if (lang === "bn" || /[\u0980-\u09FF]/.test(normalized)) {
    // Keep ZWJ (\u200D), remove other invisible chars
    normalized = normalized.replace(/[\u200B\u200C\uFEFF]/g, "");
  } else {
    normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, "");
  }

  // Normalize non-breaking spaces to regular spaces
  normalized = normalized.replace(/[\u00A0\u202F]/g, " ");

  // Classic mode: skip typographic punctuation normalization
  if (isClassic) return normalized;

  // Normalize typographic quotes and dashes to ASCII equivalents
  normalized = normalized.replace(/[\u2018\u2019\u201B\u2032]/g, "'");
  normalized = normalized.replace(/[\u201C\u201D\u2033]/g, '"');
  normalized = normalized.replace(/[\u2012\u2013\u2014\u2212]/g, "-");
  normalized = normalized.replace(/\u2026/g, "...");

  // Bengali: normalize various danda forms to standard Bengali danda
  if (lang === "bn" || /[\u0980-\u09FF]/.test(normalized)) {
    return normalized
      .replace(/\|/g, "\u0964")  // → ।
      .replace(/\\/g, "\u0964")  // → ।
      .replace(/\u0965/g, "\u0964"); // → ।
  }

  return normalized;
}