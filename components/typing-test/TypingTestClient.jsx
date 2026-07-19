"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Presentational components
import TypingTestShell from "./TypingTestShell";
import TestControls from "./TestControls";
import TestStats from "./TestStats";
import TargetTextPanel from "./TargetTextPanel";
import TypingTextarea from "./TypingTextarea";
import TestActions from "./TestActions";
import TypingReportModal from "./TypingReportModal";

// Hooks
import useImeSafeTextarea from "./hooks/useImeSafeTextarea";
import useTypingSource from "./hooks/useTypingSource";
import useTypingSession from "./hooks/useTypingSession";
import useTypingMetrics from "./hooks/useTypingMetrics";
import useWordTimings from "./hooks/useWordTimings";
import useTargetWindow from "./hooks/useTargetWindow";

// Utils
import { buildCustomWords } from "./utils/typing-display";
import { toUnicodeDisplayWord } from "./utils/classic-typing";
import { LANGUAGE_OPTIONS, DURATION_OPTIONS } from "./constants";

/**
 * Thin Normal-Mode Orchestrator.
 *
 * State, hooks, and callbacks live here.
 * All UI is delegated to presentational components.
 *
 * CRITICAL: The typing textarea remains browser-managed (uncontrolled).
 * See useImeSafeTextarea for details.
 */
