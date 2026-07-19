/**
 * Shared page shell — background, decorative blurs, and max-width container.
 */
export default function TypingTestShell({ children }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_10%,#0f766e_0%,#052e2b_35%,#041b19_100%)] px-4 py-10 text-slate-100 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute -left-20 top-8 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />
      {children}
    </main>
  );
}