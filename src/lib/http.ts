import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  init?: ResponseInit,
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    { ...init, status },
  );
}
