import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getEntries, addEntry, clearEntries } from "@/lib/kv";
import { geocodeAddress } from "@/lib/geocode";
import { Entry } from "@/lib/types";

export async function GET() {
  try {
    const entries = await getEntries();
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "無法讀取資料" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const password = request.headers.get("x-entry-password");
  if (password !== process.env.ENTRY_PASSWORD) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
  }

  const body = await request.json();
  const { nickname, address, tag } = body;

  if (!nickname?.trim() || !address?.trim()) {
    return NextResponse.json({ error: "暱稱和地址為必填" }, { status: 400 });
  }

  let coords;
  try {
    coords = await geocodeAddress(address.trim());
  } catch {
    return NextResponse.json({ error: `無法解析地址: ${address}` }, { status: 422 });
  }

  const entry: Entry = {
    id: uuidv4(),
    nickname: nickname.trim(),
    address: address.trim(),
    tag: (tag ?? "").trim(),
    lat: coords.lat,
    lng: coords.lng,
    region: coords.region,
    createdAt: new Date().toISOString(),
  };

  try {
    await addEntry(entry);
  } catch {
    return NextResponse.json({ error: "儲存失敗" }, { status: 500 });
  }

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(request: Request) {
  const password = request.headers.get("x-entry-password");
  if (password !== process.env.ENTRY_PASSWORD) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
  }

  try {
    await clearEntries();
  } catch {
    return NextResponse.json({ error: "清除失敗" }, { status: 500 });
  }

  return NextResponse.json({ message: "已清除所有資料" });
}
