"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Presentational components
import TypingTestShell from "./TypingTestShell";
import TestControls from "./TestControls";
import TestStats from "./TestStats";
import TargetTextPanel from "./TargetTextPanel";
import TypingTextarea from "./TypingTextarea";
import TestActions from "./TestActions";
import DisappearingReportModal from "./DisappearingReportModal";

// Hooks
import useImeSafeTextarea from "./hooks/useImeSafeTextarea";
import useTypingSource from "./hooks/useTypingSource";
import useTypingMetrics from "./hooks/useTypingMetrics";
import useTargetWindow from "./hooks/useTargetWindow";

// Utils
import { LANGUAGE_OPTIONS } from "./constants";
import { normalizeText } from "@/lib/unicode/text-normalizer";
import { buildWordReport } from "@/lib/comparison/word-comparator";
import { splitStrictWords } from "@/lib/typing-utils";

/**
 * Thin Disappearing-Mode Orchestrator.
 *
 * Disappearing mode: words commit/disappear after Space.
 * English backspace is blocked; Bangla backspace is allowed.
 * No word timings, no pass/fail, simpler report.
 */
export default function TypingTestDisappearing({
  initialLanguage,
  initialDuration,
  initialWords,
  initialTotalDocs = 0,
  initialUsedIndex = -1,
}) {
  // ── State ──
  const [language, setLanguage] = useState(initialLanguage);
  const [durationMin, setDurationMin] = useState(initialDuration);
  const [displayMode, setDisplayMode] = useState("passage");

  // Disappearing mode: committed + active input
  const [committedText, setCommittedText] = useState("");
  const [currentInput, setCurrentInput] = useState("");
  const [textareaResetKey, setTextareaResetKey] = useState(0);
  const typedText = committedText + currentInput;

  const [timeLeft, setTimeLeft] = useState(initialDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const locale = language === "bn" ? "bn" : "en";
  const totalSeconds = durationMin * 60;

  // ── IME-safe textarea ──
  const { textareaRef, handleChange, handleCompositionStart, handleCompositionEnd } =
    useImeSafeTextarea({
      value: currentInput,
      resetKey: textareaResetKey,
      onCommittedValue: (val) => {
        if (isFinished || isLoadingSource || loadError) return;
        if (!isRunning && val.trim().length > 0) {
          setIsRunning(true);
        }
        // Auto-commit on Space
        if (val.endsWith(" ")) {
          setCommittedText((prev) => prev + val);
          setCurrentInput("");
        } else {
          setCurrentInput(val);
        }
      },
    });

  // Backspace blocking for English in disappearing mode
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Backspace" && language !== "bn") {
        event.preventDefault();
      }
    },
    [language],
  );

  // ── Typing source ──
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
    isCustomSource: false,
    customSourceText: "",
    isClassicMode: false,
    buildCustomWordsFn: () => [],
  });

  // ── Metrics (disappearing mode is always Unicode, never Classic, never custom) ──
  const {
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
    isBangla: language === "bn",
    isClassicMode: false,
    isCustomSource: false,
    locale,
  });

  // ── Target window ──
  const { passageWordWindow, tickerWindow } = useTargetWindow({
    effectiveTargetWords,
    activeWordIndex,
    liveWordEvaluation,
    suppressTargetHighlights: false,
  });

  // ── Computed stats ──
  const elapsedSeconds = totalSeconds - timeLeft;
  const standardWordsTyped = progress.typedKeystrokes / 5;
  const wpm = elapsedSeconds > 0 ? Math.round(standardWordsTyped / (elapsedSeconds / 60)) : 0;
  const accuracy =
    progress.typedKeystrokes > 0
      ? Number(
          ((wordStats.correctStrokes / progress.typedKeystrokes) * 100).toFixed(1),
        )
      : 100;
  const timeLabel = `${String(Math.floor(timeLeft / 60)).padStart(2, "0")}:${String(
    timeLeft % 60,
  ).padStart(2, "0")}`;

  // ── Timer ──
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

  // ── Source reload effects ──
  const handleReplaceSource = useCallback(() => {
    replaceSource(language, durationMin, {
      onReset: () => {
        setCommittedText("");
        setCurrentInput("");
        setTextareaResetKey((key) => key + 1);
        setIsRunning(false);
        setIsFinished(false);
        setTimeLeft(durationMin * 60);
      },
    });
  }, [durationMin, language, replaceSource, setTimeLeft]);

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
        deviceName = `Device-${Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase()}`;
        localStorage.setItem("typing-test-device-name", deviceName);
      }

      try {
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
    isFinished, wpm, accuracy, language, durationMin, displayMode, finalWordEvaluation,
  ]);

  const typingFontClassName = language === "bn" ? "[font-family:var(--font-bengali)]" : "";
  const inputFontClassName = language === "bn" ? "[font-family:var(--font-bengali)]" : "";
  const typingPlaceholder = language === "bn"
    ? "এখানে টাইপ শুরু করুন (ব্যাকস্পেস নেই)..."
    : "Start typing here (No Backspace)...";

  // ── Render ──
  return (
    <TypingTestShell>
      <section className="relative mx-auto w-full max-w-[1440px] rounded-3xl border border-white/20 bg-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7 lg:p-10">
        <header className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100/75 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              Blind Mode Enabled
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
              Bangla & English Typing Test
            </h1>
            <p className="mt-2 text-sm text-emerald-50/80 sm:text-base">
              No backspace allowed. Words disappear on space.
            </p>
          </div>

          <TestControls
            language={language}
            onLanguageChange={setLanguage}
            durationMin={durationMin}
            onDurationChange={setDurationMin}
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            languageOptions={LANGUAGE_OPTIONS}
          />
        </header>

        <TestStats
          timeLabel={timeLabel}
          wpm={wpm}
          accuracy={accuracy}
          correctWords={wordStats.correctWords}
          incorrectWords={wordStats.incorrectWords}
        />

        <TargetTextPanel
          displayMode={displayMode}
          isLoadingSource={isLoadingSource}
          loadError={loadError}
          passageWordWindow={passageWordWindow}
          tickerWindow={tickerWindow}
          activeWordIndex={activeWordIndex}
          wordStatuses={liveWordEvaluation.wordStatuses}
          isFinished={isFinished}
          suppressTargetHighlights={false}
          typingFontClassName={typingFontClassName}
        />

        <section className="mt-5 rounded-2xl border border-white/15 bg-black/25 p-5 sm:p-7">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-cyan-100">
            Start Typing (Blind Mode)
          </h2>
          <TypingTextarea
            textareaRef={textareaRef}
            handleChange={handleChange}
            handleCompositionStart={handleCompositionStart}
            handleCompositionEnd={handleCompositionEnd}
            handleKeyDown={handleKeyDown}
            disabled={isFinished || isLoadingSource || Boolean(loadError)}
            placeholder={typingPlaceholder}
            rows={2}
            className={inputFontClassName}
          />

          <TestActions
            refreshLabel="New Stream"
            onRefresh={handleReplaceSource}
            onReset={() => {
              setCommittedText("");
              setCurrentInput("");
              setTextareaResetKey((key) => key + 1);
              setIsRunning(false);
              setIsFinished(false);
              setTimeLeft(totalSeconds);
            }}
          />
        </section>
      </section>

      <DisappearingReportModal
        isFinished={isFinished}
        wpm={wpm}
        accuracy={accuracy}
        language={language}
        finalWordEvaluation={finalWordEvaluation}
        typedWordReport={typedWordReport}
        typingFontClassName={typingFontClassName}
        onTryAgain={handleReplaceSource}
      />
    </TypingTestShell>
  );
}
