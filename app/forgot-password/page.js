import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[color:var(--auth-bg)] text-slate-100">
      <div className="pointer-events-none absolute -top-24 left-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-10 px-6 py-12">
        <section className="w-full rounded-3xl border border-[color:var(--auth-stroke)] bg-[color:var(--auth-card)] p-8 shadow-[0_25px_80px_rgba(15,23,42,0.55)] sm:p-10">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">
            Reset access
          </p>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">
            Forgot your password?
          </h1>
          <p className="mt-3 text-base text-slate-300">
            Enter the email you used to register. We will send a secure reset
            link to continue.
          </p>

          <form className="mt-6 space-y-5">
            <label className="block text-sm text-slate-300" htmlFor="reset-email">
              Email address
              <input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                required
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300"
            >
              Send reset link
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link
              className="text-emerald-300 transition hover:text-emerald-200"
              href="/login"
            >
              Back to sign in
            </Link>
            <Link
              className="text-slate-300 transition hover:text-slate-100"
              href="/register"
            >
              Create a new account
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
