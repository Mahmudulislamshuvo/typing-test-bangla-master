import { useState } from "react";
import FinishRow from "./FinishRow";
import WordTimingChart from "./WordTimingChart";
import { formatDuration } from "./constants";

export default function TypingReportModal({
  isFinished,
  reportDismissed,
  onDismiss,
  showPassFail,
  isPass,
  passTone,
  passCardTone,
  passAccuracyThreshold,
  passAccuracyMet,
  passStrokeWiseMet,
  requiredStrokeWords,
  accuracy,
  strokeWiseCorrectWords,
  strokeWiseCorrectWordsWithSpaces,
  effectiveCorrectStrokes,
  correctStrokesWithSpaces,
  isUnlimited,
  customElapsedSeconds,
  durationSeconds,
  wpm,
  totalTypedWords,
  finalWordEvaluation,
  timingSummary,
  timingChart,
  chartZoom,
  onChartZoomChange,
  hoveredWordIndex,
  onHoveredWordIndexChange,
  wordTimings,
  getTimingDisplayWord,
  typedWordReport,
  typingFontClassName,
  timingWordFontClass,
  onTryAgain,
}) {
  if (!isFinished || reportDismissed) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-3xl border border-white/25 bg-[linear-gradient(145deg,#082f2d,#134e4a)] p-6 pr-4 text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] sm:p-8 sm:pr-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
              Session Complete
            </p>
            <h3 className="mt-2 text-3xl font-extrabold">
              Detailed Report
            </h3>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close report"
            className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-slate-300 transition hover:bg-white/20 hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {showPassFail ? (
          <div className={`mt-4 rounded-2xl border p-4 ${passCardTone}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-200/70">
                  Result
                </p>
                <p className={`mt-1 text-2xl font-extrabold ${passTone}`}>
                  {isPass ? "Pass" : "Fail"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-200/80">
                <span
                  className={
                    passAccuracyMet ? "text-emerald-200" : "text-rose-200"
                  }
                >
                  Accuracy {passAccuracyThreshold}%+ ({accuracy}%)
                </span>
                <span
                  className={
                    passStrokeWiseMet ? "text-emerald-200" : "text-rose-200"
                  }
                >
                  Stroke-wise {requiredStrokeWords}+ (
                  {strokeWiseCorrectWords ?? 0})
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-2 rounded-2xl bg-black/20 p-4">
          <FinishRow
            label="Stroke Wise Correct Word"
            value={String(strokeWiseCorrectWords ?? 0)}
            variant="words"
          />
          <FinishRow
            label="Stroke Wise Correct Words (With Spaces)"
            value={String(strokeWiseCorrectWordsWithSpaces ?? 0)}
            variant="words"
          />
          <div className="my-1 border-t border-white/10" />
          <FinishRow
            label="Stroke Wise Correct Character"
            value={String(effectiveCorrectStrokes ?? 0)}
            variant="chars"
          />
          <FinishRow
            label="Stroke Wise Correct Character (With Spaces)"
            value={String(correctStrokesWithSpaces ?? 0)}
            variant="chars"
          />
          <div className="my-1 border-t border-white/10" />
          <FinishRow
            label="Total Time"
            value={
              isUnlimited
                ? formatDuration(customElapsedSeconds)
                : formatDuration(durationSeconds)
            }
          />
          <FinishRow label="Final WPM (Per Minute)" value={String(wpm)} />
          <FinishRow
            label="Total Typed Words"
            value={String(totalTypedWords)}
          />
          <div className="my-1 border-t border-white/10" />
          <FinishRow
            label="Final Accuracy"
            value={`${accuracy}%`}
            variant="accuracy"
          />
          <FinishRow
            label="Correct Words"
            value={String(finalWordEvaluation.correctWords)}
          />
          <FinishRow
            label="Incorrect Words"
            value={String(finalWordEvaluation.incorrectWords)}
          />
        </div>

        <WordTimingChart
          timingSummary={timingSummary}
          timingChart={timingChart}
          chartZoom={chartZoom}
          onChartZoomChange={onChartZoomChange}
          hoveredWordIndex={hoveredWordIndex}
          onHoveredWordIndexChange={onHoveredWordIndexChange}
          finalWordEvaluation={finalWordEvaluation}
          wordTimings={wordTimings}
          getTimingDisplayWord={getTimingDisplayWord}
          timingWordFontClass={timingWordFontClass}
        />

        <section className="mt-5 rounded-2xl border border-white/20 bg-black/25 p-4">
          <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-cyan-100">
            Visual Typing Report
          </h4>
          <p
            className={`mt-3 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-950/45 p-3 text-sm leading-7 sm:text-base ${
              typingFontClassName
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
          onClick={onTryAgain}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-300 to-orange-300 px-5 py-3 text-sm font-extrabold text-slate-900 transition hover:brightness-105"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}