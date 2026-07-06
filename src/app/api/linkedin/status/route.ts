import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getConnection } from "@/lib/store";
import { isLinkedInOAuthConfigured, isLinkedInConfigured } from "@/lib/env";

export const runtime = "nodejs";

// Tells the UI whether OAuth is available and whether this user is connected
// and ready to launch for real.
export async function GET() {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const conn = await getConnection(user.email);
  const hasToken = Boolean(conn?.accessToken);
  const ready = Boolean(
    conn?.accessToken && conn?.adAccountId && conn?.organizationUrn,
  );

  return NextResponse.json({
    oauthConfigured: isLinkedInOAuthConfigured(),
    envFallback: isLinkedInConfigured(),
    connected: hasToken,
    ready: ready || isLinkedInConfigured(),
    adAccountId: conn?.adAccountId ?? null,
    organizationUrn: conn?.organizationUrn ?? null,
    expiresAt: conn?.expiresAt ?? null,
  });
}
