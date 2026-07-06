import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  try {
    const user = await authenticate(email, password);
    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, signSession(user), sessionCookieOptions());
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sign in failed" },
      { status: 401 },
    );
  }
}
