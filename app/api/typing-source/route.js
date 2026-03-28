import { NextResponse } from "next/server";
import { getRandomWordChunk } from "../../../lib/typing-data";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("lang") || "en";
    const duration = searchParams.get("duration") || "1";
    const count = searchParams.get("count") || "160";
    const indexParam = searchParams.get("index");
    const forceIndex = indexParam ? Number(indexParam) : -1;

    const result = await getRandomWordChunk(
      language,
      duration,
      count,
      forceIndex,
    );

    // If getRandomWordChunk returns { words, totalDocs }, use that.
    // Fallback if it returns just array (though we updated it to return object)
    const words = Array.isArray(result) ? result : result.words;
    const totalDocs = result.totalDocs || 0;

    return NextResponse.json({ words, totalDocs, usedIndex: forceIndex });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to load typing source." },
      { status: 500 },
    );
  }
}
