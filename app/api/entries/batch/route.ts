import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { addEntries } from "@/lib/kv";
import { geocodeAddress } from "@/lib/geocode";
import { parseCsv } from "@/lib/csv";
import { Entry, BatchResult } from "@/lib/types";

const MAX_BATCH_ROWS = 50;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const password = request.headers.get("x-entry-password");
  if (password !== process.env.ENTRY_PASSWORD) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "未提供 CSV 檔案" }, { status: 400 });
  }

  const csvText = await file.text();
  const rows = parseCsv(csvText);

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV 中無有效資料" }, { status: 400 });
  }

  if (rows.length > MAX_BATCH_ROWS) {
    return NextResponse.json(
      { error: `CSV 超過上限，最多 ${MAX_BATCH_ROWS} 筆` },
      { status: 400 }
    );
  }

  const result: BatchResult = { success: 0, failed: [] };
  const entries: Entry[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (i > 0) await delay(1000);

    try {
      const coords = await geocodeAddress(row.address);
      entries.push({
        id: uuidv4(),
        nickname: row.nickname,
        address: row.address,
        tag: row.tag,
        lat: coords.lat,
        lng: coords.lng,
        createdAt: new Date().toISOString(),
      });
      result.success++;
    } catch {
      result.failed.push({
        row: i + 1,
        address: row.address,
        error: `無法解析地址: ${row.address}`,
      });
    }
  }

  if (entries.length > 0) {
    try {
      await addEntries(entries);
    } catch {
      return NextResponse.json({ error: "儲存失敗" }, { status: 500 });
    }
  }

  return NextResponse.json(result);
}
