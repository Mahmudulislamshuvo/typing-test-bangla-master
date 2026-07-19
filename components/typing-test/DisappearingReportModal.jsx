import FinishRow from "./FinishRow";

export default function DisappearingReportModal({
  isFinished,
  wpm,
  accuracy,
  language,
  finalWordEvaluation,
  typedWordReport,
  typingFontClassName,
  onTryAgain,
}) {
  if (!isFinished) return null;

  return (
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