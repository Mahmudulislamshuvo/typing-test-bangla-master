export default function WordTimingChart({
  timingSummary,
  timingChart,
  chartZoom,
  onChartZoomChange,
  hoveredWordIndex,
  onHoveredWordIndexChange,
  finalWordEvaluation,
  wordTimings,
  getTimingDisplayWord,
  timingWordFontClass,
}) {
  if (!timingSummary || !timingChart) {
    return (
      <section className="mt-5 rounded-2xl border border-white/20 bg-black/25 p-4">
        <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-cyan-100">
          Typing Speed Timeline
        </h4>
        <p className="mt-3 text-sm text-slate-300">
          Not enough timing data yet.
        </p>
      </section>
    );
  }

  return (
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
            onChange={(event) => onChartZoomChange(Number(event.target.value))}
            className="h-1 w-32 cursor-pointer accent-emerald-300"
          />
        </label>
      </div>
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
                  onMouseEnter={() => onHoveredWordIndexChange(index)}
                  onMouseLeave={() => onHoveredWordIndexChange(null)}
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
                  } ${timingWordFontClass}`}
                >
                  {getTimingDisplayWord(hoveredWordIndex)}
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

      <div className="mt-3 text-base text-slate-200/80 sm:text-lg">
        {(() => {
          const slowEntries = timingSummary.wpmByWord
            .map((wpmValue, index) => ({ wpmValue, index }))
            .filter((entry) => entry.wpmValue < 20);

          if (slowEntries.length === 0) {
            return (
              <span className="text-slate-300">
                No words under 20 WPM.
              </span>
            );
          }

          return (
            <span>
              Words under 20 WPM:{" "}
              {slowEntries.map((entry, index) => {
                const label = getTimingDisplayWord(entry.index);
                const time = (
                  (wordTimings[entry.index]?.durationMs || 0) / 1000
                ).toFixed(2);

                return (
                  <span key={`slow-${entry.index}`}>
                    {index > 0 ? ", " : ""}
                    <span
                      className={`font-semibold text-rose-500 ${timingWordFontClass}`}
                    >
                      {label}
                    </span>{" "}
                    <span className="font-medium text-amber-300">
                      ({time}s)
                    </span>
                  </span>
                );
              })}
            </span>
          );
        })()}
      </div>
    </section>
  );
}