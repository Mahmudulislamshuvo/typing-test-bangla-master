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

          <button
            type="button"
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-emerald-400/50 hover:bg-slate-900"
          >
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.73 1.23 9.24 3.24l6.9-6.9C35.9 1.77 30.28-.5 24-.5 14.6-.5 6.51 4.9 2.63 12.85l8.04 6.24C12.73 13.2 17.95 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.5 24.5c0-1.62-.15-3.18-.42-4.7H24v9.4h12.7c-.55 2.97-2.2 5.48-4.7 7.18l7.2 5.57c4.2-3.88 6.6-9.6 6.6-17.45z"
              />
              <path
                fill="#FBBC05"
                d="M10.67 28.33a14.5 14.5 0 0 1-.76-4.33c0-1.5.26-2.95.76-4.33l-8.04-6.24A23.98 23.98 0 0 0 .5 24c0 3.9.94 7.58 2.63 10.85l8.04-6.52z"
              />
              <path
                fill="#34A853"
                d="M24 47.5c6.28 0 11.57-2.07 15.43-5.63l-7.2-5.57c-2 1.35-4.55 2.15-8.23 2.15-6.05 0-11.27-3.7-13.33-8.86l-8.04 6.52C6.51 43.1 14.6 47.5 24 47.5z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
            <span className="h-px flex-1 bg-slate-700/70" />
            or
            <span className="h-px flex-1 bg-slate-700/70" />
          </div>

          <form className="space-y-5">
            <label
              className="block text-sm text-slate-300"
              htmlFor="register-name"
            >
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

            <label
              className="block text-sm text-slate-300"
              htmlFor="register-email"
            >
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
