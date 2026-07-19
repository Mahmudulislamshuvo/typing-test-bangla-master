export default function StatCard({ label, value }) {
  return (
    <article className="rounded-2xl border border-white/20 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-cyan-100/80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
        {value}
      </p>
    </article>
  );
}