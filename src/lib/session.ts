import crypto from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";

/**
 * Minimal stateless session: an HMAC-signed cookie holding the user id + email.
 * No external session store required, works identically in demo and production.
 */

export const SESSION_COOKIE = "las_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  email: string;
}

interface Payload extends SessionUser {
  iat: number;
}

export function signSession(user: SessionUser): string {
  const body = Buffer.from(
    JSON.stringify({ ...user, iat: Date.now() } satisfies Payload),
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", env.sessionSecret)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token?: string | null): SessionUser | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = crypto
    .createHmac("sha256", env.sessionSecret)
    .update(body)
    .digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    if (Date.now() - p.iat > SESSION_MAX_AGE * 1000) return null;
    return { id: p.id, email: p.email };
  } catch {
    return null;
  }
}

/** Read + verify the current session from request cookies (server only). */
export function getSessionUser(): SessionUser | null {
  return verifySession(cookies().get(SESSION_COOKIE)?.value);
}

/** Options for setting the session cookie on a response. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
