import crypto from "node:crypto";
import { env } from "./env";

/**
 * LinkedIn OAuth 2.0 (authorization code) helpers for the "Connect LinkedIn"
 * flow. Requires LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET and a redirect URL
 * registered on your LinkedIn app (see LINKEDIN_SETUP.md).
 */

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

/** Resolve the redirect URI: explicit env value, else derived from the origin. */
export function resolveRedirectUri(origin: string): string {
  return env.linkedin.redirectUri || `${origin}/api/linkedin/callback`;
}

/** Sign a short-lived state value binding the flow to a user (CSRF defense). */
export function signState(email: string): string {
  const body = Buffer.from(
    JSON.stringify({ email, n: crypto.randomBytes(8).toString("hex"), t: Date.now() }),
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", env.sessionSecret)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state?: string | null): { email: string } | null {
  if (!state) return null;
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", env.sessionSecret)
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (Date.now() - p.t > 10 * 60 * 1000) return null; // 10 min TTL
    return { email: p.email };
  } catch {
    return null;
  }
}

export function buildAuthorizationUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.linkedin.clientId,
    redirect_uri: redirectUri,
    state,
    scope: env.linkedin.scope,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: env.linkedin.clientId,
      client_secret: env.linkedin.clientSecret,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.linkedin.clientId,
      client_secret: env.linkedin.clientSecret,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Compute an ISO expiry from an expires_in seconds value. */
export function expiryFromNow(expiresInSeconds: number): string {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}
