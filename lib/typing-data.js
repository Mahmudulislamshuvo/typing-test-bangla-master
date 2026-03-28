import "server-only";

import { readFile } from "fs/promises";
import path from "path";

const ALLOWED_LANGS = new Set(["en", "bn"]);
const ALLOWED_DURATIONS = new Set([1, 2, 3, 5, 10, 15, 20]);
const datasetCache = new Map();

function normalizeLanguage(language) {
  return ALLOWED_LANGS.has(language) ? language : "en";
}

function normalizeDuration(duration) {
  const numeric = Number(duration);
  return ALLOWED_DURATIONS.has(numeric) ? numeric : 1;
}

function getDatasetPath(language, durationMin) {
  return path.join(
    process.cwd(),
    "public",
    "data",
    `${language}-${durationMin}min.json`,
  );
}

/**
 * শব্দের ভেতরের অদৃশ্য ক্যারেক্টার এবং ইউনিকোড অসামঞ্জস্যতা দূর করার ফাংশন
 */
function sanitizeText(text) {
  if (!text) return "";
  return text
    .normalize("NFC") // বাংলা যুক্তাক্ষরের ইউনিকোড স্ট্যান্ডার্ডাইজেশন
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // অদৃশ্য ক্যারেক্টার (Zero Width Space/Joiner) ক্লিন করা
    .trim();
}

export async function getDataset(language, duration) {
  const lang = normalizeLanguage(language);
  const durationMin = normalizeDuration(duration);
  const cacheKey = `${lang}-${durationMin}`;

  if (datasetCache.has(cacheKey)) {
    return datasetCache.get(cacheKey);
  }

  const filePath = getDatasetPath(lang, durationMin);
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);

  const documents = Array.isArray(parsed?.documents)
    ? parsed.documents
        .map((doc) => sanitizeText(doc?.text)) // ডাটাবেস লোড হওয়ার সময় ক্লিন করা
        .filter(Boolean)
    : [];

  datasetCache.set(cacheKey, documents);
  return documents;
}

function getWordTokens(text) {
  // \S+ এর সাথে ইউনিকোড ফ্ল্যাগ ব্যবহার করা হয়েছে
  // প্রতিটি টোকেনকে আবার স্যানিটাইজ করা হচ্ছে যাতে কোনো স্পেস বা জঞ্জাল না থাকে
  return (text.match(/\S+/gu) || []).map((token) => sanitizeText(token));
}

export async function getRandomWordChunk(
  language,
  duration,
  requestedCount = 160,
  forceIndex = -1,
) {
  const docs = await getDataset(language, duration);
  const count = Math.max(40, Math.min(500, Number(requestedCount) || 160));

  if (!docs.length) {
    return { words: [], totalDocs: 0 };
  }

  let selectedIndex =
    forceIndex >= 0 && forceIndex < docs.length
      ? forceIndex
      : Math.floor(Math.random() * docs.length);

  const text = docs[selectedIndex];
  const tokens = getWordTokens(text);
  const words =
    tokens.length > 0 ? tokens.slice(0, Math.max(count, tokens.length)) : [];

  return { words, totalDocs: docs.length, usedIndex: selectedIndex };
}
