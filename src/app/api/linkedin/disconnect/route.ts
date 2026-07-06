import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { deleteConnection } from "@/lib/store";

export const runtime = "nodejs";

export async function POST() {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  await deleteConnection(user.email);
  return NextResponse.json({ ok: true });
}
