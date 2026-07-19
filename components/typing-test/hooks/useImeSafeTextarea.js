"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * IME-safe textarea management hook.
 *
 * CRITICAL INVARIANT: The typing textarea MUST remain browser-managed
 * (uncontrolled). Bijoy Bayanno and other Bengali Unicode keyboards
 * construct reph/conjuncts over several native input events. A controlled
 * `value={...}` can overwrite an intermediate character (e.g. the ম in
 * ধর্মীয়) before the cluster is complete.
 *
 * This hook:
 * - Exposes a ref + defaultValue textarea (uncontrolled)
 * - Tracks composition state to avoid double-counting
 * - Syncs native value only on deliberate external resets
 *
 * @param {{ value: string, resetKey: number, onCommittedValue: (value: string) => void }} params
 * @returns {{ textareaRef, handleChange, handleCompositionStart, handleCompositionEnd }}
 */
export default function useImeSafeTextarea({ value, resetKey, onCommittedValue }) {
  const textareaRef = useRef(null);
  const isComposingRef = useRef(false);
  const lastCompositionValueRef = useRef(null);

  // Sync native textarea value only on deliberate external resets
  // (new source/reset progress). `value` also changes after every keystroke,
  // so depending on it here would make the field effectively controlled and
  // interrupt a Unicode keyboard while it is building a conjunct.
  useEffect(() => {
    const input = textareaRef.current;
    if (input && input.value !== value) {
      input.value = value;
    }
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (event) => {
      const rawValue = event.target.value;

      // Do not re-render the controlled value while a Bengali keyboard is still
      // assembling a cluster such as র + ্ + খ. The completed value is committed
      // from handleCompositionEnd instead.
      if (isComposingRef.current) return;

      // Some browsers emit one final input event after compositionend. It
      // contains the value we just committed, so ignore it to avoid counting the
      // same word timing twice.
      if (lastCompositionValueRef.current === rawValue) {
        lastCompositionValueRef.current = null;
        return;
      }
      lastCompositionValueRef.current = null;

      onCommittedValue(rawValue);
    },
    [onCommittedValue],
  );

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
    lastCompositionValueRef.current = null;
  }, []);

  const handleCompositionEnd = useCallback(
    (event) => {
      isComposingRef.current = false;
      const completedValue = event.currentTarget.value;
      lastCompositionValueRef.current = completedValue;
      onCommittedValue(completedValue);
    },
    [onCommittedValue],
  );

  return {
    textareaRef,
    handleChange,
    handleCompositionStart,
    handleCompositionEnd,
  };
}
