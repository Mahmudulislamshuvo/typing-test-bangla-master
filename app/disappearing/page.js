import TypingTestDisappearing from "@/components/TypingTestDisappearing";
import { getRandomWordChunk } from "@/lib/typing-data";

export const dynamic = "force-dynamic";

export default async function DisappearingPage() {
  const result = await getRandomWordChunk("en", 1, 220);
  // Ensure we consistently pass an array of words
  const initialWords = Array.isArray(result) ? result : result.words || [];

  return (
    <TypingTestDisappearing
      initialLanguage="en"
      initialDuration={1}
      initialWords={initialWords}
    />
  );
}
