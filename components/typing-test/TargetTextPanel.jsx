import { useRef, useState, useLayoutEffect } from "react";

export default function TargetTextPanel({
  displayMode,
  isLoadingSource,
  loadError,
  passageWordWindow,
  tickerWindow,
  activeWordIndex,
  wordStatuses,
  isFinished,
  suppressTargetHighlights,
  typingFontClassName,
  tickerContainerRef: externalTickerRef,
}) {
  const internalTickerRef = useRef(null);
  const tickerContainerRef = externalTickerRef || internalTickerRef;
  const [tickerOffsetLeft, setTickerOffsetLeft] = useState(0);

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
  }, [activeWordIndex, displayMode, tickerWindow, tickerContainerRef]);

  if (isLoadingSource) {
    return (
      <section
        className={`rounded-2xl border border-white/15 bg-white/90 p-5 sm:p-7 ${typingFontClassName}`}
      >
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-slate-700">
          Target Text
        </h2>
        <p className="text-lg text-slate-700">Loading source...</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section
        className={`rounded-2xl border border-white/15 bg-white/90 p-5 sm:p-7 ${typingFontClassName}`}
      >
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-slate-700">
          Target Text
        </h2>
        <p className="rounded-xl border border-rose-300/50 bg-rose-900/20 p-3 text-sm text-rose-100">
          {loadError}
        </p>
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-white/15 bg-white/90 p-5 sm:p-7 ${typingFontClassName}`}
    >
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.15em] text-slate-700">
        Target Text
      </h2>

      {displayMode === "ticker" ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-8">
          {!suppressTargetHighlights ? (
            <div className="pointer-events-none absolute inset-y-0 left-[38%] w-[2px] bg-amber-400/80" />
          ) : null}
          <div
            ref={tickerContainerRef}
            className="whitespace-nowrap text-2xl font-semibold leading-relaxed text-black transition-transform duration-300 ease-out sm:text-3xl"
            style={{
              transform: `translate3d(calc(38% - ${tickerOffsetLeft}px), 0, 0)`,
            }}
          >
            {tickerWindow.words.map((word, localIndex) => {
              const globalIndex = tickerWindow.start + localIndex;
              let className = "text-black";

              if (
                !suppressTargetHighlights &&
                wordStatuses &&
                globalIndex < wordStatuses.length
              ) {
                className =
                  wordStatuses[globalIndex] === "correct"
                    ? "text-emerald-700"
                    : "text-rose-600";
              }

              if (
                !suppressTargetHighlights &&
                !isFinished &&
                globalIndex === activeWordIndex
              ) {
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
        <p className="leading-relaxed sm:text-lg">
          {passageWordWindow.start > 0 && (
            <span className="text-slate-400">... </span>
          )}
          {passageWordWindow.words.map(({ word, globalIndex, status }) => {
            let className = "text-black";

            if (!suppressTargetHighlights) {
              if (globalIndex < activeWordIndex) {
                className =
                  status === "correct"
                    ? "text-emerald-700"
                    : "text-rose-600";
              } else if (!isFinished && globalIndex === activeWordIndex) {
                className =
                  "rounded bg-amber-300 px-[1px] text-slate-900 shadow-[0_0_0_1px_rgba(251,191,36,0.45)]";
              }
            }

            return (
              <span
                key={`${word}-${globalIndex}`}
                className={`${className} mr-[0.35em] inline-block`}
              >
                {word}
              </span>
            );
          })}
        </p>
      )}
    </section>
  );
}