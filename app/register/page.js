import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[color:var(--auth-bg)] text-slate-100">
      <div className="pointer-events-none absolute -top-24 left-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-12 lg:flex-row lg:items-center">
        <section className="flex-1">
          <p className="text-xs uppercase tracking-[0.4em] text-emerald-300">
            Typing Mastering
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Build a new typing routine in minutes.
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            Create your account to save reports, track accuracy, and unlock
            curated practice packs.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Personalized language profiles
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Focus timers and live analytics
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Exportable progress reports
            </div>
          </div>
        </section>

        <section className="w-full max-w-lg rounded-3xl border border-[color:var(--auth-stroke)] bg-[color:var(--auth-card)] p-8 shadow-[0_25px_80px_rgba(15,23,42,0.55)]">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Create account</h2>
            <span className="rounded-full border border-emerald-400/40 px-3 py-1 text-xs uppercase tracking-widest text-emerald-200">
              New
            </span>
          </div>

          <form className="mt-6 space-y-5">
            <label className="block text-sm text-slate-300" htmlFor="register-name">
              Full name
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                required
              />
            </label>

            <label className="block text-sm text-slate-300" htmlFor="register-email">
              Email address
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                required
              />
            </label>

            <label
              className="block text-sm text-slate-300"
              htmlFor="register-password"
            >
              Password
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a password"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                required
              />
            </label>

            <label
              className="block text-sm text-slate-300"
              htmlFor="register-confirm"
            >
              Confirm password
              <input
                id="register-confirm"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter password"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                required
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300"
            >
              Create account
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-300">
            Already have an account?{" "}
            <Link
              className="text-emerald-300 transition hover:text-emerald-200"
              href="/login"
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
