"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DURATION_OPTIONS = [1, 5, 10, 15, 20];
const DISPLAY_MODES = [
  { value: "passage", label: "Passage Mode" },
  { value: "ticker", label: "Scrolling Mode" },
];
const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "bn", label: "বাংলা" },
];

function normalizeText(text, lang) {
  let normalized = (text || "").normalize("NFC");
  // Normalize various danda forms to standard Bengali danda if likely Bengali
  if (lang === "bn" || /[\u0980-\u09FF]/.test(normalized)) {
    return normalized
      .replace(/\|/g, "।")
      .replace(/\\/g, "।")
      .replace(/\u0965/g, "।");
  }
  return normalized;
}

function splitGraphemes(text, locale) {
  const cleanText = normalizeText(text, locale);
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(locale, { granularity: "grapheme" });
    return Array.from(segmenter.segment(cleanText), (x) => x.segment);
  }
  return Array.from(cleanText);
}

function splitStrictWords(text, lang, includeTrailingPartial = false) {
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

function alignStrictWords(typedWords, targetWords) {
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

function buildWordReport(typedText, wordStatuses) {
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

function getTargetSlice(targetWords, typedWordCount, isFinal) {
  const buffer = isFinal ? 120 : 60;
  const length = Math.max(120, typedWordCount + buffer);
  return targetWords.slice(0, length);
}

export default function TypingTestClient({
  initialLanguage,
  initialDuration,
  initialWords,
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const [durationMin, setDurationMin] = useState(initialDuration);
  const [displayMode, setDisplayMode] = useState("passage");
  const [typedText, setTypedText] = useState("");
  const [targetWords, setTargetWords] = useState(initialWords || []);
  const [timeLeft, setTimeLeft] = useState(initialDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoadingSource, setIsLoadingSource] = useState(!initialWords?.length);
  const [loadError, setLoadError] = useState("");

  const isFetchingMoreRef = useRef(false);
  const skipInitialSelectionReloadRef = useRef(true);

  const locale = language === "bn" ? "bn" : "en";
  const totalSeconds = durationMin * 60;

  const targetText = useMemo(() => targetWords.join(" "), [targetWords]);
  const targetChars = useMemo(
    () => splitGraphemes(targetText, locale),
    [targetText, locale],
  );
  const typedChars = useMemo(
    () => splitGraphemes(typedText, locale),
    [typedText, locale],
  );

  const liveTypedWords = useMemo(
    () => splitStrictWords(typedText, locale, false),
    [typedText, locale],
  );
  const finalTypedWords = useMemo(
    () => splitStrictWords(typedText, locale, true),
    [typedText, locale],
  );

  const activeWordIndex = liveTypedWords.length;

  const progress = useMemo(() => {
    let typedKeystrokes = 0;
    let correctKeystrokes = 0;
    let correctStrokes = 0;

    for (let i = 0; i < typedChars.length; i += 1) {
      const typedChar = typedChars[i];
      const isSpace = /\s/u.test(typedChar);

      if (!isSpace) {
        typedKeystrokes += 1;
      }

      if (i < targetChars.length && typedChar === targetChars[i] && !isSpace) {
        correctKeystrokes += 1;
        correctStrokes += typedChar.length;
      }
    }

    return { typedKeystrokes, correctKeystrokes, correctStrokes };
  }, [typedChars, targetChars]);

  const liveWordEvaluation = useMemo(() => {
    const targetSlice = getTargetSlice(
      targetWords,
      liveTypedWords.length,
      false,
    );
    const wordStatuses = alignStrictWords(liveTypedWords, targetSlice);
    const correctWords = wordStatuses.filter(
      (status) => status === "correct",
    ).length;
    const incorrectWords = wordStatuses.length - correctWords;
    return { correctWords, incorrectWords, wordStatuses };
  }, [liveTypedWords, targetWords]);

  const finalWordEvaluation = useMemo(() => {
    const targetSlice = getTargetSlice(
      targetWords,
      finalTypedWords.length,
      true,
    );
    const wordStatuses = alignStrictWords(finalTypedWords, targetSlice);
    const correctWords = wordStatuses.filter(
      (status) => status === "correct",
    ).length;
    const incorrectWords = wordStatuses.length - correctWords;
    const correctStrokes = finalTypedWords.reduce((acc, word, idx) => {
      if (wordStatuses[idx] === "correct") {
        return acc + word.length;
      }
      return acc;
    }, 0);

    return { correctWords, incorrectWords, wordStatuses, correctStrokes };
  }, [finalTypedWords, targetWords]);

  const wordStats = isFinished ? finalWordEvaluation : liveWordEvaluation;

  const typedWordReport = useMemo(
    () => buildWordReport(typedText, finalWordEvaluation.wordStatuses),
    [typedText, finalWordEvaluation.wordStatuses],
  );

  const elapsedSeconds = totalSeconds - timeLeft;
  const standardWordsTyped = progress.typedKeystrokes / 5;
  const wpm =
    elapsedSeconds > 0
      ? Math.round(standardWordsTyped / (elapsedSeconds / 60))
      : 0;
  const accuracy =
    progress.typedKeystrokes > 0
      ? Number(
          (
            (progress.correctKeystrokes / progress.typedKeystrokes) *
            100
          ).toFixed(1),
        )
      : 100;

  const timeLabel = `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(
    timeLeft % 60,
  ).padStart(2, "0")}`;

  const currentCharIndex = Math.min(
    typedChars.length,
    Math.max(targetChars.length - 1, 0),
  );

  const passageWindow = useMemo(() => {
    const start = Math.max(0, currentCharIndex - 220);
    const end = Math.min(targetChars.length, currentCharIndex + 320);
    return { start, chars: targetChars.slice(start, end) };
  }, [currentCharIndex, targetChars]);

  const tickerOffsets = useMemo(() => {
    const offsets = [0];
    for (let i = 0; i < targetWords.length; i += 1) {
      offsets.push(offsets[i] + targetWords[i].length + 1);
    }
    return offsets;
  }, [targetWords]);

  const tickerWindow = useMemo(() => {
    const start = Math.max(0, activeWordIndex - 8);
    const end = Math.min(targetWords.length, activeWordIndex + 36);
    return {
      start,
      end,
      words: targetWords.slice(start, end),
    };
  }, [activeWordIndex, targetWords]);

  const tickerShiftCh = useMemo(() => {
    if (!tickerOffsets.length) return 0;
    const globalActive = Math.min(activeWordIndex, targetWords.length);
    const base = tickerOffsets[tickerWindow.start] || 0;
    const active = tickerOffsets[globalActive] || 0;
    return Math.max(0, active - base);
  }, [activeWordIndex, targetWords.length, tickerOffsets, tickerWindow.start]);

  const fetchWordChunk = useCallback(async (lang, minutes, count = 160) => {
    const params = new URLSearchParams({
      lang,
      duration: String(minutes),
      count: String(count),
    });

    const response = await fetch(`/api/typing-source?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to load typing source.");
    }

    const payload = await response.json();
    const words = Array.isArray(payload?.words)
      ? payload.words
          .filter((word) => typeof word === "string" && word.trim())
          .map((word) => normalizeText(word, lang))
      : [];

    if (!words.length) {
      throw new Error("Typing source is empty.");
    }

    return words;
  }, []);

  const replaceSource = useCallback(
    async (lang = language, minutes = durationMin) => {
      setIsLoadingSource(true);
      setLoadError("");
      setTypedText("");
      setIsRunning(false);
      setIsFinished(false);
      setTimeLeft(minutes * 60);

      try {
        const words = await fetchWordChunk(lang, minutes, 220);
        setTargetWords(words);
      } catch (error) {
        setTargetWords([]);
        setLoadError(error?.message || "Unable to load typing source.");
      } finally {
        setIsLoadingSource(false);
      }
    },
    [durationMin, fetchWordChunk, language],
  );

  const appendMoreWords = useCallback(
    async (lang, minutes) => {
      if (isFetchingMoreRef.current) return;
      isFetchingMoreRef.current = true;

      try {
        const words = await fetchWordChunk(lang, minutes, 180);
        setTargetWords((prev) => [...prev, ...words]);
      } catch {
        // Keep the current stream alive even if a background top-up fails once.
      } finally {
        isFetchingMoreRef.current = false;
      }
    },
    [fetchWordChunk],
  );

  useEffect(() => {
    if (skipInitialSelectionReloadRef.current) {
      skipInitialSelectionReloadRef.current = false;
      return;
    }
    replaceSource(language, durationMin);
  }, [durationMin, language, replaceSource]);

  useEffect(() => {
    if (targetWords.length) return;
    replaceSource(language, durationMin);
  }, [durationMin, language, replaceSource, targetWords.length]);

  useEffect(() => {
    if (isLoadingSource || isFinished || loadError) return;
    const remainingWords = targetWords.length - liveTypedWords.length;
    if (remainingWords < 80) {
      appendMoreWords(language, durationMin);
    }
  }, [
    appendMoreWords,
    durationMin,
    isFinished,
    isLoadingSource,
    language,
    loadError,
    liveTypedWords.length,
    targetWords.length,
  ]);

  useEffect(() => {
    if (!isRunning || isFinished) return undefined;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRunning(false);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinished, isRunning]);

  function handleTypingChange(event) {
    if (isFinished || isLoadingSource || loadError) return;

    const value = event.target.value;
    if (!isRunning && value.trim().length > 0) {
      setIsRunning(true);
    }
    setTypedText(value);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_10%,#0f766e_0%,#052e2b_35%,#041b19_100%)] px-4 py-10 text-slate-100 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute -left-20 top-8 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />

      <section className="relative mx-auto w-full max-w-6xl rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7 lg:p-10">
        <header className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/75">
              Bilingual Typing Lab
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Bangla & English Typing Test
            </h1>
            <p className="mt-2 text-sm text-emerald-50/80 sm:text-base">
              Server-driven data with Unicode-safe strict word validation.
            </p>
          </div>

          <div className="grid w-full gap-3 sm:max-w-xl sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50">
              Language
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="rounded-xl border border-emerald-100/30 bg-slate-950/45 px-4 py-3 text-sm font-semibold text-white outline-none ring-0 transition focus:border-amber-300"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50">
              Duration
              <select
                value={durationMin}
                onChange={(event) => setDurationMin(Number(event.target.value))}
                className="rounded-xl border border-emerald-100/30 bg-slate-950/45 px-4 py-3 text-sm font-semibold text-white outline-none ring-0 transition focus:border-amber-300"
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option} min
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50">
              Display
              <select
                value={displayMode}
                onChange={(event) => setDisplayMode(event.target.value)}
                className="rounded-xl border border-emerald-100/30 bg-slate-950/45 px-4 py-3 text-sm font-semibold text-white outline-none ring-0 transition focus:border-amber-300"
              >
                {DISPLAY_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Time Left" value={timeLabel} />
          <StatCard label="WPM" value={String(wpm)} />
          <StatCard label="Accuracy" value={`${accuracy}%`} />
          <StatCard
            label="Correct Words"
            value={String(wordStats.correctWords)}
          />
          <StatCard
            label="Incorrect Words"
            value={String(wordStats.incorrectWords)}
          />
        </div>

        <section
          className={`rounded-2xl border border-white/15 bg-slate-950/40 p-5 sm:p-7 ${
            language === "bn" ? "[font-family:var(--font-bengali)]" : ""
          }`}
        >
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-amber-200/90">
            Target Text
          </h2>

          {isLoadingSource ? (
            <p className="text-lg text-emerald-50/80">Loading source...</p>
          ) : loadError ? (
            <p className="rounded-xl border border-rose-300/50 bg-rose-900/20 p-3 text-sm text-rose-100">
              {loadError}
            </p>
          ) : displayMode === "ticker" ? (
            <div className="relative overflow-hidden rounded-2xl border border-cyan-100/20 bg-slate-950/55 px-4 py-8">
              <div className="pointer-events-none absolute inset-y-0 left-[38%] w-[2px] bg-amber-300/70" />
              <div
                className="whitespace-nowrap text-2xl font-semibold leading-relaxed text-emerald-50 transition-transform duration-300 ease-out sm:text-3xl"
                style={{
                  transform: `translate3d(calc(38% - ${tickerShiftCh}ch), 0, 0)`,
                }}
              >
                {tickerWindow.words.map((word, localIndex) => {
                  const globalIndex = tickerWindow.start + localIndex;
                  let className = "text-emerald-50/60";

                  if (globalIndex < liveWordEvaluation.wordStatuses.length) {
                    className =
                      liveWordEvaluation.wordStatuses[globalIndex] === "correct"
                        ? "text-emerald-300"
                        : "text-rose-300";
                  }

                  if (!isFinished && globalIndex === activeWordIndex) {
                    className = "rounded bg-amber-300 px-1 text-slate-900";
                  }

                  return (
                    <span
                      key={`${word}-${globalIndex}`}
                      className={`${className} mr-2 inline-block`}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="leading-8 sm:text-lg">
              {passageWindow.start > 0 && (
                <span className="text-emerald-50/30">... </span>
              )}
              {passageWindow.chars.map((char, index) => {
                const absoluteIndex = passageWindow.start + index;
                let className = "text-emerald-50/60";

                if (absoluteIndex < typedChars.length) {
                  className =
                    typedChars[absoluteIndex] === char
                      ? "text-emerald-300"
                      : "text-rose-300";
                } else if (!isFinished && absoluteIndex === currentCharIndex) {
                  className =
                    "rounded bg-amber-300 px-[1px] text-slate-900 shadow-[0_0_0_1px_rgba(251,191,36,0.45)]";
                }

                return (
                  <span key={`${char}-${absoluteIndex}`} className={className}>
                    {char}
                  </span>
                );
              })}
            </p>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-white/15 bg-black/25 p-5 sm:p-7">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-cyan-100">
            Start Typing
          </h2>
          <textarea
            value={typedText}
            onChange={handleTypingChange}
            disabled={isFinished || isLoadingSource || Boolean(loadError)}
            placeholder={
              language === "bn"
                ? "এখানে টাইপ করা শুরু করুন..."
                : "Start typing here..."
            }
            rows={8}
            className={`w-full resize-none rounded-2xl border border-cyan-100/20 bg-slate-950/55 p-4 text-lg leading-8 text-slate-100 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 sm:text-xl ${
              language === "bn" ? "[font-family:var(--font-bengali)]" : ""
            }`}
            onPaste={(event) => event.preventDefault()}
            onDrop={(event) => event.preventDefault()}
            onCopy={(event) => event.preventDefault()}
            onCut={(event) => event.preventDefault()}
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => replaceSource(language, durationMin)}
              className="rounded-xl bg-gradient-to-r from-amber-300 to-orange-300 px-5 py-2.5 text-sm font-extrabold text-slate-900 transition hover:brightness-105"
            >
              New Stream
            </button>

            <button
              type="button"
              onClick={() => {
                setTypedText("");
                setIsRunning(false);
                setIsFinished(false);
                setTimeLeft(totalSeconds);
              }}
              className="rounded-xl border border-emerald-100/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-white/20"
            >
              Reset Progress
            </button>
          </div>
        </section>
      </section>

      {isFinished && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-white/25 bg-[linear-gradient(145deg,#082f2d,#134e4a)] p-6 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] sm:p-8">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
              Session Complete
            </p>
            <h3 className="mt-2 text-3xl font-extrabold">Detailed Report</h3>

            <div className="mt-5 space-y-3 rounded-2xl bg-black/20 p-4">
              <FinishRow label="Final WPM" value={String(wpm)} />
              <FinishRow
                label="Total Typed Words"
                value={String(
                  finalWordEvaluation.correctWords +
                    finalWordEvaluation.incorrectWords,
                )}
              />
              <FinishRow label="Final Accuracy" value={`${accuracy}%`} />
              <FinishRow
                label="Correct Words"
                value={String(finalWordEvaluation.correctWords)}
              />
              <FinishRow
                label="Incorrect Words"
                value={String(finalWordEvaluation.incorrectWords)}
              />
              {language === "bn" && (
                <FinishRow
                  label="Stroke Wise Correct Word"
                  value={String(
                    Math.round(finalWordEvaluation.correctStrokes / 5),
                  )}
                />
              )}
            </div>

            <section className="mt-5 rounded-2xl border border-white/20 bg-black/25 p-4">
              <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-cyan-100">
                Visual Typing Report
              </h4>
              <p
                className={`mt-3 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-950/45 p-3 text-sm leading-7 sm:text-base ${
                  language === "bn" ? "[font-family:var(--font-bengali)]" : ""
                }`}
              >
                {typedWordReport.length > 0 ? (
                  typedWordReport.map((item) => {
                    if (item.status === "space") {
                      return <span key={item.key}>{item.text}</span>;
                    }

                    return (
                      <span
                        key={item.key}
                        className={
                          item.status === "correct"
                            ? "rounded bg-emerald-400/20 px-[2px] text-emerald-200"
                            : "rounded bg-rose-400/20 px-[2px] text-rose-200"
                        }
                      >
                        {item.text}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-slate-300">
                    No typing input recorded.
                  </span>
                )}
              </p>
            </section>

            <button
              type="button"
              onClick={() => replaceSource(language, durationMin)}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-300 to-orange-300 px-5 py-3 text-sm font-extrabold text-slate-900 transition hover:brightness-105"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="rounded-2xl border border-white/20 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-cyan-100/80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
        {value}
      </p>
    </article>
  );
}

function FinishRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-emerald-50/80">{label}</span>
      <span className="text-xl font-extrabold text-amber-200">{value}</span>
    </div>
  );
}