export default function TypingTestClient({
  initialLanguage,
  initialDuration,
  initialWords,
  initialTotalDocs = 0,
  initialUsedIndex = -1,
  sourceMode = "remote",
  customSourceText = "",
  inputMode = "unicode",
  languageOptions,
  hideTargetHighlights = false,
}) {
  const pathname = usePathname();
  const hideTargetText =
    pathname?.startsWith("/custom-typing") || pathname?.startsWith("/classic");
  const hideAccuracyStats =
    pathname?.startsWith("/custom-typing") || pathname?.startsWith("/classic");
  const isClassicRoute = pathname?.startsWith("/classic");
  const showPassFail = hideTargetText;
  const showTargetText = !hideTargetText;

  const isCustomSource = sourceMode === "custom";
  const isClassicMode = inputMode === "bijoy-classic";

  // ── Local state ──
  const [language, setLanguage] = useState(initialLanguage);
  const [durationMin, setDurationMin] = useState(initialDuration);
  const [displayMode, setDisplayMode] = useState("passage");
  const [typedText, setTypedText] = useState("");
  const [textareaResetKey, setTextareaResetKey] = useState(0);
  const [hoveredWordIndex, setHoveredWordIndex] = useState(null);
  const [chartZoom, setChartZoom] = useState(1);

  const isBangla = language === "bn";
  const locale = isBangla ? "bn" : "en";
  const isUnlimited = isCustomSource && durationMin === 0;
  const suppressTargetHighlights = hideTargetHighlights;

  const resolvedLanguageOptions =
    Array.isArray(languageOptions) && languageOptions.length
      ? languageOptions
      : LANGUAGE_OPTIONS;
  const durationOptions = isCustomSource
    ? [...DURATION_OPTIONS, 0]
    : DURATION_OPTIONS;

  // ── Font classes ──
  const typingFontClassName = isClassicMode
    ? "font-bijoy-classic"
    : isBangla
      ? "[font-family:var(--font-bengali)]"
      : "";
  const timingWordFontClass = isClassicMode
    ? "[font-family:var(--font-bengali)]"
    : typingFontClassName;
  const inputFontClassName = isClassicMode
    ? "font-bijoy-classic placeholder:font-sans text-2xl leading-9 sm:text-3xl sm:leading-10"
    : isBangla
      ? "[font-family:var(--font-bengali)]"
      : "";
  const typingPlaceholder = isClassicMode
    ? "Type using Bijoy Classic here..."
    : isBangla
      ? "এখানে টাইপ করা শুরু করুন..."
      : "Start typing here...";

  // ── Session timer (before useImeSafeTextarea so we have setters) ──
  const {
    timeLeft,
    setTimeLeft,
    isRunning,
    setIsRunning,
    isFinished,
    setIsFinished,
    reportDismissed,
    setReportDismissed,
    customElapsedSeconds,
    setCustomElapsedSeconds,
    totalSeconds,
    resetSession,
  } = useTypingSession({
    durationMin,
    isCustomSource,
    isUnlimited,
  });

  // ── Ref-based callback so useImeSafeTextarea can use latest closure ──
  const commitRef = useRef(null);

  // Word timings
  const {
    wordTimings,
    updateWordTimings,
    resetWordTimings,
  } = useWordTimings({ typedText, locale, isClassicMode });

  // Update the commit callback ref on every render
  commitRef.current = (rawValue) => {
    if (isFinished || isLoadingSource || loadError) return;

    const value = rawValue.trimStart();

    if (!isRunning && value.length > 0) {
      setIsRunning(true);
    }

    updateWordTimings(rawValue, isFinished, isLoadingSource, loadError);
    setTypedText(rawValue);
  };

  // IME-safe textarea — uses a stable ref callback
  const { textareaRef, handleChange, handleCompositionStart, handleCompositionEnd } =
    useImeSafeTextarea({
      value: typedText,
      resetKey: textareaResetKey,
      onCommittedValue: (val) => commitRef.current?.(val),
    });

  // Typing source
  const {
    targetWords,
    isLoadingSource,
    loadError,
    replaceSource,
    appendMoreWords,
    skipInitialSelectionReloadRef,
  } = useTypingSource({
    initialLanguage,
    initialDuration,
    initialWords,
    initialTotalDocs,
    initialUsedIndex,
    isCustomSource,
    customSourceText,
    isClassicMode,
    buildCustomWordsFn: buildCustomWords,
  });

  // Metrics
  const {
    targetChars,
    typedChars,
    liveTypedWords,
    finalTypedWords,
    liveWordEvaluation,
    finalWordEvaluation,
    wordStats,
    progress,
    typedWordReport,
    effectiveTargetWords,
    activeWordIndex,
  } = useTypingMetrics({
    typedText,
    targetWords,
    isFinished,
    isBangla,
    isClassicMode,
    isCustomSource,
    locale,
  });

  // Target window
  const { passageWordWindow, tickerWindow } = useTargetWindow({
    effectiveTargetWords,
    activeWordIndex,
    liveWordEvaluation,
    suppressTargetHighlights,
  });

  // ── Unlimited mode: finish when all target words typed ──
  // (Moved from useTypingSession because it needs finalTypedWords from useTypingMetrics)
  useEffect(() => {
    if (!isUnlimited || isFinished) return;
    if (!targetWords.length) return;
    if (finalTypedWords.length < targetWords.length) return;
    if (!typedText.trim()) return;

    const lastTargetWord = targetWords[targetWords.length - 1] || "";
    const lastTypedWord = finalTypedWords[finalTypedWords.length - 1] || "";
    const hasTypedLastWord =
      lastTypedWord.length >= lastTargetWord.length || /\s$/u.test(typedText);

    if (!hasTypedLastWord) return;

    setIsFinished(true);
    setIsRunning(false);
  }, [finalTypedWords, isFinished, isUnlimited, targetWords, typedText, setIsFinished, setIsRunning]);

  // ── Timing summary & chart ──
  const timingSummary = useMemo(() => {
    if (!wordTimings.length && !finalTypedWords.length) return null;
    const wordCount = Math.max(finalTypedWords.length, wordTimings.length);
    if (wordCount === 0) return null;

    const durations = Array.from({ length: wordCount }, (_, index) =>
      Number.isFinite(wordTimings[index]?.durationMs)
        ? wordTimings[index].durationMs
        : 0,
    );
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    const strokeCounts = Array.from(
      { length: wordCount },
      (_, index) =>
        (finalTypedWords[index] || wordTimings[index]?.word || "").length,
    );
    const strokeWords = strokeCounts.map((count) =>
      Number((count / 5).toFixed(2)),
    );
    const wpmByWord = durations.map((durationMs, index) => {
      const minutes = durationMs / 60000;
      const raw = minutes > 0 ? strokeCounts[index] / 5 / minutes : 0;
      return Math.round(raw);
    });
    const slowest = wpmByWord
      .map((wpmValue, index) => ({ wpmValue, index }))
      .sort((a, b) => a.wpmValue - b.wpmValue)
      .slice(0, 3);

    return { durations, maxDuration, minDuration, strokeCounts, strokeWords, wpmByWord, slowest };
  }, [finalTypedWords, wordTimings]);

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
      const x = padding.left + (index / Math.max(timingSummary.wpmByWord.length - 1, 1)) * chartWidth;
      const normalized = (wpmValue - minWpm) / range;
      const y = padding.top + (1 - normalized) * chartHeight;
      return { x, y, normalized };
    });
    const path = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
      .join(" ");
    const lastPoint = points[points.length - 1] || { x: padding.left, y: 0 };
    const areaPath = `${path} L ${lastPoint.x.toFixed(1)} ${(padding.top + chartHeight).toFixed(1)} L ${padding.left} ${(padding.top + chartHeight).toFixed(1)} Z`;
    return { viewWidth, viewHeight, padding, minWpm, maxWpm, points, path, areaPath };
  }, [chartZoom, timingSummary]);

  // ── Computed stats ──
  const elapsedSeconds = isCustomSource ? customElapsedSeconds : totalSeconds - timeLeft;
  const standardWordsTyped = progress.typedKeystrokes / 5;
  const wpm = elapsedSeconds > 0 ? Math.round(standardWordsTyped / (elapsedSeconds / 60)) : 0;
  const wordAccuracy = wordStats.correctWords + wordStats.incorrectWords > 0
    ? Number(((wordStats.correctWords / (wordStats.correctWords + wordStats.incorrectWords)) * 100).toFixed(1))
    : 100;
  const effectiveCorrectStrokes = isClassicMode
    ? wordStats.correctWords * 5
    : wordStats.correctStrokes;
  const accuracy = isClassicMode
    ? wordAccuracy
    : progress.typedKeystrokes > 0
      ? Number(((effectiveCorrectStrokes / progress.typedKeystrokes) * 100).toFixed(1))
      : 100;
  const strokeWiseCorrectWords = Math.round(effectiveCorrectStrokes / 5);
  const correctStrokesWithSpaces = effectiveCorrectStrokes + finalWordEvaluation.correctWords;
  const strokeWiseCorrectWordsWithSpaces = Math.round(correctStrokesWithSpaces / 5);
  const reportInputMode = isClassicMode ? "bijoy-classic" : "unicode";
  const totalTypedWords = finalWordEvaluation.correctWords + finalWordEvaluation.incorrectWords;
  const durationSeconds = isUnlimited ? customElapsedSeconds : totalSeconds;
  const passAccuracyThreshold = 95;
  const passWordsPerMinute = 20;
  const requiredStrokeWords = isUnlimited
    ? Math.max(1, Math.ceil((customElapsedSeconds / 60) * passWordsPerMinute))
    : Math.max(1, Math.ceil(durationMin * passWordsPerMinute));
  const passAccuracyMet = accuracy >= passAccuracyThreshold;
  const passStrokeWiseMet = (strokeWiseCorrectWords ?? 0) >= requiredStrokeWords;
  const isPass = passAccuracyMet && passStrokeWiseMet;
  const passTone = isPass ? "text-emerald-200" : "text-rose-200";
  const passCardTone = isPass
    ? "border-emerald-300/40 bg-emerald-500/10"
    : "border-rose-300/40 bg-rose-500/10";
  const reportResult = showPassFail ? (isPass ? "Pass" : "Fail") : undefined;
  const timeLabel = isUnlimited
    ? "Unlimited"
    : `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(timeLeft % 60).padStart(2, "0")}`;

  const headerBadge = isCustomSource ? "Custom Typing Session" : "Bilingual Typing Lab";
  const headerTitle = isCustomSource ? "Custom Text Typing Test" : "Bangla & English Typing Test";
  const headerSubtitle = isCustomSource
    ? "Your own text with the same analytics and reports."
    : "Server-driven data with Unicode-safe strict word validation.";
  const refreshLabel = isCustomSource ? "Reload Text" : "New Stream";

  // ── Callbacks ──

  const handleResetProgress = useCallback(() => {
    setTypedText("");
    setTextareaResetKey((key) => key + 1);
    resetWordTimings();
    setHoveredWordIndex(null);
    setChartZoom(1);
    resetSession(totalSeconds);
  }, [resetSession, resetWordTimings, totalSeconds]);

  const handleReplaceSource = useCallback(() => {
    replaceSource(language, durationMin, {
      onReset: () => {
        setTypedText("");
        setTextareaResetKey((key) => key + 1);
        resetWordTimings();
        setHoveredWordIndex(null);
        setChartZoom(1);
        setIsRunning(false);
        setIsFinished(false);
        setReportDismissed(false);
        setTimeLeft(durationMin * 60);
        setCustomElapsedSeconds(0);
      },
    });
  }, [durationMin, language, replaceSource, resetWordTimings, setIsRunning, setIsFinished, setReportDismissed, setTimeLeft, setCustomElapsedSeconds]);

  const getTimingDisplayWord = useCallback(
    (index) => {
      if (isClassicMode) {
        const raw = finalTypedWords[index] || wordTimings[index]?.word || "";
        return toUnicodeDisplayWord(raw) || "-";
      }
      return wordTimings[index]?.word || "-";
    },
    [finalTypedWords, isClassicMode, wordTimings],
  );

  // ── Source reload effects ──
  useEffect(() => {
    if (skipInitialSelectionReloadRef.current) {
      skipInitialSelectionReloadRef.current = false;
      return;
    }
    handleReplaceSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMin, language, handleReplaceSource]);

  useEffect(() => {
    if (targetWords.length) return;
    handleReplaceSource();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetWords.length, handleReplaceSource]);

  // Background word append
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

  // ── Report saving ──
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
        deviceName = `Device-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        localStorage.setItem("typing-test-device-name", deviceName);
      }

      try {
        const isClassicReport = reportInputMode === "bijoy-classic";
        const finalWordsForReport = Array.isArray(finalTypedWords) ? finalTypedWords : [];
        const firstTimingIndex = wordTimings.findIndex(
          (entry) => typeof entry?.word === "string" && entry.word.trim(),
        );
        const timingOffset =
          firstTimingIndex > 0 && wordTimings[firstTimingIndex]?.word === finalWordsForReport[0]
            ? firstTimingIndex
            : 0;
        const timingPayload = finalWordsForReport.map((word, index) => {
          const entry = wordTimings[index + timingOffset] || {};
          const durationMs = Number.isFinite(entry.durationMs) ? entry.durationMs : 0;
          const minutes = durationMs / 60000;
          const rawWpm = minutes > 0 ? word.length / 5 / minutes : 0;
          const wordUnicode = isClassicReport ? toUnicodeDisplayWord(word) : undefined;
          return {
            word,
            wordUnicode,
            durationMs: Math.round(durationMs),
            wpm: Math.round(rawWpm),
            strokeCount: word.length,
            status: finalWordEvaluation.wordStatuses[index] || "incorrect",
          };
        });

        await fetch("/api/save-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceName,
            wpm,
            accuracy,
            language,
            duration: durationMin,
            mode: displayMode,
            testType: isClassicRoute ? "Classic" : isCustomSource ? "Custom" : "Standard",
            correctStrokes: effectiveCorrectStrokes,
            correctWords: finalWordEvaluation.correctWords,
            totalWords: finalWordEvaluation.correctWords + finalWordEvaluation.incorrectWords,
            strokeWiseCorrectWords,
            strokeWiseCorrectWordsWithSpaces,
            strokeWiseCorrectCharacters: effectiveCorrectStrokes,
            wordTimings: timingPayload.length ? timingPayload : undefined,
            inputMode: reportInputMode,
            durationSeconds,
            result: showPassFail ? reportResult : undefined,
            date: new Date(),
          }),
        });
        hasSavedReportRef.current = true;
      } catch (error) {
        console.error("Failed to save report:", error);
      }
    };

    saveReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isFinished, wpm, accuracy, language, durationMin, displayMode,
    finalWordEvaluation, effectiveCorrectStrokes, isCustomSource,
    isClassicMode, isClassicRoute, reportInputMode, reportResult,
    strokeWiseCorrectWords, strokeWiseCorrectWordsWithSpaces,
    durationSeconds, finalTypedWords, wordTimings,
  ]);

  // ── Render ──
  return (
    <TypingTestShell>
      <section className="relative mx-auto w-full max-w-[1440px] rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7 lg:p-10">
        <header className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/75">
              {headerBadge}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              {headerTitle}
            </h1>
            <p className="mt-2 text-sm text-emerald-50/80 sm:text-base">
              {headerSubtitle}
            </p>
          </div>

          <TestControls
            language={language}
            onLanguageChange={setLanguage}
            durationMin={durationMin}
            onDurationChange={setDurationMin}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            languageOptions={resolvedLanguageOptions}
            durationOptions={durationOptions}
          />
        </header>

        <TestStats
          timeLabel={timeLabel}
          wpm={wpm}
          accuracy={accuracy}
          correctWords={wordStats.correctWords}
          incorrectWords={wordStats.incorrectWords}
          hideAccuracyStats={hideAccuracyStats}
        />

        {showTargetText ? (
          <TargetTextPanel
            displayMode={displayMode}
            isLoadingSource={isLoadingSource}
            loadError={loadError}
            passageWordWindow={passageWordWindow}
            tickerWindow={tickerWindow}
            activeWordIndex={activeWordIndex}
            wordStatuses={liveWordEvaluation.wordStatuses}
            isFinished={isFinished}
            suppressTargetHighlights={suppressTargetHighlights}
            typingFontClassName={typingFontClassName}
          />
        ) : null}

        <section className="mt-5 rounded-2xl border border-white/15 bg-black/25 p-5 sm:p-7">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-cyan-100">
            Start Typing
          </h2>
          <TypingTextarea
            textareaRef={textareaRef}
            handleChange={handleChange}
            handleCompositionStart={handleCompositionStart}
            handleCompositionEnd={handleCompositionEnd}
            disabled={isFinished || isLoadingSource || Boolean(loadError)}
            placeholder={typingPlaceholder}
            rows={8}
            className={inputFontClassName}
          />

          <TestActions
            refreshLabel={refreshLabel}
            onRefresh={handleReplaceSource}
            onReset={handleResetProgress}
          />
        </section>
      </section>

      <TypingReportModal
        isFinished={isFinished}
        reportDismissed={reportDismissed}
        onDismiss={() => setReportDismissed(true)}
        showPassFail={showPassFail}
        isPass={isPass}
        passTone={passTone}
        passCardTone={passCardTone}
        passAccuracyThreshold={passAccuracyThreshold}
        passAccuracyMet={passAccuracyMet}
        passStrokeWiseMet={passStrokeWiseMet}
        requiredStrokeWords={requiredStrokeWords}
        accuracy={accuracy}
        strokeWiseCorrectWords={strokeWiseCorrectWords}
        strokeWiseCorrectWordsWithSpaces={strokeWiseCorrectWordsWithSpaces}
        effectiveCorrectStrokes={effectiveCorrectStrokes}
        correctStrokesWithSpaces={correctStrokesWithSpaces}
        isUnlimited={isUnlimited}
        customElapsedSeconds={customElapsedSeconds}
        durationSeconds={durationSeconds}
        wpm={wpm}
        totalTypedWords={totalTypedWords}
        finalWordEvaluation={finalWordEvaluation}
        timingSummary={timingSummary}
        timingChart={timingChart}
        chartZoom={chartZoom}
        onChartZoomChange={setChartZoom}
        hoveredWordIndex={hoveredWordIndex}
        onHoveredWordIndexChange={setHoveredWordIndex}
        wordTimings={wordTimings}
        getTimingDisplayWord={getTimingDisplayWord}
        typedWordReport={typedWordReport}
        typingFontClassName={typingFontClassName}
        timingWordFontClass={timingWordFontClass}
        onTryAgain={handleReplaceSource}
      />
    </TypingTestShell>
  );
}
