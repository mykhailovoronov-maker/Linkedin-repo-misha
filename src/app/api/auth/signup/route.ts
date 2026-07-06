import { NextResponse } from "next/server";
import { register } from "@/lib/auth";
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
  if (!email || password.length < 6) {
    return NextResponse.json(
      { error: "Email and a password of at least 6 characters are required." },
      { status: 400 },
    );
  }

  try {
    const { user, needsConfirmation } = await register(email, password);
    if (needsConfirmation || !user) {
      return NextResponse.json({
        needsConfirmation: true,
        message: "Check your email to confirm your account, then sign in.",
      });
    }
    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, signSession(user), sessionCookieOptions());
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sign up failed" },
      { status: 400 },
    );
  }
}
