export function normalizeText(text, lang) {
  let normalized = (text || "").normalize("NFC");
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, "");
  // Normalize various danda forms to standard Bengali danda if likely Bengali
  if (lang === "bn" || /[\u0980-\u09FF]/.test(normalized)) {
    return normalized
      .replace(/\|/g, "।")
      .replace(/\\/g, "।")
      .replace(/\u0965/g, "।");
  }
  return normalized;
}

export function splitGraphemes(text, locale) {
  const cleanText = normalizeText(text, locale);
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(locale, { granularity: "grapheme" });
    return Array.from(segmenter.segment(cleanText), (x) => x.segment);
  }
  return Array.from(cleanText);
}

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

export function alignStrictWords(typedWords, targetWords) {
  const rowCount = typedWords.length + 1;
  const colCount = targetWords.length + 1;

  const dp = Array.from({ length: rowCount }, () => Array(colCount).fill(0));
  const backtrack = Array.from({ length: rowCount }, () =>
    Array(colCount).fill(null),
  );

  for (let i = 1; i < rowCount; i += 1) {
    dp[i][0] = i;
    backtrack[i][0] = "insert";
  }

  for (let j = 1; j < colCount; j += 1) {
    dp[0][j] = j;
    backtrack[0][j] = "delete";
  }

  const priority = {
    match: 1,
    insert: 2,
    delete: 2,
    substitute: 3,
  };

  for (let i = 1; i < rowCount; i += 1) {
    for (let j = 1; j < colCount; j += 1) {
      const isExactMatch = typedWords[i - 1] === targetWords[j - 1];
      const diagonalAction = isExactMatch ? "match" : "substitute";

      const candidates = [
        {
          action: diagonalAction,
          cost: dp[i - 1][j - 1] + (isExactMatch ? 0 : 1),
        },
        { action: "insert", cost: dp[i - 1][j] + 1 },
        { action: "delete", cost: dp[i][j - 1] + 1 },
      ];

      candidates.sort((a, b) => {
        if (a.cost !== b.cost) {
          return a.cost - b.cost;
        }
        return priority[a.action] - priority[b.action];
      });

      dp[i][j] = candidates[0].cost;
      backtrack[i][j] = candidates[0].action;
    }
  }

  const wordStatuses = Array(typedWords.length).fill("incorrect");

  let i = typedWords.length;
  let j = targetWords.length;

  while (i > 0 || j > 0) {
    const action = backtrack[i][j];

    if ((action === "match" || action === "substitute") && i > 0 && j > 0) {
      wordStatuses[i - 1] = action === "match" ? "correct" : "incorrect";
      i -= 1;
      j -= 1;
      continue;
    }

    if (action === "insert" && i > 0) {
      wordStatuses[i - 1] = "incorrect";
      i -= 1;
      continue;
    }

    if (action === "delete" && j > 0) {
      j -= 1;
      continue;
    }

    if (i > 0) {
      wordStatuses[i - 1] = "incorrect";
      i -= 1;
    } else {
      j -= 1;
    }
  }

  return wordStatuses;
}

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

export function getTargetSlice(targetWords, typedWordCount, isFinal) {
  const buffer = isFinal ? 120 : 60;
  const length = Math.max(120, typedWordCount + buffer);
  return targetWords.slice(0, length);
}
