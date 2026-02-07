import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/neon/client";

export async function GET(request: NextRequest) {
  const weekStart = request.nextUrl.searchParams.get("week_start");
  if (!weekStart) {
    return NextResponse.json(
      { error: "week_start query param is required" },
      { status: 400 },
    );
  }

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT hourly_rate, hours, extras
      FROM weekly_logs
      WHERE week_start = ${weekStart}
      LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ data: null });
    }
    return NextResponse.json({
      data: {
        hourly_rate: Number(rows[0].hourly_rate),
        hours: rows[0].hours,
        extras: rows[0].extras,
      },
    });
  } catch (err) {
    console.error("GET /api/weekly-logs", err);
    return NextResponse.json(
      { error: "Could not load week" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { week_start, hourly_rate, hours, extras } = await request.json();
    if (!week_start) {
      return NextResponse.json(
        { error: "week_start is required" },
        { status: 400 },
      );
    }

    const sql = getDb();
    await sql`
      INSERT INTO weekly_logs (id, week_start, hourly_rate, hours, extras, inserted_at)
      VALUES (gen_random_uuid(), ${week_start}, ${hourly_rate}, ${JSON.stringify(hours)}, ${JSON.stringify(extras)}, now())
      ON CONFLICT (week_start) DO UPDATE SET
        hourly_rate = EXCLUDED.hourly_rate,
        hours = EXCLUDED.hours,
        extras = EXCLUDED.extras
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/weekly-logs", err);
    return NextResponse.json(
      { error: "Could not save week" },
      { status: 500 },
    );
  }
}
