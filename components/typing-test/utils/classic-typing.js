/**
 * Classic-mode typing helpers.
 * Kept separate so Classic behavior never leaks into standard Unicode paths.
 */
import { normalizeText } from "@/lib/unicode/text-normalizer";
import { hasBengaliUnicode } from "@/lib/unicode/bengali-normalizer";
import { applyClassicUnicodeFixups } from "@/lib/classic/bijoy-converter";
import {
  normalizeClassicWordKey,
} from "@/lib/classic/classic-normalizer";
import bnAnsiToUnicode from "bn-ansi-to-unicode";
import { splitStrictWordsLocal } from "./typing-display";

export function toClassicComparableWord(word) {
  if (!word) return "";
  const cleaned = normalizeText(word, "bn", true);
  const unicodeWord = hasBengaliUnicode(cleaned)
    ? cleaned
    : bnAnsiToUnicode(cleaned);
  const fixedUnicode = applyClassicUnicodeFixups(unicodeWord, cleaned);
  return normalizeClassicWordKey(fixedUnicode);
}

export function toUnicodeDisplayWord(word) {
  if (!word) return "";
  const cleaned = normalizeText(word, "bn", true);
  if (hasBengaliUnicode(cleaned)) return cleaned;
  return applyClassicUnicodeFixups(bnAnsiToUnicode(cleaned), cleaned);
}

export function splitClassicComparableWords(text, includeTrailingPartial = false) {
  const sourceWords = splitStrictWordsLocal(
    text,
    "bn",
    includeTrailingPartial,
    true,
  );
  if (!sourceWords.length) return [];
  return sourceWords.map(toClassicComparableWord);
}

export { splitStrictWordsLocal, buildCustomWords, buildPassageCharStates, getWordStartIndex } from "./typing-display";