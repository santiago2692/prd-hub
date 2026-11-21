import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { inlineSafe, readStoredFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Sign in required", { status: 401 });
  const { id } = await params;
  const a = await db.attachment.findUnique({ where: { id } });
  if (!a?.storageKey) return new NextResponse("Not found", { status: 404 });
  const data = await readStoredFile(a.storageKey);
  const mime = a.mimeType ?? "application/octet-stream";
  const inline = inlineSafe(mime);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": inline ? mime : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(a.name)}`,
      "X-Content-Type-Options": "nosniff",
      // Chrome's PDF viewer doesn't load under a sandbox CSP, so only apply it to other types.
      ...(mime === "application/pdf"
        ? {}
        : { "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" }),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
