import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isLinkedInOAuthConfigured } from "@/lib/env";
import {
  buildAuthorizationUrl,
  resolveRedirectUri,
  signState,
} from "@/lib/linkedin-oauth";

export const runtime = "nodejs";

// Kicks off the OAuth flow: redirects the user to LinkedIn's consent screen.
export async function GET(request: Request) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!isLinkedInOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/settings?error=oauth_not_configured", request.url),
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUri = resolveRedirectUri(origin);
  const url = buildAuthorizationUrl(redirectUri, signState(user.email));
  return NextResponse.redirect(url);
}
