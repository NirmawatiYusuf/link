import { NextResponse } from "next/server";
import { fileStore, LocalDiskFileStore } from "@/lib/files";

type Ctx = { params: Promise<{ key: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { key } = await ctx.params;
  if (!(fileStore instanceof LocalDiskFileStore)) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "File not found" } }, { status: 404 });
  }
  const file = await fileStore.read(key);
  console.log("[files-route] read:", file === null ? "null" : `ok(${file.data.byteLength}b)`);
  if (!file) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "File not found" } }, { status: 404 });
  }
  return new NextResponse(Buffer.from(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
