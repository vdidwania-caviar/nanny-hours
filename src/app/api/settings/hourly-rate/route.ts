import { NextResponse } from "next/server";
import { getDb } from "@/lib/neon/client";

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT numeric_value FROM settings WHERE name = 'hourly_rate'
    `;
    if (rows.length === 0) {
      return NextResponse.json({ numeric_value: null });
    }
    return NextResponse.json({ numeric_value: Number(rows[0].numeric_value) });
  } catch (err) {
    console.error("GET /api/settings/hourly-rate", err);
    return NextResponse.json(
      { error: "Could not load hourly rate" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { numeric_value } = await request.json();
    if (typeof numeric_value !== "number" || numeric_value <= 0) {
      return NextResponse.json(
        { error: "numeric_value must be a positive number" },
        { status: 400 },
      );
    }

    const sql = getDb();
    await sql`
      INSERT INTO settings (name, numeric_value, updated_at)
      VALUES ('hourly_rate', ${numeric_value}, now())
      ON CONFLICT (name) DO UPDATE SET
        numeric_value = EXCLUDED.numeric_value,
        updated_at = now()
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/settings/hourly-rate", err);
    return NextResponse.json(
      { error: "Could not save hourly rate" },
      { status: 500 },
    );
  }
}
