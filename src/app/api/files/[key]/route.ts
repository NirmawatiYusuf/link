import { NextResponse } from "next/server";
import { fileStore, LocalDiskFileStore } from "@/lib/files";

type Ctx = { params: Promise<{ key: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { key } = await ctx.params;
  // Vercel Blob serves its own public URLs; this route only backs local dev.
  if (!(fileStore instanceof LocalDiskFileStore)) {
    return new NextResponse(null, { status: 404 });
  }
  const file = await fileStore.read(key);
  if (!file) {
    return new NextResponse(null, { status: 404 });
  }
  const body = file.data.buffer as ArrayBuffer;
  return new NextResponse(new Blob([body]), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
