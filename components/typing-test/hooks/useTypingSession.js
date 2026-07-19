"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook: typing session timer and lifecycle (start, finish, reset).
 *
 * The "unlimited mode auto-finish" effect is intentionally NOT here
 * because it depends on finalTypedWords from useTypingMetrics,
 * creating a hook ordering issue. The orchestrator handles that.
 */
export default function useTypingSession({
  durationMin,
  isCustomSource,
  isUnlimited,
}) {
  const [timeLeft, setTimeLeft] = useState(durationMin * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [customElapsedSeconds, setCustomElapsedSeconds] = useState(0);
  const [reportDismissed, setReportDismissed] = useState(false);

  const totalSeconds = durationMin * 60;

  // Main countdown timer
  useEffect(() => {
    if (!isRunning || isFinished) return undefined;

    if (isCustomSource) {
      const timer = setInterval(() => {
        setCustomElapsedSeconds((prev) => prev + 1);
        if (!isUnlimited) {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setIsRunning(false);
              setIsFinished(true);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);

      return () => clearInterval(timer);
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsRunning(false);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCustomSource, isFinished, isRunning, isUnlimited]);

  const resetSession = useCallback(
    (newTotalSeconds) => {
      setIsRunning(false);
      setIsFinished(false);
      setReportDismissed(false);
      setTimeLeft(newTotalSeconds);
      setCustomElapsedSeconds(0);
    },
    [],
  );

  return {
    timeLeft,
    setTimeLeft,
    isRunning,
    setIsRunning,
    isFinished,
    setIsFinished,
    reportDismissed,
    setReportDismissed,
    customElapsedSeconds,
    setCustomElapsedSeconds,
    totalSeconds,
    resetSession,
  };
}