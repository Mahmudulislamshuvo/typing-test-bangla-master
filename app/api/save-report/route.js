import dbConnect from "../../../lib/dbConnect";
import Report from "../../../models/Report";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pusherServer } from "../../../lib/pusher";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const report = await Report.create(body);

    // Broadcast the new report to connected clients via Pusher
    if (pusherServer) {
      const fullPayload = report.toObject ? report.toObject() : report;
      const payload = {
        _id: fullPayload._id,
        deviceName: fullPayload.deviceName,
        wpm: fullPayload.wpm,
        accuracy: fullPayload.accuracy,
        language: fullPayload.language,
        duration: fullPayload.duration,
        durationSeconds: fullPayload.durationSeconds,
        mode: fullPayload.mode,
        testType: fullPayload.testType,
        result: fullPayload.result,
        date: fullPayload.date,
        correctStrokes: fullPayload.correctStrokes,
        correctWords: fullPayload.correctWords,
        totalWords: fullPayload.totalWords,
        strokeWiseCorrectWords: fullPayload.strokeWiseCorrectWords,
        strokeWiseCorrectWordsWithSpaces:
          fullPayload.strokeWiseCorrectWordsWithSpaces,
        strokeWiseCorrectCharacters: fullPayload.strokeWiseCorrectCharacters,
        inputMode: fullPayload.inputMode,
      };
      // MUST await the trigger in serverless environments or it will be cancelled!
      await pusherServer
        .trigger("reports-channel", "new-report", payload)
        .catch((err) => console.error("Pusher trigger error:", err));
    }

    // Revalidate the standard reports page to clear Next.js caching globally
    revalidatePath("/reports");

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}
