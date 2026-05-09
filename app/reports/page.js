"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import PusherClient from "pusher-js";
import toast, { Toaster } from "react-hot-toast";
import bnAnsiToUnicode from "bn-ansi-to-unicode";

const PAGE_SIZE = 15;

function mergeReportsById(existing, incoming) {
  const existingIds = new Set(existing.map((report) => report._id));
  const filtered = incoming.filter((report) => !existingIds.has(report._id));
  return [...existing, ...filtered];
}

function formatDurationSeconds(seconds) {
  if (!Number.isFinite(seconds)) return "-";
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(
    2,
    "0",
  )}`;
}

export default function ReportsPage() {
  const [groupedReports, setGroupedReports] = useState({});
  const [deviceTotals, setDeviceTotals] = useState({});
  const [deviceLoading, setDeviceLoading] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedDevices, setExpandedDevices] = useState({});
  const [showGraphs, setShowGraphs] = useState(false);
  const [expandedGraphs, setExpandedGraphs] = useState({});

  useEffect(() => {
    let isMounted = true;

    const fetchReports = async () => {
      try {
        const res = await fetch(
          `/api/reports?limit=${PAGE_SIZE}&t=${Date.now()}`,
        );
        const data = await res.json();
        if (!isMounted) return;
        if (data.success) {
          const grouped = {};
          const totals = {};
          (data.data || []).forEach((entry) => {
            if (!entry?.deviceName) return;
            grouped[entry.deviceName] = Array.isArray(entry.items)
              ? entry.items
              : [];
            totals[entry.deviceName] = Number.isFinite(entry.total)
              ? entry.total
              : grouped[entry.deviceName].length;
          });
          setGroupedReports(grouped);
          setDeviceTotals(totals);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error(error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchReports();

    let pusher = null;
    if (process.env.NEXT_PUBLIC_PUSHER_KEY) {
      // Enable pusher logging for debugging explicitly outside production
      PusherClient.logToConsole = process.env.NODE_ENV !== "production";

      pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      });

      const channel = pusher.subscribe("reports-channel");
      channel.bind("new-report", (newReport) => {
        toast.success(`নতুন রেজাল্ট যুক্ত হয়েছে: ${newReport.deviceName}`, {
          duration: 4000,
          position: "top-right",
          style: {
            background: "#1e293b",
            color: "#34d399",
            border: "1px solid #0f766e",
          },
        });

        setGroupedReports((prev) => {
          const updated = { ...prev };
          if (!updated[newReport.deviceName]) {
            updated[newReport.deviceName] = [];
          }
          // Prepend the new report
          updated[newReport.deviceName] = [
            newReport,
            ...updated[newReport.deviceName],
          ];
          return updated;
        });

        setDeviceTotals((prev) => ({
          ...prev,
          [newReport.deviceName]: (prev[newReport.deviceName] || 0) + 1,
        }));
      });
    }

    return () => {
      isMounted = false;
      if (pusher) {
        pusher.unsubscribe("reports-channel");
        pusher.disconnect();
      }
    };
  }, []);

  const toggleDevice = (deviceName) => {
    setExpandedDevices((prev) => ({
      ...prev,
      [deviceName]: !prev[deviceName],
    }));
  };

  const toggleGraph = (reportId) => {
    setExpandedGraphs((prev) => ({
      ...prev,
      [reportId]: !prev[reportId],
    }));
  };

  const loadMoreForDevice = async (deviceName) => {
    if (deviceLoading[deviceName]) return;

    const currentCount = groupedReports[deviceName]?.length || 0;
    const total = deviceTotals[deviceName] ?? currentCount;

    setExpandedDevices((prev) => ({
      ...prev,
      [deviceName]: true,
    }));

    if (currentCount >= total) return;

    setDeviceLoading((prev) => ({
      ...prev,
      [deviceName]: true,
    }));

    try {
      const res = await fetch(
        `/api/reports?deviceName=${encodeURIComponent(
          deviceName,
        )}&skip=${currentCount}&limit=${PAGE_SIZE}&t=${Date.now()}`,
      );
      const data = await res.json();
      if (!data.success) return;

      const incoming = Array.isArray(data.data) ? data.data : [];
      setGroupedReports((prev) => {
        const existing = prev[deviceName] || [];
        return {
          ...prev,
          [deviceName]: mergeReportsById(existing, incoming),
        };
      });

      if (Number.isFinite(data.total)) {
        setDeviceTotals((prev) => ({
          ...prev,
          [deviceName]: data.total,
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setDeviceLoading((prev) => ({
        ...prev,
        [deviceName]: false,
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-emerald-400">
        Loading reports...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-200">
      <Toaster />
      <div className="w-full max-w-[1600px] mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Typing Reports</h1>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-emerald-200">
              <span>Show Graphs</span>
              <button
                type="button"
                onClick={() => setShowGraphs((prev) => !prev)}
                className={`relative h-6 w-11 rounded-full transition ${
                  showGraphs ? "bg-emerald-500" : "bg-slate-700"
                }`}
                aria-pressed={showGraphs}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                    showGraphs ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </label>
            <Link
              href="/"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500"
            >
              Back to Test
            </Link>
          </div>
        </header>

        {Object.keys(groupedReports).length === 0 ? (
          <p className="text-center text-gray-500">No reports found.</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedReports).map(([deviceName, reports]) => {
              const isExpanded = expandedDevices[deviceName];
              const totalForDevice = deviceTotals[deviceName] ?? reports.length;
              const displayedReports = isExpanded
                ? reports
                : reports.slice(0, PAGE_SIZE);
              const hasMore = reports.length < totalForDevice;
              const showActions = reports.length > PAGE_SIZE || hasMore;

              return (
                <div
                  key={deviceName}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <h2 className="mb-4 text-xl font-bold text-emerald-400">
                    {deviceName}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full text-left text-xs text-slate-300">
                      <thead className="bg-white/5 text-[11px] uppercase text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Lang</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Result</th>
                          <th className="px-3 py-2">Mode</th>
                          <th className="px-3 py-2">WPM</th>
                          <th className="px-3 py-2">Acc.</th>
                          <th className="px-3 py-2">Cor. Strokes</th>
                          <th className="px-3 py-2">Words (C/T)</th>
                          <th className="px-3 py-2">SW Char</th>
                          <th className="px-3 py-2">SW Char<br/>(+Spaces)</th>
                          <th className="px-3 py-2">Duration</th>
                          <th className="px-3 py-2 text-center">Graph</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {displayedReports.map((report) => {
                          const isGraphVisible =
                            showGraphs || expandedGraphs[report._id];

                          return (
                            <Fragment key={report._id}>
                              <tr className="hover:bg-white/5">
                                <td className="px-3 py-1.5 leading-tight whitespace-nowrap">
                                  {new Date(report.date).toLocaleDateString()}<br/>
                                  <span className="text-slate-400">{new Date(report.date).toLocaleTimeString()}</span>
                                </td>
                                <td className="px-3 py-1.5 uppercase">
                                  {report.language}
                                </td>
                                <td className="px-3 py-1.5 font-semibold text-emerald-200">
                                  {report.testType || "Standard"}
                                </td>
                                <td className="px-3 py-1.5">
                                  <span
                                    className={`inline-flex min-w-[52px] justify-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-tight ${
                                      report.result === "Pass"
                                        ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-200"
                                        : report.result === "Fail"
                                          ? "border-rose-300/40 bg-rose-500/15 text-rose-200"
                                          : "border-slate-300/30 bg-white/5 text-slate-300"
                                    }`}
                                  >
                                    {report.result || "-"}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 capitalize">
                                  {report.mode}
                                </td>
                                <td className="px-3 py-1.5 font-bold text-amber-300">
                                  {report.wpm}
                                </td>
                                <td className="px-3 py-1.5 text-cyan-300">
                                  {report.accuracy}%
                                </td>
                                <td className="px-3 py-1.5 text-emerald-300">
                                  {report.correctStrokes || "-"}
                                </td>
                                <td className="px-3 py-1.5">
                                  {report.correctWords !== undefined
                                    ? `${report.correctWords} / ${report.totalWords}`
                                    : "-"}
                                </td>
                                <td className="px-3 py-1.5 text-teal-300">
                                  {report.strokeWiseCorrectCharacters ?? report.strokeWiseCorrectWords ?? "-"}
                                </td>
                                <td className="px-3 py-1.5 text-teal-300">
                                  {report.strokeWiseCorrectWordsWithSpaces ??
                                    (report.strokeWiseCorrectCharactersWithSpaces != null
                                      ? Math.round(report.strokeWiseCorrectCharactersWithSpaces / 5)
                                      : "-")}
                                </td>
                                <td className="px-3 py-1.5">
                                  {report.duration === 0
                                    ? Number.isFinite(report.durationSeconds)
                                      ? `Unlim. ${formatDurationSeconds(
                                          report.durationSeconds,
                                        )}`
                                      : "Unlimited"
                                    : `${report.duration} min`}
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  <button
                                    onClick={() => toggleGraph(report._id)}
                                    className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-emerald-400 transition hover:bg-white/20 hover:text-emerald-300"
                                  >
                                    {isGraphVisible ? "Hide" : "Show"}
                                  </button>
                                </td>
                              </tr>
                              {isGraphVisible && (
                                <tr className="bg-black/20">
                                  <td
                                    className="px-4 py-4"
                                    colSpan={13}
                                    style={{ maxWidth: "1px" }}
                                  >
                                    <ReportTimingChart report={report} />
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {showActions && (
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                      {!isExpanded && (
                        <button
                          onClick={() => loadMoreForDevice(deviceName)}
                          disabled={deviceLoading[deviceName]}
                          className="rounded bg-white/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-white/20 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deviceLoading[deviceName]
                            ? "Loading..."
                            : hasMore
                              ? "Show More"
                              : "Show All"}
                        </button>
                      )}

                      {isExpanded && hasMore && (
                        <button
                          onClick={() => loadMoreForDevice(deviceName)}
                          disabled={deviceLoading[deviceName]}
                          className="rounded bg-white/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-white/20 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deviceLoading[deviceName]
                            ? "Loading..."
                            : "Load 15 More"}
                        </button>
                      )}

                      {isExpanded && reports.length > PAGE_SIZE && (
                        <button
                          onClick={() => toggleDevice(deviceName)}
                          className="rounded bg-white/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-white/20 hover:text-emerald-300"
                        >
                          Show Less
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function containsBengaliChars(text) {
  return /[\u0980-\u09FF]/.test(text || "");
}

function toUnicodeDisplayWord(word, isClassicReport) {
  if (!word) return "";
  if (!isClassicReport) return word;
  if (containsBengaliChars(word)) return word;
  return bnAnsiToUnicode(word);
}

function inferClassicReport(report) {
  if (report?.inputMode === "bijoy-classic") return true;
  if (report?.language !== "bn") return false;
  const timings = Array.isArray(report?.wordTimings) ? report.wordTimings : [];
  const sample = timings.find(
    (entry) => typeof entry?.word === "string" && entry.word.trim(),
  );
  if (!sample) return false;
  return !containsBengaliChars(sample.word);
}

function ReportTimingChart({ report }) {
  const [zoom, setZoom] = useState(1);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const timings = Array.isArray(report.wordTimings) ? report.wordTimings : [];
  if (!timings.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
        No timing data saved for this report.
      </div>
    );
  }

  const wpmValues = timings.map((entry) => entry.wpm || 0);
  const maxWpm = Math.max(...wpmValues, 0);
  const minWpm = Math.min(...wpmValues, 0);
  const range = maxWpm - minWpm || 1;
  const isBangla = report.language === "bn";
  const isClassicReport = inferClassicReport(report);
  const wordFontClass = isClassicReport
    ? "font-bijoy-classic"
    : isBangla
      ? "[font-family:var(--font-bengali)]"
      : "";
  const sortedTimings = [...timings]
    .map((entry, index) => ({ ...entry, _index: index }))
    .sort((a, b) => {
      const diff = (a.wpm || 0) - (b.wpm || 0);
      return diff !== 0 ? diff : a._index - b._index;
    });

  const baseViewWidth = 640;
  const viewHeight = 280;
  const padding = { left: 40, right: 16, top: 100, bottom: 30 };
  const baseChartWidth = baseViewWidth - padding.left - padding.right;
  const chartWidth = baseChartWidth * zoom;
  const viewWidth = padding.left + padding.right + chartWidth;
  const chartHeight = viewHeight - padding.top - padding.bottom;

  const points = wpmValues.map((value, index) => {
    const x =
      padding.left + (index / Math.max(wpmValues.length - 1, 1)) * chartWidth;
    const normalized = (value - minWpm) / range;
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
  ).toFixed(1)} L ${padding.left} ${(padding.top + chartHeight).toFixed(1)} Z`;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <span>Per-word WPM timeline</span>
        <div className="flex items-center gap-2">
          <span>{timings.length} points</span>
          <label className="flex items-center gap-2">
            Zoom
            <input
              type="range"
              min="1"
              max="4"
              step="0.25"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-1 w-24 cursor-pointer accent-emerald-300"
            />
          </label>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-visible">
        <div className="relative" style={{ width: `${viewWidth}px` }}>
          <svg
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            className="h-auto max-h-[350px]"
            style={{ width: `${viewWidth}px` }}
          >
            <defs>
              <linearGradient
                id={`report-line-${report._id}`}
                x1="0"
                y1="1"
                x2="0"
                y2="0"
              >
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
              <linearGradient
                id={`report-area-${report._id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g opacity="0.3" stroke="#38bdf8" strokeWidth="1">
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                const y =
                  padding.top +
                  tick * (viewHeight - padding.top - padding.bottom);
                return (
                  <line
                    key={`grid-${report._id}-${tick}`}
                    x1={padding.left}
                    x2={viewWidth - padding.right}
                    y1={y}
                    y2={y}
                  />
                );
              })}
            </g>
            <path d={areaPath} fill={`url(#report-area-${report._id})`} />
            <path
              d={path}
              fill="none"
              stroke={`url(#report-line-${report._id})`}
              strokeWidth="2"
            />
            {points.map((point, index) => {
              const wpmValue = wpmValues[index] ?? 0;
              const threshold = 20;
              let red = 220;
              let green = 38;
              let blue = 38;
              if (wpmValue >= threshold) {
                const zoomRange = Math.max(1, maxWpm - threshold);
                const intensity = Math.max(
                  0,
                  Math.min(1, (wpmValue - threshold) / zoomRange),
                );
                const low = { r: 34, g: 197, b: 94 };
                const high = { r: 16, g: 120, b: 57 };
                red = Math.round(low.r + (high.r - low.r) * intensity);
                green = Math.round(low.g + (high.g - low.g) * intensity);
                blue = Math.round(low.b + (high.b - low.b) * intensity);
              } else {
                const intensity = Math.max(
                  0,
                  Math.min(1, wpmValue / threshold),
                );
                const low = { r: 220, g: 38, b: 38 };
                const high = { r: 248, g: 113, b: 113 };
                red = Math.round(low.r + (high.r - low.r) * intensity);
                green = Math.round(low.g + (high.g - low.g) * intensity);
                blue = Math.round(low.b + (high.b - low.b) * intensity);
              }
              return (
                <circle
                  key={`pt-${report._id}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r={hoveredIndex === index ? 8 : wpmValue < threshold ? 6 : 5}
                  fill={`rgb(${red}, ${green}, ${blue})`}
                  opacity={hoveredIndex === index ? 1 : 0.85}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {hoveredIndex !== null && points[hoveredIndex] && (
            <div
              className="pointer-events-none absolute z-50 min-w-[150px] rounded-lg border border-white/20 bg-slate-900/95 px-3 py-2 text-xs text-slate-100 shadow-xl"
              style={{
                left: `${points[hoveredIndex].x}px`,
                top: `${points[hoveredIndex].y}px`,
                transform: `translate(${hoveredIndex > points.length * 0.7 ? "-90%" : hoveredIndex < points.length * 0.3 ? "-10%" : "-50%"}, ${points[hoveredIndex].y < 180 ? "15%" : "-110%"})`,
              }}
            >
              {(() => {
                const rawWord = timings[hoveredIndex]?.word || "";
                const displayWord =
                  timings[hoveredIndex]?.wordUnicode ||
                  toUnicodeDisplayWord(rawWord, isClassicReport) ||
                  "-";
                const displayFontClass =
                  timings[hoveredIndex]?.wordUnicode ||
                  (isClassicReport && rawWord && !containsBengaliChars(rawWord))
                    ? "[font-family:var(--font-bengali)]"
                    : wordFontClass;
                return (
                  <div
                    className={`font-semibold text-amber-200 ${displayFontClass}`}
                  >
                    {displayWord}
                  </div>
                );
              })()}
              <div className="text-slate-200/70">Index: {hoveredIndex + 1}</div>
              <div
                className={
                  timings[hoveredIndex]?.status === "incorrect"
                    ? "text-sm text-rose-200"
                    : timings[hoveredIndex]?.status === "correct"
                      ? "text-sm text-emerald-200"
                      : "text-sm text-slate-200"
                }
              >
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    timings[hoveredIndex]?.status === "incorrect"
                      ? "border-rose-300/40 bg-rose-500/15 text-rose-200"
                      : timings[hoveredIndex]?.status === "correct"
                        ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-200"
                        : "border-slate-300/30 bg-white/5 text-slate-200"
                  }`}
                >
                  {timings[hoveredIndex]?.status === "incorrect"
                    ? "Incorrect"
                    : timings[hoveredIndex]?.status === "correct"
                      ? "Correct"
                      : "-"}
                </span>
              </div>
              <div className="text-cyan-200/90">
                Time:{" "}
                {((timings[hoveredIndex]?.durationMs || 0) / 1000).toFixed(2)}s
              </div>
              <div className="text-slate-200/90">
                Strokes: {timings[hoveredIndex]?.strokeCount ?? "-"}
              </div>
              <div className="text-emerald-200/90">
                Speed: {timings[hoveredIndex]?.wpm ?? 0} WPM
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-3">
        <h4 className="text-sm font-bold uppercase tracking-[0.14em] text-cyan-100">
          {isBangla ? "শব্দভিত্তিক সময়ের রিপোর্ট" : "Word Time Document"}
        </h4>
        <div className="mt-3 max-h-[70vh] overflow-y-auto rounded-xl bg-slate-950/45 p-3">
          <table className="w-full text-left text-sm text-slate-200 relative whitespace-nowrap">
            <thead className="sticky top-0 bg-slate-900 shadow-md">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-300 rounded-tl-lg">
                  #
                </th>
                <th
                  className={`px-4 py-3 font-semibold text-slate-300 ${wordFontClass}`}
                >
                  {isBangla ? "শব্দ" : "Word"}
                </th>
                <th className="px-4 py-3 font-semibold text-slate-300">
                  {isBangla ? "সময় (সেকেন্ড)" : "Time (s)"}
                </th>
                <th className="px-4 py-3 font-semibold text-slate-300">
                  {isBangla ? "স্ট্যাটাস" : "Status"}
                </th>
                <th className="px-4 py-3 font-semibold text-slate-300 rounded-tr-lg">
                  WPM
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedTimings.map((entry, idx) => {
                const wpmVal = entry.wpm || 0;
                const isSlowWpm = wpmVal < 20;
                const timeValue = ((entry.durationMs || 0) / 1000).toFixed(2);
                const highlightClass = isSlowWpm
                  ? "text-rose-400"
                  : "text-emerald-300";
                const rawWord = entry.word || "";
                const displayWord =
                  entry.wordUnicode ||
                  toUnicodeDisplayWord(rawWord, isClassicReport) ||
                  "-";
                const displayFontClass =
                  entry.wordUnicode ||
                  (isClassicReport && rawWord && !containsBengaliChars(rawWord))
                    ? "[font-family:var(--font-bengali)]"
                    : wordFontClass;
                const statusLabel =
                  entry.status === "incorrect"
                    ? "Incorrect"
                    : entry.status === "correct"
                      ? "Correct"
                      : "-";
                const statusBadgeClass =
                  entry.status === "incorrect"
                    ? "border-rose-300/40 bg-rose-500/15 text-rose-200"
                    : entry.status === "correct"
                      ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-200"
                      : "border-slate-300/30 bg-white/5 text-slate-300";

                return (
                  <tr
                    key={`doc-row-${report._id}-${idx}`}
                    className="hover:bg-slate-800/40 transition"
                  >
                    <td className="px-4 py-2 text-slate-400/80">{idx + 1}</td>
                    <td
                      className={`px-4 py-2 font-medium ${highlightClass} ${displayFontClass}`}
                    >
                      {displayWord}
                    </td>
                    <td className={`px-4 py-2 font-mono ${highlightClass}`}>
                      {timeValue}s
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex min-w-[86px] justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${statusBadgeClass}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className={`px-4 py-2 font-mono ${highlightClass}`}>
                      {wpmVal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {timings.length === 0 && (
            <p className="p-4 text-center text-slate-400/80">
              {isBangla ? "কোন ডাটা পাওয়া যায়নি।" : "No data available."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
