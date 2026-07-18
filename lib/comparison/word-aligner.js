/**
 * Word alignment using edit distance (Wagner-Fischer algorithm).
 * Produces optimal word-level alignment between typed and target text
 * with priority ordering: match > insert/delete > substitute.
 */

/**
 * Align typed words to target words using edit distance.
 * Returns an array of statuses ("correct" | "incorrect") for each typed word.
 *
 * @param {string[]} typedWords - Words the user typed
 * @param {string[]} targetWords - Words the user should have typed
 * @returns {string[]} Status for each typed word
 */
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