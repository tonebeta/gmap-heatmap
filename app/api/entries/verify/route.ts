import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const password = request.headers.get("x-entry-password");
  if (password !== process.env.ENTRY_PASSWORD) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
