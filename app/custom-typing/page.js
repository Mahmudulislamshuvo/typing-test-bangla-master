"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import TypingTestClient from "@/components/typing-test-client";

export default function CustomTypingPage() {
  const [draftText, setDraftText] = useState("");
  const [activeText, setActiveText] = useState("");
  const [sessionId, setSessionId] = useState(0);
  const [error, setError] = useState("");

  const draftWordCount = useMemo(() => {
    return (draftText.trim().match(/\S+/gu) || []).length;
  }, [draftText]);

  const activeWordCount = useMemo(() => {
    return (activeText.trim().match(/\S+/gu) || []).length;
  }, [activeText]);

  const detectedLanguage = useMemo(() => {
    return /[\u0980-\u09FF]/.test(activeText) ? "bn" : "en";
  }, [activeText]);

  const canStart = draftText.trim().length > 0;
  const statusTone = activeText ? "text-emerald-200" : "text-amber-200";

  const handleStart = () => {
    const trimmed = draftText.trim();
    if (!trimmed) {
      setError("Paste or type your text first.");
      return;
    }

    setError("");
    setActiveText(trimmed);
    setSessionId((prev) => prev + 1);
  };

  const handleClear = () => {
    setDraftText("");
    setActiveText("");
    setError("");
  };

  const statusText = activeText
    ? `Loaded ${activeWordCount} words. Ready to type.`
    : "No custom text loaded yet.";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_10%,#0f766e_0%,#052e2b_35%,#041b19_100%)] text-slate-100">
      <div className="pointer-events-none absolute -left-20 top-8 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-10 px-4 py-12 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-emerald-200/80">
                Custom Typing Studio
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                Bring your own text, keep the same analytics.
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-emerald-50/80">
                Load a passage, then the typing lab appears below. The report
                renders only after you finish the text.
              </p>
            </div>
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/10"
            >
              Back to Test
            </Link>
          </div>

          <section className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">
                Custom Source
              </p>
              <span
                className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold ${statusTone}`}
              >
                {statusText}
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <label
                htmlFor="custom-text"
                className="text-xs uppercase tracking-[0.2em] text-emerald-100/70"
              >
                Your Text
              </label>
              <textarea
                id="custom-text"
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                placeholder="Paste your text here..."
                rows={12}
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base text-white shadow-inner outline-none transition focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/20"
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={!canStart}
                  className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-orange-300 to-emerald-300 px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-amber-400/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Use Text for Typing
                  <span className="text-lg transition group-hover:translate-x-1">
                    -&gt;
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-emerald-50 transition hover:border-emerald-200/50 hover:bg-emerald-500/10"
                >
                  Clear
                </button>
              </div>

              {!canStart ? (
                <p className="text-xs text-amber-200/80">
                  Add text before starting the session.
                </p>
              ) : null}

              {error ? (
                <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-emerald-100/80">
                Draft word count
                <div className="mt-2 text-2xl font-semibold text-white">
                  {draftWordCount}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-emerald-100/80">
                Loaded word count
                <div className="mt-2 text-2xl font-semibold text-white">
                  {activeWordCount}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-emerald-100/80">
                Detected language
                <div className="mt-2 text-2xl font-semibold text-white">
                  {detectedLanguage}
                </div>
              </div>
            </div>

            <p className="mt-5 text-sm text-emerald-50/70">
              Use the Duration control in the typing panel to select time or
              Unlimited.
            </p>
          </section>
        </header>

        <section className="mt-2">
          {activeText ? (
            <TypingTestClient
              key={`custom-${sessionId}`}
              initialLanguage={detectedLanguage}
              initialDuration={1}
              initialWords={[]}
              sourceMode="custom"
              customSourceText={activeText}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-sm text-slate-400">
              Add custom text above to load the typing session.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
