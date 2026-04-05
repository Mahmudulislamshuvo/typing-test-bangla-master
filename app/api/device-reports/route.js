import dbConnect from "../../../lib/dbConnect";
import Report from "../../../models/Report";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 200;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const device = (searchParams.get("device") || "").trim();
    const limitParam = Number.parseInt(searchParams.get("limit") || "5", 10);
    const matchMode = (searchParams.get("match") || "partial").toLowerCase();

    if (!device) {
      return NextResponse.json(
        { success: false, error: "device parameter is required" },
        { status: 400 },
      );
    }

    const safeLimit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), MAX_LIMIT)
      : 5;

    await dbConnect();

    const filter =
      matchMode === "exact"
        ? { deviceName: device }
        : {
            deviceName: {
              $regex: escapeRegex(device),
              $options: "i",
            },
          };

    const reports = await Report.find(filter)
      .sort({ date: -1 })
      .limit(safeLimit);

    return NextResponse.json(
      {
        success: true,
        device,
        match: matchMode,
        limit: safeLimit,
        count: reports.length,
        data: reports,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load reports." },
      { status: 500 },
    );
  }
}
