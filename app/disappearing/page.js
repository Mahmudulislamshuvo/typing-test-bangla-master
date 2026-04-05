import TypingTestDisappearing from "@/components/TypingTestDisappearing";
import { getRandomWordChunk } from "@/lib/typing-data";

export const dynamic = "force-dynamic";

export default async function DisappearingPage() {
  const result = await getRandomWordChunk("en", 1, 220);
  // Ensure we consistently pass an array of words
  const initialWords = Array.isArray(result) ? result : result.words || [];
  const initialTotalDocs = Array.isArray(result) ? 0 : result.totalDocs || 0;
  const initialUsedIndex = Array.isArray(result)
    ? -1
    : (result.usedIndex ?? -1);

  return (
    <TypingTestDisappearing
      initialLanguage="en"
      initialDuration={1}
      initialWords={initialWords}
      initialTotalDocs={initialTotalDocs}
      initialUsedIndex={initialUsedIndex}
    />
  );
}
