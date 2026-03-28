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
      const payload = report.toObject ? report.toObject() : report;
      pusherServer
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
