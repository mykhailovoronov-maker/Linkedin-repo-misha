import { NextResponse } from "next/server";
import { authMode } from "@/lib/auth";

export const runtime = "nodejs";

// Lets the login screen show the right hint (demo vs. real accounts).
export async function GET() {
  return NextResponse.json({ mode: authMode() });
}
