import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { saveConnection, getConnection } from "@/lib/store";
import {
  exchangeCodeForToken,
  expiryFromNow,
  resolveRedirectUri,
  verifyState,
} from "@/lib/linkedin-oauth";

export const runtime = "nodejs";

// LinkedIn redirects here after consent. Exchange the code for a token and
// store it against the signed-in user, then send them to /settings.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const settings = (q: string) => NextResponse.redirect(new URL(`/settings?${q}`, request.url));

  const user = getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const error = url.searchParams.get("error");
  if (error) {
    return settings(`error=${encodeURIComponent(error)}`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const verified = verifyState(state);
  if (!code || !verified || verified.email !== user.email) {
    return settings("error=invalid_state");
  }

  try {
    const token = await exchangeCodeForToken(code, resolveRedirectUri(url.origin));
    // Preserve any ad account / org the user already set.
    const existing = await getConnection(user.email);
    await saveConnection({
      userEmail: user.email,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? existing?.refreshToken ?? null,
      expiresAt: expiryFromNow(token.expires_in),
      adAccountId: existing?.adAccountId ?? null,
      organizationUrn: existing?.organizationUrn ?? null,
    });
    return settings("connected=1");
  } catch (err) {
    const message = err instanceof Error ? err.message : "connect_failed";
    return settings(`error=${encodeURIComponent(message.slice(0, 120))}`);
  }
}
