import dbConnect from "../../../lib/dbConnect";
import Report from "../../../models/Report";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await dbConnect();
    const reports = await Report.find({}).sort({ date: -1 });

    // Group by device logic (optional, but requested)
    // The user said: "যে ডিভাইস থেকে টাইপ হবে ঐ ডিভাইসের নাম লিখে তার পর তার যত র্পোরট আছে সব অখানে রাখতে পারো"
    // I can return grouped data or flat data. Flat data is more flexible for frontend filtering.
    // I'll return flat data, but maybe I'll add a separate property for grouped data in a new route if needed.

    return NextResponse.json(
      { success: true, data: reports },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 },
    );
  }
}
