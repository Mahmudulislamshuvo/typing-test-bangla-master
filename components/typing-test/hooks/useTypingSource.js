"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeText } from "@/lib/unicode/text-normalizer";
import { shuffleArray } from "../constants";

/**
 * Hook: manage typing source playlist, fetching, and replacement.
 *
 * Preserves existing localStorage key `typing-test-playlist` and all
 * playlist / document rotation behavior.
 */
export default function useTypingSource({
  initialLanguage,
  initialDuration,
  initialWords,
  initialTotalDocs = 0,
  initialUsedIndex = -1,
  isCustomSource,
  customSourceText,
  isClassicMode,
  buildCustomWordsFn,
}) {
  const [targetWords, setTargetWords] = useState(
    Array.isArray(initialWords) ? initialWords : [],
  );
  const [isLoadingSource, setIsLoadingSource] = useState(
    !initialWords?.length && !isCustomSource,
  );
  const [loadError, setLoadError] = useState("");

  const isFetchingMoreRef = useRef(false);
  const skipInitialSelectionReloadRef = useRef(true);

  // Track seen documents to cycle through them randomly without repetition
  const playlistRef = useRef({});
  const totalDocsRef = useRef({});

  const savePlaylist = useCallback(() => {
    try {
      localStorage.setItem(
        "typing-test-playlist",
        JSON.stringify(playlistRef.current),
      );
    } catch (e) {
      console.error("Failed to save playlist", e);
    }
  }, []);

  // Initialize playlist from localStorage on mount and seed initial index.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("typing-test-playlist");
      if (stored) {
        playlistRef.current = JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load playlist", e);
    }

    const key = `${initialLanguage}-${initialDuration}`;
    const hasTotal = Number.isInteger(initialTotalDocs) && initialTotalDocs > 0;
    const hasUsedIndex =
      Number.isInteger(initialUsedIndex) && initialUsedIndex >= 0;

    if (hasTotal) {
      totalDocsRef.current[key] = initialTotalDocs;
    }

    if (hasTotal && hasUsedIndex) {
      const existing = playlistRef.current[key];
      if (Array.isArray(existing) && existing.length > 0) {
        playlistRef.current[key] = existing.filter(
          (index) => index !== initialUsedIndex,
        );
      } else {
        const indices = Array.from(
          { length: initialTotalDocs },
          (_, i) => i,
        ).filter((index) => index !== initialUsedIndex);
        playlistRef.current[key] = shuffleArray(indices);
      }
      savePlaylist();
    }
  }, [
    initialDuration,
    initialLanguage,
    initialTotalDocs,
    initialUsedIndex,
    savePlaylist,
  ]);

  const getNextIndex = useCallback(
    (key, totalDocs) => {
      if (!totalDocs || totalDocs <= 0) return -1;
      if (!playlistRef.current[key] || playlistRef.current[key].length === 0) {
        const indices = Array.from({ length: totalDocs }, (_, i) => i);
        playlistRef.current[key] = shuffleArray(indices);
      }
      const nextIndex = playlistRef.current[key].pop();
      savePlaylist();
      return nextIndex;
    },
    [savePlaylist],
  );

  const fetchWordChunk = useCallback(
    async (lang, minutes, count = 160) => {
      let forceIndex = -1;
      const key = `${lang}-${minutes}`;
      const knownTotal = totalDocsRef.current[key] || 0;
      if (knownTotal > 0) {
        forceIndex = getNextIndex(key, knownTotal);
      }

      const params = new URLSearchParams({
        lang,
        duration: String(minutes),
        count: String(count),
        ...(forceIndex !== -1 && { index: String(forceIndex) }),
      });

      const response = await fetch(`/api/typing-source?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load typing source.");
      }

      const payload = await response.json();

      if (payload.totalDocs) {
        totalDocsRef.current[key] = payload.totalDocs;
        if (forceIndex === -1 && Number.isInteger(payload.usedIndex)) {
          const existing = playlistRef.current[key];
          if (Array.isArray(existing) && existing.length > 0) {
            playlistRef.current[key] = existing.filter(
              (index) => index !== payload.usedIndex,
            );
          } else {
            const indices = Array.from(
              { length: payload.totalDocs },
              (_, i) => i,
            ).filter((index) => index !== payload.usedIndex);
            playlistRef.current[key] = shuffleArray(indices);
          }
          savePlaylist();
        }
      }

      const words = Array.isArray(payload?.words)
        ? payload.words
            .filter((word) => typeof word === "string" && word.trim())
            .map((word) => normalizeText(word, lang, isClassicMode))
        : [];

      if (!words.length) {
        throw new Error("Typing source is empty.");
      }

      return words;
    },
    [getNextIndex, isClassicMode, savePlaylist],
  );

  const replaceSource = useCallback(
    async (lang, minutes, extraResetFns = {}) => {
      setIsLoadingSource(true);
      setLoadError("");

      if (extraResetFns.onReset) extraResetFns.onReset();

      try {
        if (isCustomSource) {
          const wordsData = buildCustomWordsFn(
            customSourceText,
            lang,
            isClassicMode,
          );
          if (!wordsData.length) {
            throw new Error("Custom typing text is empty.");
          }
          setTargetWords(wordsData);
          return;
        }

        const wordsData = await fetchWordChunk(lang, minutes, 220);
        setTargetWords(Array.isArray(wordsData) ? wordsData : []);
      } catch (error) {
        setTargetWords([]);
        setLoadError(error?.message || "Unable to load typing source.");
      } finally {
        setIsLoadingSource(false);
      }
    },
    [
      buildCustomWordsFn,
      customSourceText,
      fetchWordChunk,
      isClassicMode,
      isCustomSource,
    ],
  );

  const appendMoreWords = useCallback(
    async (lang, minutes) => {
      if (isCustomSource) return;
      if (isFetchingMoreRef.current) return;
      isFetchingMoreRef.current = true;

      try {
        const words = await fetchWordChunk(lang, minutes, 180);
        setTargetWords((prev) => [...prev, ...words]);
      } catch {
        // Keep the current stream alive even if a background top-up fails once.
      } finally {
        isFetchingMoreRef.current = false;
      }
    },
    [fetchWordChunk, isCustomSource],
  );

  return {
    targetWords,
    setTargetWords,
    isLoadingSource,
    loadError,
    replaceSource,
    appendMoreWords,
    skipInitialSelectionReloadRef,
    isFetchingMoreRef,
  };
}