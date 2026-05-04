import dbConnect from "../../../lib/dbConnect";
import Report from "../../../models/Report";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 50;

function getSafeNumber(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const deviceName = (searchParams.get("deviceName") || "").trim();
    const limitParam = getSafeNumber(searchParams.get("limit"), DEFAULT_LIMIT);
    const skipParam = getSafeNumber(searchParams.get("skip"), 0);

    const safeLimit = Math.min(Math.max(limitParam, 1), MAX_LIMIT);
    const safeSkip = Math.max(skipParam, 0);

    if (deviceName) {
      const query = { deviceName };
      const total = await Report.countDocuments(query);
      const reports = await Report.find(query)
        .sort({ date: -1 })
        .skip(safeSkip)
        .limit(safeLimit);

      return NextResponse.json(
        {
          success: true,
          deviceName,
          total,
          skip: safeSkip,
          limit: safeLimit,
          data: reports,
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const devices = await Report.aggregate([
      {
        $group: {
          _id: "$deviceName",
          total: { $sum: 1 },
          latestDate: { $max: "$date" },
        },
      },
      { $sort: { latestDate: -1 } },
    ]);

    const deviceReports = await Promise.all(
      devices.map(async (device) => {
        const items = await Report.find({ deviceName: device._id })
          .sort({ date: -1 })
          .limit(safeLimit);
        return {
          deviceName: device._id,
          total: device.total,
          items,
        };
      }),
    );

    return NextResponse.json(
      {
        success: true,
        limit: safeLimit,
        data: deviceReports,
      },
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
