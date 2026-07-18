/**
 * Word comparison and report building utilities.
 * Provides positional comparison, word report generation,
 * and target text slicing for the typing test display.
 */

/**
 * Compare words positionally (no alignment).
 * Simple one-to-one comparison: typed word at index N vs target word at index N.
 *
 * @param {string[]} typedWords
 * @param {string[]} targetWords
 * @returns {string[]}
 */
export function compareWordsPositional(typedWords, targetWords) {
  return typedWords.map((word, index) =>
    word === targetWords[index] ? "correct" : "incorrect",
  );
}

/**
 * Build a word-level report from typed text and word statuses.
 * Each token gets a key, text, and status ("correct" | "incorrect" | "space").
 *
 * @param {string} typedText - The full text the user typed
 * @param {string[]} wordStatuses - Status for each non-space word
 * @returns {{key: string, text: string, status: string}[]}
 */
export function buildWordReport(typedText, wordStatuses) {
  const typedTokens = typedText.match(/\s+|[^\s]+/gu) || [];
  let wordIndex = 0;

  return typedTokens.map((token, index) => {
    if (/^\s+$/u.test(token)) {
      return { key: `space-${index}`, text: token, status: "space" };
    }

    const status = wordStatuses[wordIndex] || "incorrect";
    wordIndex += 1;

    return {
      key: `word-${index}`,
      text: token,
      status,
    };
  });
}

/**
 * Get a slice of target words for display, with a buffer of upcoming words.
 *
 * @param {string[]} targetWords
 * @param {number} typedWordCount
 * @param {boolean} isFinal
 * @returns {string[]}
 */
export function getTargetSlice(targetWords, typedWordCount, isFinal) {
  const buffer = isFinal ? 120 : 60;
  const length = Math.max(120, typedWordCount + buffer);
  return targetWords.slice(0, length);
}