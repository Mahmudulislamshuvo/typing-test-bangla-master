"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  alignStrictWords,
  buildWordReport,
  getTargetSlice,
  normalizeText,
  splitGraphemes,
  splitStrictWords,
} from "@/lib/typing-utils";

const DURATION_OPTIONS = [1, 2, 3, 5, 10, 15, 20];
const DISPLAY_MODES = [
  { value: "passage", label: "Passage Mode" },
  { value: "ticker", label: "Scrolling Mode" },
];
const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "bn", label: "বাংলা" },
];

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function TypingTestDisappearing({
  initialLanguage,
  initialDuration,
  initialWords,
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const [durationMin, setDurationMin] = useState(initialDuration);
  const [displayMode, setDisplayMode] = useState("passage");

  // Changed state for disappearing mode
  const [committedText, setCommittedText] = useState("");
  const [currentInput, setCurrentInput] = useState("");
  const typedText = committedText + currentInput;

  const [targetWords, setTargetWords] = useState(
    Array.isArray(initialWords) ? initialWords : [],
  );
  const [timeLeft, setTimeLeft] = useState(initialDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoadingSource, setIsLoadingSource] = useState(!initialWords?.length);
  const [loadError, setLoadError] = useState("");

  const isFetchingMoreRef = useRef(false);
  const skipInitialSelectionReloadRef = useRef(true);

  // Track seen documents to cycle through them randomly without repetition
  // Key format: `${lang}-${duration}` -> [shuffled_indices]
  const playlistRef = useRef({});
  const totalDocsRef = useRef({});

  // Initialize playlist from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("typing-test-playlist");
      if (stored) {
        playlistRef.current = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load playlist", e);
    }
  }, []);

  const savePlaylist = useCallback(() => {
    try {
      localStorage.setItem(
        "typing-test-playlist",
        JSON.stringify(playlistRef.current),
      );
    } catch (e) {
      console.error("Failed to save playlist", e);
    }
  }, []);

  const getNextIndex = useCallback(
    (key, totalDocs) => {
      // If we don't know totalDocs yet, we can't generate a playlist.
      // Return -1 to let the server pick a random one (and return totalDocs for next time).
      if (!totalDocs || totalDocs <= 0) return -1;

      if (!playlistRef.current[key] || playlistRef.current[key].length === 0) {
        // Create new shuffled playlist
        const indices = Array.from({ length: totalDocs }, (_, i) => i);
        playlistRef.current[key] = shuffleArray(indices);
      }

      const nextIndex = playlistRef.current[key].pop();
      savePlaylist();
      return nextIndex;
    },
    [savePlaylist],
  );

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
        typedKeystrokes += typedChar.length;
      }

      if (i < targetChars.length && typedChar === targetChars[i] && !isSpace) {
        correctKeystrokes += typedChar.length;
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
    const correctStrokes = liveTypedWords.reduce((acc, word, idx) => {
      if (wordStatuses[idx] === "correct") {
        return acc + word.length;
      }
      return acc;
    }, 0);
    return { correctWords, incorrectWords, wordStatuses, correctStrokes };
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
          ((wordStats.correctStrokes / progress.typedKeystrokes) * 100).toFixed(
            1,
          ),
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

  const tickerContainerRef = useRef(null);
  const [tickerOffsetLeft, setTickerOffsetLeft] = useState(0);

  const tickerWindow = useMemo(() => {
    const start = Math.max(0, activeWordIndex - 8);
    const end = Math.min(targetWords.length, activeWordIndex + 36);
    return {
      start,
      end,
      words: targetWords.slice(start, end),
    };
  }, [activeWordIndex, targetWords]);

  useLayoutEffect(() => {
    if (displayMode !== "ticker" || !tickerContainerRef.current) return;
    const activeEl = tickerContainerRef.current.querySelector(
      '[data-active="true"]',
    );
    if (activeEl) {
      setTickerOffsetLeft(activeEl.offsetLeft);
    } else {
      setTickerOffsetLeft(0);
    }
  }, [activeWordIndex, displayMode, tickerWindow]);

  const fetchWordChunk = useCallback(
    async (lang, minutes, count = 160) => {
      // Only determine index for initial load, not for "append" calls which just need random chunks?
      // Actually, "appendMoreWords" is for infinite scroll. If we are infinite scrolling, we probably just want MORE of the SAME document if possible?
      // But currently backend randomizes snippet if index -1.
      // So infinite scroll within a test should just provide MORE words. Random snippets is fine.

      let forceIndex = -1;
      const key = `${lang}-${minutes}`;

      // If it's a "New Stream" (count > 200, heuristic check), use playlist logic
      if (count > 200) {
        const knownTotal = totalDocsRef.current[key] || 0;
        if (knownTotal > 0) {
          forceIndex = getNextIndex(key, knownTotal);
        }
      }

      const params = new URLSearchParams({
        lang,
        duration: String(minutes),
        count: String(count),
        ...(forceIndex !== -1 && { index: String(forceIndex) }),
      });

      const response = await fetch(`/api/typing-source?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load typing source.");
      }

      const payload = await response.json();

      // Update known total docs for this category
      if (payload.totalDocs) {
        totalDocsRef.current[key] = payload.totalDocs;
      }

      const words = Array.isArray(payload?.words)
        ? payload.words
            .filter((word) => typeof word === "string" && word.trim())
            .map((word) => normalizeText(word, lang))
        : [];

      if (!words.length) {
        throw new Error("Typing source is empty.");
      }

      return words;
    },
    [getNextIndex],
  );

  const replaceSource = useCallback(
    async (lang = language, minutes = durationMin) => {
      setIsLoadingSource(true);
      setLoadError("");
      setCommittedText("");
      setCurrentInput("");
      setIsRunning(false);
      setIsFinished(false);
      setTimeLeft(minutes * 60);

      try {
        const wordsData = await fetchWordChunk(lang, minutes, 220);
        setTargetWords(Array.isArray(wordsData) ? wordsData : []);
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

  const isComposingRef = useRef(false);

  function handleTypingChange(event) {
    if (isFinished || isLoadingSource || loadError) return;

    const value = event.target.value;
    if (!isRunning && value.trim().length > 0) {
      setIsRunning(true);
    }

    // Auto-commit on Space
    if (value.endsWith(" ")) {
      setCommittedText((prev) => prev + value);
      setCurrentInput("");
    } else {
      setCurrentInput(value);
    }
  }

  function handleCompositionStart() {
    isComposingRef.current = true;
  }

  function handleCompositionEnd() {
    isComposingRef.current = false;
  }

  function handleKeyDown(event) {
    if (isComposingRef.current) return;

    // For English, we strictly block Backspace to enforce "Blind Mode".
    // For Bangla, we allow Backspace as it is required for IMEs (Bijoy).
    if (event.key === "Backspace" && language !== "bn") {
      event.preventDefault();
    }
  }

  const hasSavedReportRef = useRef(false);

  useEffect(() => {
    if (!isFinished) {
      hasSavedReportRef.current = false;
      return;
    }

    if (hasSavedReportRef.current) return;

    const saveReport = async () => {
      let deviceName = localStorage.getItem("typing-test-device-name");
      if (!deviceName) {
        deviceName = `Device-${Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase()}`;
        localStorage.setItem("typing-test-device-name", deviceName);
      }

      try {
        await fetch("/api/save-report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            deviceName,
            wpm,
            accuracy,
            language,
            duration: durationMin,
            mode: displayMode,
            testType: "Without Backspace",
            correctStrokes: finalWordEvaluation.correctStrokes,
            correctWords: finalWordEvaluation.correctWords,
            totalWords:
              finalWordEvaluation.correctWords +
              finalWordEvaluation.incorrectWords,
            strokeWiseCorrectWords:
              language === "bn"
                ? Math.round(finalWordEvaluation.correctStrokes / 5)
                : null,
            date: new Date(),
          }),
        });
        hasSavedReportRef.current = true;
      } catch (error) {
        console.error("Failed to save report:", error);
      }
    };

    saveReport();
  }, [
    isFinished,
    wpm,
    accuracy,
    language,
    durationMin,
    displayMode,
    finalWordEvaluation,
  ]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_10%,#0f766e_0%,#052e2b_35%,#041b19_100%)] px-4 py-10 text-slate-100 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute -left-20 top-8 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />

      <section className="relative mx-auto w-full max-w-6xl rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7 lg:p-10">
        <header className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/75 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
              Blind Mode Enabled
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Bangla & English Typing Test
            </h1>
            <p className="mt-2 text-sm text-emerald-50/80 sm:text-base">
              No backspace allowed. Words disappear on space.
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
                ref={tickerContainerRef}
                className="whitespace-nowrap text-2xl font-semibold leading-relaxed text-emerald-50 transition-transform duration-300 ease-out sm:text-3xl"
                style={{
                  transform: `translate3d(calc(38% - ${tickerOffsetLeft}px), 0, 0)`,
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
                      data-active={
                        !isFinished && globalIndex === activeWordIndex
                      }
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
            Start Typing (Blind Mode)
          </h2>
          <textarea
            value={currentInput}
            onChange={handleTypingChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            disabled={isFinished || isLoadingSource || Boolean(loadError)}
            placeholder={
              language === "bn"
                ? "এখানে টাইপ শুরু করুন (ব্যাকস্পেস নেই)..."
                : "Start typing here (No Backspace)..."
            }
            rows={2}
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
                setCommittedText("");
                setCurrentInput("");
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
              {language === "bn" && (
                <FinishRow
                  label="Stroke Wise Correct Word"
                  value={String(
                    Math.round(finalWordEvaluation.correctStrokes / 5),
                  )}
                />
              )}
              <FinishRow label="Final WPM (Per Minute)" value={String(wpm)} />
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
