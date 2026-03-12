import { NextResponse } from "next/server";
import { getRandomWordChunk } from "../../../lib/typing-data";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("lang") || "en";
    const duration = searchParams.get("duration") || "1";
    const count = searchParams.get("count") || "160";

    const words = await getRandomWordChunk(language, duration, count);

    return NextResponse.json({ words });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to load typing source." },
      { status: 500 }
    );
  }
}
