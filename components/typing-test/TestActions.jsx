export default function TestActions({
  refreshLabel,
  onRefresh,
  onReset,
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-xl bg-gradient-to-r from-amber-300 to-orange-300 px-5 py-2.5 text-sm font-extrabold text-slate-900 transition hover:brightness-105"
      >
        {refreshLabel}
      </button>

      <button
        type="button"
        onClick={onReset}
        className="rounded-xl border border-emerald-100/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-white/20"
      >
        Reset Progress
      </button>
    </div>
  );
}