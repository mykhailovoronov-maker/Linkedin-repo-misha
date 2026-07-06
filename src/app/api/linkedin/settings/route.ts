import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getConnection, saveConnection, patchConnection } from "@/lib/store";

export const runtime = "nodejs";

// Save the ad account id + organization URN the user wants to launch into.
export async function POST(request: Request) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { adAccountId?: string; organizationUrn?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const adAccountId = (body.adAccountId ?? "").trim().replace(/\D/g, "");
  const organizationUrn = (body.organizationUrn ?? "").trim();

  if (organizationUrn && !/^urn:li:organization:\d+$/.test(organizationUrn)) {
    return NextResponse.json(
      { error: "Organization URN must look like urn:li:organization:1234567" },
      { status: 400 },
    );
  }

  const patch = {
    adAccountId: adAccountId || null,
    organizationUrn: organizationUrn || null,
  };

  const existing = await getConnection(user.email);
  if (existing) {
    await patchConnection(user.email, patch);
  } else {
    // Allow setting ids before connecting (they'll be kept through OAuth).
    await saveConnection({ userEmail: user.email, accessToken: "", ...patch });
  }

  return NextResponse.json({ ok: true });
}
