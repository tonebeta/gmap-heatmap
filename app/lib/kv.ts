import { kv } from "@vercel/kv";
import { Entry } from "./types";

// NOTE: read-modify-write 非原子操作，並行寫入可能丟失資料。
// POC 規模可接受，正式環境應改用 Redis WATCH/MULTI 或 RPUSH。
const ENTRIES_KEY = "entries";

export async function getEntries(): Promise<Entry[]> {
  const entries = await kv.get<Entry[]>(ENTRIES_KEY);
  return entries ?? [];
}

export async function addEntry(entry: Entry): Promise<void> {
  const entries = await getEntries();
  entries.push(entry);
  await kv.set(ENTRIES_KEY, entries);
}

export async function addEntries(newEntries: Entry[]): Promise<void> {
  const entries = await getEntries();
  entries.push(...newEntries);
  await kv.set(ENTRIES_KEY, entries);
}
