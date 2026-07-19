import StatCard from "./StatCard";

export default function TestStats({
  timeLabel,
  wpm,
  accuracy,
  correctWords,
  incorrectWords,
  hideAccuracyStats,
}) {
  return (
    <div
      className={`mb-6 grid grid-cols-2 gap-3 ${
        hideAccuracyStats ? "lg:grid-cols-2" : "lg:grid-cols-5"
      }`}
    >
      <StatCard label={hideAccuracyStats ? "Duration" : "Time Left"} value={timeLabel} />
      <StatCard label="WPM" value={String(wpm)} />
      {!hideAccuracyStats ? (
        <>
          <StatCard label="Accuracy" value={`${accuracy}%`} />
          <StatCard label="Correct Words" value={String(correctWords)} />
          <StatCard label="Incorrect Words" value={String(incorrectWords)} />
        </>
      ) : null}
    </div>
  );
}