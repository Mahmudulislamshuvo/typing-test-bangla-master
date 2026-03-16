"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ReportsPage() {
  const [groupedReports, setGroupedReports] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const grouped = data.data.reduce((acc, report) => {
            if (!acc[report.deviceName]) acc[report.deviceName] = [];
            acc[report.deviceName].push(report);
            return acc;
          }, {});
          setGroupedReports(grouped);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-emerald-400">
        Loading reports...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-200">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Typing Reports</h1>
          <Link
            href="/"
            className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500"
          >
            Back to Test
          </Link>
        </header>

        {Object.keys(groupedReports).length === 0 ? (
          <p className="text-center text-gray-500">No reports found.</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedReports).map(([deviceName, reports]) => (
              <div
                key={deviceName}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <h2 className="mb-4 text-xl font-bold text-emerald-400">
                  {deviceName}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-white/5 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Language</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3">WPM</th>
                        <th className="px-4 py-3">Accuracy</th>
                        <th className="px-4 py-3">Correct Strokes</th>
                        <th className="px-4 py-3">Words (Corr/Tot)</th>
                        <th className="px-4 py-3">Stroke Wise Words (BN)</th>
                        <th className="px-4 py-3">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {reports.map((report) => (
                        <tr key={report._id} className="hover:bg-white/5">
                          <td className="px-4 py-3">
                            {new Date(report.date).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 uppercase">
                            {report.language}
                          </td>
                          <td className="px-4 py-3 capitalize">
                            {report.mode}
                          </td>
                          <td className="px-4 py-3 font-bold text-amber-300">
                            {report.wpm}
                          </td>
                          <td className="px-4 py-3 text-cyan-300">
                            {report.accuracy}%
                          </td>
                          <td className="px-4 py-3 text-emerald-300">
                            {report.correctStrokes || "-"}
                          </td>
                          <td className="px-4 py-3">
                            {report.correctWords !== undefined
                              ? `${report.correctWords} / ${report.totalWords}`
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-teal-300">
                            {report.strokeWiseCorrectWords || "-"}
                          </td>
                          <td className="px-4 py-3">{report.duration} min</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
