import { NextResponse } from "next/server";
import { authMode } from "@/lib/auth";
import { usingDefaultAccessCode } from "@/lib/env";

export const runtime = "nodejs";
// Must read runtime env (not be prerendered at build time).
export const dynamic = "force-dynamic";

// Lets the login screen adapt (shared code vs. individual accounts).
export async function GET() {
  const mode = authMode();
  return NextResponse.json({
    mode,
    // Only reveal the default code hint while it's still the insecure default.
    usingDefaultCode: mode === "code" && usingDefaultAccessCode(),
  });
}
