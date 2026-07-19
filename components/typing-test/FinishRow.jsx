function FinishRow({ label, value, variant }) {
  const styles = {
    words: {
      row: "rounded-xl bg-amber-500/10 px-3 py-2 border border-amber-400/20",
      label: "text-sm font-medium text-amber-100/80",
      value: "text-xl font-extrabold text-amber-300",
    },
    chars: {
      row: "rounded-xl bg-violet-500/10 px-3 py-2 border border-violet-400/20",
      label: "text-sm font-medium text-violet-100/80",
      value: "text-xl font-extrabold text-violet-300",
    },
    accuracy: {
      row: "rounded-xl bg-cyan-500/10 px-3 py-2 border border-cyan-400/20",
      label: "text-sm font-medium text-cyan-100/80",
      value: "text-xl font-extrabold text-cyan-300",
    },
    default: {
      row: "px-1 py-1.5",
      label: "text-sm text-emerald-50/80",
      value: "text-xl font-extrabold text-amber-200",
    },
  };
  const s = styles[variant] || styles.default;
  return (
    <div className={`flex items-center justify-between gap-3 ${s.row}`}>
      <span className={s.label}>{label}</span>
      <span className={s.value}>{value}</span>
    </div>
  );
}

export default FinishRow;