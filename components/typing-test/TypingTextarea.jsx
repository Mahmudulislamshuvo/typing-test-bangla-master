/**
 * IME-safe uncontrolled textarea.
 *
 * IMPORTANT: This textarea MUST remain browser-managed (uncontrolled).
 * Using `value={...}` (controlled) breaks Bijoy Bayanno and other Bengali
 * Unicode keyboards that construct reph/conjuncts over several native input
 * events. A controlled value may overwrite an intermediate character (for
 * example, the ম in ধর্মীয়) before the cluster is complete.
 *
 * State still mirrors the text for scoring; the `useImeSafeTextarea` hook
 * only syncs the native textarea value on deliberate external resets.
 */
export default function TypingTextarea({
  textareaRef,
  handleChange,
  handleCompositionStart,
  handleCompositionEnd,
  handleKeyDown,
  disabled,
  placeholder,
  rows = 8,
  className = "",
}) {
  return (
    <textarea
      ref={textareaRef}
      defaultValue=""
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
      className={`w-full resize-none rounded-2xl border border-cyan-100/20 bg-slate-950/55 p-4 text-xl leading-8 text-white outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-300/30 sm:text-2xl ${className}`}
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
    />
  );
}