"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const DEFAULT_LIMIT = 5;

export default function DeviceSearchPage() {
  const [deviceQuery, setDeviceQuery] = useState("");
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const jsonText = useMemo(() => {
    if (!result) return "";
    return JSON.stringify(result, null, 2);
  }, [result]);

  const handleSearch = async (event) => {
    event.preventDefault();
    setError("");

    const trimmed = deviceQuery.trim();
    if (!trimmed) {
      setError("Device name is required.");
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("device", trimmed);
      params.set("limit", String(limit || DEFAULT_LIMIT));

      const response = await fetch(`/api/device-reports?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data?.error || "Failed to load reports.");
      }

      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err?.message || "Failed to load reports.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!jsonText) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(jsonText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = jsonText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      setError(err?.message || "Copy failed. Please try again.");
    }
  };

  const summaryText = result
    ? `Showing ${result.count} report(s) for "${result.device}"`
    : "No data yet. Search to load JSON.";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b1014] text-slate-100">
      <div className="pointer-events-none absolute -top-56 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.16),transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-[-18rem] right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_70%)]" />
      <div className="pointer-events-none absolute left-[-12rem] top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(14,116,144,0.22),transparent_70%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-300/80">
                Device Report Finder
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                MongoDB device reports, on demand.
              </h1>
            </div>
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/10"
            >
              Back to Test
            </Link>
          </div>
          <p className="max-w-2xl text-sm text-slate-300 [font-family:var(--font-bengali)]">
            ডিভাইসের নাম লিখে সার্চ করুন। চাইলে যতটি লেটেস্ট রিপোর্ট দরকার ততটিই
            পাবেন, তারপর JSON এক ক্লিকে কপি করা যাবে।
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1.2fr]">
          <form
            onSubmit={handleSearch}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.9)]"
          >
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <label
                  htmlFor="device"
                  className="text-xs uppercase tracking-[0.2em] text-emerald-200/80"
                >
                  Device Name
                </label>
                <input
                  id="device"
                  type="text"
                  value={deviceQuery}
                  onChange={(event) => setDeviceQuery(event.target.value)}
                  placeholder="e.g. Pixel 7, iPhone 14, Redmi Note"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white shadow-inner outline-none transition focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="limit"
                  className="text-xs uppercase tracking-[0.2em] text-emerald-200/80"
                >
                  Latest Count
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="limit"
                    type="number"
                    min={1}
                    max={200}
                    value={limit}
                    onChange={(event) =>
                      setLimit(Number.parseInt(event.target.value, 10) || 1)
                    }
                    className="w-28 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white shadow-inner outline-none transition focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20"
                  />
                  <span className="text-sm text-slate-400">
                    Pick how many recent reports to fetch.
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Searching..." : "Search Reports"}
                <span className="text-lg transition group-hover:translate-x-1">
                  →
                </span>
              </button>

              {error ? (
                <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              ) : null}
            </div>
          </form>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.9)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
                  JSON Output
                </p>
                <p className="mt-2 text-sm text-slate-300">{summaryText}</p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!jsonText}
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100 transition hover:border-emerald-400/60 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!jsonText}
              className="mt-4 w-full rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-4 py-4 text-left text-sm text-slate-200 transition hover:border-emerald-300/40 hover:bg-slate-950/80 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Copy JSON output"
            >
              {jsonText ? (
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap">
                  {jsonText}
                </pre>
              ) : (
                <span className="text-slate-500">
                  JSON will appear here. Click to copy anytime.
                </span>
              )}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
