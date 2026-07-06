import { NextResponse } from "next/server";
import { saveCreativeImage } from "@/lib/store";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/png", "image/jpeg", "image/gif"];

export async function POST(request: Request) {
  if (!getSessionUser()) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided under field 'file'." },
        { status: 400 },
      );
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported image type: ${file.type || "unknown"}.` },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds the 8 MB limit." },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const url = await saveCreativeImage(bytes, file.name, file.type);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
