"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const DURATION_OPTIONS = [1, 2, 3, 5, 10, 15, 20];
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

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
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
  const [wordTimings, setWordTimings] = useState([]);
  const [targetWords, setTargetWords] = useState(
    Array.isArray(initialWords) ? initialWords : [],
  );
  const [timeLeft, setTimeLeft] = useState(initialDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isLoadingSource, setIsLoadingSource] = useState(!initialWords?.length);
  const [loadError, setLoadError] = useState("");
  const [hoveredWordIndex, setHoveredWordIndex] = useState(null);
  const [chartZoom, setChartZoom] = useState(1);

  const isFetchingMoreRef = useRef(false);
  const skipInitialSelectionReloadRef = useRef(true);
  const lastWordCountRef = useRef(0);
  const wordStartTimeRef = useRef(null);

  // Track seen documents to cycle through them randomly without repetition
  // Key format: `${lang}-${duration}` -> [shuffled_indices]
  const playlistRef = useRef({});

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

  const totalDocsRef = useRef({});

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

  const timingSummary = useMemo(() => {
    if (!wordTimings.length) return null;

    const durations = wordTimings.map((entry) => entry.durationMs);
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    const strokeCounts = wordTimings.map((entry) => entry.word.length);
    const strokeWords = strokeCounts.map((count) =>
      Number((count / 5).toFixed(2)),
    );

    const wpmByWord = wordTimings.map((entry) => {
      const minutes = entry.durationMs / 60000;
      const raw = minutes > 0 ? entry.word.length / 5 / minutes : 0;
      return Math.round(raw);
    });

    const slowest = wpmByWord
      .map((wpmValue, index) => ({ wpmValue, index }))
      .sort((a, b) => a.wpmValue - b.wpmValue)
      .slice(0, 3);

    return {
      durations,
      maxDuration,
      minDuration,
      strokeCounts,
      strokeWords,
      wpmByWord,
      slowest,
    };
  }, [wordTimings]);

  const timingChart = useMemo(() => {
    if (!timingSummary) return null;

    const baseViewWidth = 640;
    const viewHeight = 280;
    const padding = { left: 40, right: 16, top: 100, bottom: 30 };
    const baseChartWidth = baseViewWidth - padding.left - padding.right;
    const chartWidth = baseChartWidth * chartZoom;
    const viewWidth = padding.left + padding.right + chartWidth;
    const chartHeight = viewHeight - padding.top - padding.bottom;

    const maxWpm = Math.max(...timingSummary.wpmByWord, 0);
    const minWpm = Math.min(...timingSummary.wpmByWord, 0);
    const range = maxWpm - minWpm || 1;

    const points = timingSummary.wpmByWord.map((wpmValue, index) => {
      const x =
        padding.left +
        (index / Math.max(timingSummary.wpmByWord.length - 1, 1)) * chartWidth;
      const normalized = (wpmValue - minWpm) / range;
      const y = padding.top + (1 - normalized) * chartHeight;
      return { x, y, normalized };
    });

    const path = points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
      )
      .join(" ");

    const lastPoint = points[points.length - 1] || { x: padding.left, y: 0 };
    const areaPath = `${path} L ${lastPoint.x.toFixed(1)} ${(
      padding.top + chartHeight
    ).toFixed(1)} L ${padding.left} ${(padding.top + chartHeight).toFixed(
      1,
    )} Z`;

    return {
      viewWidth,
      viewHeight,
      padding,
      minWpm,
      maxWpm,
      points,
      path,
      areaPath,
    };
  }, [chartZoom, timingSummary]);

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
      // If we want consistent flow, we should probably stick to the same index?
      // BUT the backend function cycles within the document if we force index.
      // So for "appendMoreWords", we should probably REUSE standard index if we had one.
      // However, "appendMoreWords" calls with same lang/minutes.
      // Let's decide: "New Stream" triggers a NEW index. "Append" uses... random? Or same?
      // If we use same index, we get same doc content recycled.
      // If we use -1, we get random snippets from random docs.
      // The user wants "cycle through 20 docs". This implies "New Stream" = Next Doc.
      // So infinite scroll within a test should just provide MORE words. Random snippets is fine for extending a test, or same doc.
      // Let's just use -1 for appending to keep it simple/robust, or use current index?
      // Let's use -1 for append for now to avoid complexity of tracking current index in state.
      // Wait, "New Stream" calls this.

      // We need to differentiate between "New Stream" (get next doc) and "Append" (get more words).
      // The caller of fetchWordChunk doesn't specify purpose.
      // But replaceSource calls it with 220 words (initial), append calls with 180.

      let forceIndex = -1;
      const key = `${lang}-${minutes}`;

      // If it's a "New Stream" (count > 200, heuristic), pick next document.
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
        // If we didn't have a total before, we might want to init the playlist now?
        // Next time we call getNextIndex, it will use this total.
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
      setTypedText("");
      setWordTimings([]);
      setHoveredWordIndex(null);
      setChartZoom(1);
      lastWordCountRef.current = 0;
      wordStartTimeRef.current = null;
      setIsRunning(false);
      setIsFinished(false);
      setTimeLeft(minutes * 60);

      try {
        const wordsData = await fetchWordChunk(lang, minutes, 220);
        // Ensure wordsData is an array. fetchWordChunk returns the array of words.
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

  function handleTypingChange(event) {
    if (isFinished || isLoadingSource || loadError) return;

    const value = event.target.value;
    const now = performance.now();
    if (!isRunning && value.trim().length > 0) {
      setIsRunning(true);
    }
    if (value.trim().length > 0 && wordStartTimeRef.current === null) {
      wordStartTimeRef.current = now;
    }

    const wordsNow = splitStrictWords(value, locale, false);
    const newCount = wordsNow.length;
    const prevCount = lastWordCountRef.current;

    setWordTimings((prev) => {
      let next = [...prev];
      if (newCount > prevCount) {
        const completed = wordsNow.slice(prevCount, newCount);
        const entries = completed.map((word) => ({
          word,
          startTime: wordStartTimeRef.current ?? now,
          durationMs: Math.max(0, now - (wordStartTimeRef.current ?? now)),
          endTime: now,
        }));
        next = [...next, ...entries];
      } else if (newCount < prevCount) {
        next = next.slice(0, newCount);
      }

      for (let i = 0; i < newCount; i++) {
        if (next[i]) {
          if (next[i].word !== wordsNow[i]) {
            next[i] = { ...next[i], word: wordsNow[i] };
          }
          if (i === newCount - 1) {
            const start = next[i].startTime ?? wordStartTimeRef.current ?? now;
            next[i].durationMs = Math.max(0, now - start);
            next[i].endTime = now;
          }
        }
      }
      return next;
    });

    if (newCount !== prevCount) {
      wordStartTimeRef.current = now;
    }

    lastWordCountRef.current = newCount;
    setTypedText(value);
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
        const timingPayload = wordTimings.map((entry, index) => {
          const minutes = entry.durationMs / 60000;
          const rawWpm = minutes > 0 ? entry.word.length / 5 / minutes : 0;
          return {
            word: entry.word,
            durationMs: Math.round(entry.durationMs),
            wpm: Math.round(rawWpm),
            strokeCount: entry.word.length,
            status: finalWordEvaluation.wordStatuses[index] || "incorrect",
          };
        });

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
            testType: "Standard",
            correctStrokes: finalWordEvaluation.correctStrokes,
            correctWords: finalWordEvaluation.correctWords,
            totalWords:
              finalWordEvaluation.correctWords +
              finalWordEvaluation.incorrectWords,
            strokeWiseCorrectWords:
              language === "bn"
                ? Math.round(finalWordEvaluation.correctStrokes / 5)
                : null,
            wordTimings: timingPayload.length ? timingPayload : undefined,
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
    wordTimings,
  ]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_10%,#0f766e_0%,#052e2b_35%,#041b19_100%)] px-4 py-10 text-slate-100 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute -left-20 top-8 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />

      <section className="relative mx-auto w-full max-w-[1440px] rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7 lg:p-10">
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
                setWordTimings([]);
                setHoveredWordIndex(null);
                setChartZoom(1);
                lastWordCountRef.current = 0;
                wordStartTimeRef.current = null;
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
          <div className="w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-3xl border border-white/25 bg-[linear-gradient(145deg,#082f2d,#134e4a)] p-6 pr-4 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] sm:p-8 sm:pr-6">
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
                Typing Speed Timeline
              </h4>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200/70">
                <span>
                  Hover on a point to see which word took longer to finish.
                </span>
                <label className="flex items-center gap-2">
                  Zoom
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.25"
                    value={chartZoom}
                    onChange={(event) =>
                      setChartZoom(Number(event.target.value))
                    }
                    className="h-1 w-32 cursor-pointer accent-emerald-300"
                  />
                </label>
              </div>
              {timingSummary && timingChart ? (
                <div className="mt-4 overflow-x-auto overflow-y-visible">
                  <div
                    className="relative"
                    style={{ width: `${timingChart.viewWidth}px` }}
                  >
                    <svg
                      viewBox={`0 0 ${timingChart.viewWidth} ${timingChart.viewHeight}`}
                      className="h-auto max-h-[350px]"
                      style={{
                        width: `${timingChart.viewWidth}px`,
                      }}
                    >
                      <defs>
                        <linearGradient
                          id="speed-area"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#22d3ee"
                            stopOpacity="0.35"
                          />
                          <stop
                            offset="100%"
                            stopColor="#0f172a"
                            stopOpacity="0"
                          />
                        </linearGradient>
                        <linearGradient
                          id="speed-line"
                          x1="0"
                          y1="1"
                          x2="0"
                          y2="0"
                        >
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                        <filter
                          id="speed-glow"
                          x="-20%"
                          y="-20%"
                          width="140%"
                          height="140%"
                        >
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <g opacity="0.35" stroke="#38bdf8" strokeWidth="1">
                        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                          const y =
                            timingChart.padding.top +
                            tick *
                              (timingChart.viewHeight -
                                timingChart.padding.top -
                                timingChart.padding.bottom);
                          return (
                            <line
                              key={`grid-${tick}`}
                              x1={timingChart.padding.left}
                              x2={
                                timingChart.viewWidth -
                                timingChart.padding.right
                              }
                              y1={y}
                              y2={y}
                            />
                          );
                        })}
                      </g>
                      {(() => {
                        const maxWpm = Math.max(...timingSummary.wpmByWord, 0);
                        const minWpm = Math.min(...timingSummary.wpmByWord, 0);
                        const roundedMax = Math.max(
                          10,
                          Math.ceil(maxWpm / 10) * 10,
                        );
                        const roundedMin = Math.max(
                          0,
                          Math.floor(minWpm / 10) * 10,
                        );
                        const range = roundedMax - roundedMin || 10;
                        const ticks = Array.from({ length: 5 }, (_, index) =>
                          Math.round(roundedMax - (range * index) / 4),
                        );
                        return ticks.map((value, index) => {
                          const y =
                            timingChart.padding.top +
                            (index / 4) *
                              (timingChart.viewHeight -
                                timingChart.padding.top -
                                timingChart.padding.bottom) +
                            4;
                          return (
                            <text
                              key={`wpm-${value}-${index}`}
                              x={timingChart.padding.left - 8}
                              y={y}
                              textAnchor="end"
                              fill="#94a3b8"
                              fontSize="10"
                            >
                              {value}
                            </text>
                          );
                        });
                      })()}
                      <path
                        d={timingChart.areaPath}
                        fill="url(#speed-area)"
                        stroke="none"
                      />
                      <path
                        d={timingChart.path}
                        fill="none"
                        stroke="url(#speed-line)"
                        strokeWidth="2.5"
                        filter="url(#speed-glow)"
                      />
                      {timingChart.points.map((point, index) => {
                        const isHovered = hoveredWordIndex === index;
                        const isSlow = timingSummary.slowest.some(
                          (entry) => entry.index === index,
                        );
                        const isIncorrect =
                          finalWordEvaluation.wordStatuses[index] ===
                          "incorrect";
                        const wpmValue = timingSummary.wpmByWord[index] ?? 0;
                        const threshold = 20;
                        let red = 220;
                        let green = 38;
                        let blue = 38;

                        if (wpmValue >= threshold) {
                          const range = Math.max(
                            1,
                            timingChart.maxWpm - threshold,
                          );
                          const intensity = Math.max(
                            0,
                            Math.min(1, (wpmValue - threshold) / range),
                          );
                          const low = { r: 34, g: 197, b: 94 };
                          const high = { r: 16, g: 120, b: 57 };
                          red = Math.round(
                            low.r + (high.r - low.r) * intensity,
                          );
                          green = Math.round(
                            low.g + (high.g - low.g) * intensity,
                          );
                          blue = Math.round(
                            low.b + (high.b - low.b) * intensity,
                          );
                        } else {
                          const intensity = Math.max(
                            0,
                            Math.min(1, wpmValue / threshold),
                          );
                          const low = { r: 220, g: 38, b: 38 };
                          const high = { r: 248, g: 113, b: 113 };
                          red = Math.round(
                            low.r + (high.r - low.r) * intensity,
                          );
                          green = Math.round(
                            low.g + (high.g - low.g) * intensity,
                          );
                          blue = Math.round(
                            low.b + (high.b - low.b) * intensity,
                          );
                        }
                        const pointColor = isIncorrect
                          ? "#f87171"
                          : `rgb(${red}, ${green}, ${blue})`;
                        return (
                          <circle
                            key={`point-${index}`}
                            cx={point.x}
                            cy={point.y}
                            r={isHovered ? 5 : isSlow ? 4 : 3}
                            fill={pointColor}
                            opacity={isHovered ? 1 : 0.8}
                            onMouseEnter={() => setHoveredWordIndex(index)}
                            onMouseLeave={() => setHoveredWordIndex(null)}
                          />
                        );
                      })}
                    </svg>

                    {hoveredWordIndex !== null &&
                      timingChart.points[hoveredWordIndex] && (
                        <div
                          className="pointer-events-none absolute z-50 min-w-[150px] rounded-lg border border-white/20 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-xl"
                          style={{
                            left: `${timingChart.points[hoveredWordIndex].x}px`,
                            top: `${timingChart.points[hoveredWordIndex].y}px`,
                            transform: `translate(${hoveredWordIndex > timingChart.points.length * 0.7 ? "-90%" : hoveredWordIndex < timingChart.points.length * 0.3 ? "-10%" : "-50%"}, ${timingChart.points[hoveredWordIndex].y < 180 ? "15%" : "-110%"})`,
                          }}
                        >
                          <div
                            className={`font-semibold ${
                              finalWordEvaluation.wordStatuses[
                                hoveredWordIndex
                              ] === "incorrect"
                                ? "text-rose-200"
                                : "text-amber-200"
                            }`}
                          >
                            {wordTimings[hoveredWordIndex]?.word || "-"}
                          </div>
                          <div className="text-slate-200/70">
                            Index: {hoveredWordIndex + 1}
                          </div>
                          <div
                            className={
                              finalWordEvaluation.wordStatuses[
                                hoveredWordIndex
                              ] === "incorrect"
                                ? "text-sm text-rose-200/90"
                                : "text-sm text-emerald-200/90"
                            }
                          >
                            {finalWordEvaluation.wordStatuses[
                              hoveredWordIndex
                            ] === "incorrect"
                              ? "Incorrect"
                              : "Correct"}
                          </div>
                          <div className="text-cyan-200/90">
                            Time:{" "}
                            {(
                              timingSummary.durations[hoveredWordIndex] / 1000
                            ).toFixed(2)}
                            s
                          </div>
                          <div className="text-slate-200/90">
                            Strokes:{" "}
                            {timingSummary.strokeCounts[hoveredWordIndex]}
                          </div>
                          <div className="text-slate-200/90">
                            Stroke Words:{" "}
                            {timingSummary.strokeWords[hoveredWordIndex]}
                          </div>
                          <div className="text-emerald-200/90">
                            Speed: {timingSummary.wpmByWord[hoveredWordIndex]}{" "}
                            WPM
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-300">
                  Not enough timing data yet.
                </p>
              )}

              {timingSummary && timingSummary.slowest.length > 0 && (
                <div className="mt-3 text-xs text-slate-200/80">
                  Slowest words:{" "}
                  {timingSummary.slowest.map((entry, index) => {
                    const label = wordTimings[entry.index]?.word || "-";
                    const time = (entry.durationMs / 1000).toFixed(2);
                    return (
                      <span key={`slow-${entry.index}`}>
                        {index > 0 ? ", " : ""}
                        {label} ({time}s)
                      </span>
                    );
                  })}
                </div>
              )}
            </section>

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
