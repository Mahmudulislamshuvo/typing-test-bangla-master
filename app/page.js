import TypingTestClient from "../components/typing-test-client";
import { getRandomWordChunk } from "../lib/typing-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialWords = await getRandomWordChunk("en", 1, 220);

  return (
    <TypingTestClient
      initialLanguage="en"
      initialDuration={1}
      initialWords={initialWords}
    />
  );
}
