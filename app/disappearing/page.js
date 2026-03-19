import TypingTestDisappearing from "@/components/TypingTestDisappearing";
import { getRandomWordChunk } from "@/lib/typing-data";

export const dynamic = "force-dynamic";

export default async function DisappearingPage() {
  const initialWords = await getRandomWordChunk("en", 1, 220);

  return (
    <TypingTestDisappearing
      initialLanguage="en"
      initialDuration={1}
      initialWords={initialWords}
    />
  );
}
