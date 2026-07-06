import { NextResponse } from "next/server";
import { AUDIENCES } from "@/lib/audiences";

export const runtime = "nodejs";

// Expose only what the client needs to render the picker (no raw URNs).
export async function GET() {
  return NextResponse.json({
    audiences: AUDIENCES.map(({ id, name, description }) => ({
      id,
      name,
      description,
    })),
  });
}
