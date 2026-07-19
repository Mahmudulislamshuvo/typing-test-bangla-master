import { DURATION_OPTIONS, DISPLAY_MODES } from "./constants";

export default function TestControls({
  language,
  onLanguageChange,
  durationMin,
  onDurationChange,
  displayMode,
  onDisplayModeChange,
  languageOptions,
  durationOptions,
}) {
  const resolvedDurationOptions = durationOptions || DURATION_OPTIONS;

  return (
    <div className="grid w-full gap-3 sm:max-w-xl sm:grid-cols-3">
      <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50">
        Language
        <select
          value={language}
          onChange={(event) => onLanguageChange(event.target.value)}
          className="rounded-xl border border-emerald-100/30 bg-slate-950/45 px-4 py-3 text-sm font-semibold text-white outline-none ring-0 transition focus:border-amber-300"
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50">
        Duration
        <select
          value={durationMin}
          onChange={(event) => onDurationChange(Number(event.target.value))}
          className="rounded-xl border border-emerald-100/30 bg-slate-950/45 px-4 py-3 text-sm font-semibold text-white outline-none ring-0 transition focus:border-amber-300"
        >
          {resolvedDurationOptions.map((option) => {
            const isUnlimitedOption = option === 0;
            const label = isUnlimitedOption
              ? "Unlimited"
              : `${option} min`;
            const key = isUnlimitedOption ? "unlimited" : String(option);

            return (
              <option key={key} value={option}>
                {label}
              </option>
            );
          })}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-sm font-semibold text-emerald-50">
        Display
        <select
          value={displayMode}
          onChange={(event) => onDisplayModeChange(event.target.value)}
          className="rounded-xl border border-emerald-100/30 bg-slate-950/45 px-4 py-3 text-sm font-semibold text-white outline-none ring-0 transition focus:border-amber-300"
        >
          {DISPLAY_MODES.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}