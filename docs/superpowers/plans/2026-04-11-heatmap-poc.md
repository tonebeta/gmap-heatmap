# Heatmap POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-user heatmap POC where users input nickname + address (or upload CSV) to display location data on an interactive heatmap with statistics.

**Architecture:** Single Next.js 14 App Router project. API Routes handle geocoding (Nominatim + Google fallback) and Vercel KV read/write. Frontend uses react-leaflet + leaflet.heat for the map, with a collapsible sidebar for input/stats.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, react-leaflet, leaflet.heat, @vercel/kv, papaparse

**Spec:** `docs/superpowers/specs/2026-04-11-heatmap-poc-design.md`

---

## File Structure

```
app/
├── page.tsx                          # Main page — sidebar + map layout
├── layout.tsx                        # Root layout with metadata
├── globals.css                       # Tailwind directives + Leaflet CSS import
├── components/
│   ├── Sidebar.tsx                   # Collapsible sidebar container with toggle
│   ├── EntryForm.tsx                 # Nickname + address + tag form
│   ├── CsvUpload.tsx                 # CSV drag-and-drop upload
│   ├── StatsPanel.tsx                # Stats: total, by-tag, city bar chart
│   ├── HeatMap.tsx                   # Leaflet map + heat layer (dynamic import)
│   └── PasswordModal.tsx             # Password prompt modal
├── api/
│   ├── entries/
│   │   ├── route.ts                  # GET all entries + POST single entry
│   │   └── batch/
│   │       └── route.ts             # POST CSV batch import
├── lib/
│   ├── types.ts                      # Shared TypeScript types
│   ├── geocode.ts                    # Nominatim + Google fallback geocoder
│   ├── kv.ts                         # Vercel KV read/write wrapper
│   └── csv.ts                        # CSV parsing with papaparse
├── __tests__/
│   ├── geocode.test.ts               # Geocode unit tests
│   ├── csv.test.ts                   # CSV parsing tests
│   ├── entries-route.test.ts         # Entries API route tests
│   └── batch-route.test.ts           # Batch API route tests
├── .env.local.example                # Environment variable template
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.ts`, `postcss.config.js`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `.env.local.example`, `.gitignore`

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/fongci/Vibe/gmap_heatmap
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

If the directory is not empty, accept overwrite. This creates the full Next.js scaffold.

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/fongci/Vibe/gmap_heatmap
npm install react-leaflet leaflet leaflet.heat @vercel/kv papaparse uuid
npm install -D @types/leaflet @types/leaflet.heat @types/papaparse @types/uuid jest @testing-library/react @testing-library/jest-dom ts-jest @types/jest
```

- [ ] **Step 3: Create Jest config**

Create `jest.config.ts`:

```typescript
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/app/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
};

export default config;
```

- [ ] **Step 4: Create .env.local.example**

Create `.env.local.example`:

```
KV_REST_API_URL=your_vercel_kv_url
KV_REST_API_TOKEN=your_vercel_kv_token
ENTRY_PASSWORD=your_shared_password
GOOGLE_GEOCODING_API_KEY=optional_google_api_key
```

- [ ] **Step 5: Update .gitignore**

Append to `.gitignore`:

```
.superpowers/
.env.local
```

- [ ] **Step 6: Verify project runs**

```bash
cd /Users/fongci/Vibe/gmap_heatmap
npm run dev
```

Expected: Next.js dev server starts on http://localhost:3000 with default page.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 14 project with dependencies"
```

---

### Task 2: Shared Types

**Files:**
- Create: `app/lib/types.ts`

- [ ] **Step 1: Define types**

Create `app/lib/types.ts`:

```typescript
export interface Entry {
  id: string;
  nickname: string;
  address: string;
  tag: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
}

export interface BatchResult {
  success: number;
  failed: { row: number; address: string; error: string }[];
}

export interface CsvRow {
  nickname: string;
  address: string;
  tag: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 3: Geocoding Library

**Files:**
- Create: `app/lib/geocode.ts`, `app/__tests__/geocode.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/__tests__/geocode.test.ts`:

```typescript
import { geocodeAddress } from "@/lib/geocode";

// Mock global fetch
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  mockFetch.mockReset();
  // Clear env
  delete process.env.GOOGLE_GEOCODING_API_KEY;
});

describe("geocodeAddress", () => {
  it("returns coordinates from Nominatim on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ lat: "25.0330", lon: "121.5654" }],
    } as Response);

    const result = await geocodeAddress("台北市信義區");
    expect(result).toEqual({ lat: 25.033, lng: 121.5654 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain("nominatim.openstreetmap.org");
  });

  it("falls back to Google when Nominatim returns empty", async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = "test-key";

    // Nominatim returns empty
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    // Google returns result
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "OK",
        results: [{ geometry: { location: { lat: 25.033, lng: 121.5654 } } }],
      }),
    } as Response);

    const result = await geocodeAddress("台北市信義區");
    expect(result).toEqual({ lat: 25.033, lng: 121.5654 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws when both Nominatim and Google fail", async () => {
    process.env.GOOGLE_GEOCODING_API_KEY = "test-key";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ZERO_RESULTS", results: [] }),
    } as Response);

    await expect(geocodeAddress("不存在的地址xyz")).rejects.toThrow(
      "無法解析地址"
    );
  });

  it("throws when Nominatim fails and no Google key configured", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    await expect(geocodeAddress("不存在的地址xyz")).rejects.toThrow(
      "無法解析地址"
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/fongci/Vibe/gmap_heatmap
npx jest app/__tests__/geocode.test.ts --verbose
```

Expected: FAIL — `Cannot find module '@/lib/geocode'`

- [ ] **Step 3: Implement geocode**

Create `app/lib/geocode.ts`:

```typescript
import { GeocodingResult } from "./types";

async function geocodeWithNominatim(
  address: string
): Promise<GeocodingResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const response = await fetch(url, {
    headers: { "User-Agent": "heatmap-poc/1.0" },
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) return null;

  const data = await response.json();
  if (!data.length) return null;

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function geocodeWithGoogle(
  address: string
): Promise<GeocodingResult | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) return null;

  const data = await response.json();
  if (data.status !== "OK" || !data.results.length) return null;

  const { lat, lng } = data.results[0].geometry.location;
  return { lat, lng };
}

export async function geocodeAddress(
  address: string
): Promise<GeocodingResult> {
  // Try Nominatim first
  const nominatimResult = await geocodeWithNominatim(address).catch(
    () => null
  );
  if (nominatimResult) return nominatimResult;

  // Fallback to Google
  const googleResult = await geocodeWithGoogle(address).catch(() => null);
  if (googleResult) return googleResult;

  throw new Error(`無法解析地址: ${address}`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest app/__tests__/geocode.test.ts --verbose
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/lib/geocode.ts app/__tests__/geocode.test.ts
git commit -m "feat: add geocode lib with Nominatim + Google fallback"
```

---

### Task 4: KV Storage Library

**Files:**
- Create: `app/lib/kv.ts`

- [ ] **Step 1: Implement KV wrapper**

Create `app/lib/kv.ts`:

```typescript
import { kv } from "@vercel/kv";
import { Entry } from "./types";

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
```

- [ ] **Step 2: Commit**

```bash
git add app/lib/kv.ts
git commit -m "feat: add Vercel KV storage wrapper"
```

---

### Task 5: CSV Parsing Library

**Files:**
- Create: `app/lib/csv.ts`, `app/__tests__/csv.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/__tests__/csv.test.ts`:

```typescript
import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses valid CSV with headers", () => {
    const csv = `暱稱,地址,標籤
小明,台北市信義區,同事
小華,新北市板橋區,朋友`;

    const result = parseCsv(csv);
    expect(result).toEqual([
      { nickname: "小明", address: "台北市信義區", tag: "同事" },
      { nickname: "小華", address: "新北市板橋區", tag: "朋友" },
    ]);
  });

  it("handles English headers", () => {
    const csv = `nickname,address,tag
Alice,台北市,friend`;

    const result = parseCsv(csv);
    expect(result).toEqual([
      { nickname: "Alice", address: "台北市", tag: "friend" },
    ]);
  });

  it("trims whitespace", () => {
    const csv = `暱稱, 地址, 標籤
  小明 , 台北市 , 同事 `;

    const result = parseCsv(csv);
    expect(result[0].nickname).toBe("小明");
    expect(result[0].address).toBe("台北市");
    expect(result[0].tag).toBe("同事");
  });

  it("skips rows with empty nickname or address", () => {
    const csv = `暱稱,地址,標籤
小明,台北市,同事
,新北市,朋友
小華,,同學`;

    const result = parseCsv(csv);
    expect(result).toHaveLength(1);
    expect(result[0].nickname).toBe("小明");
  });

  it("defaults tag to empty string when missing", () => {
    const csv = `暱稱,地址,標籤
小明,台北市,`;

    const result = parseCsv(csv);
    expect(result[0].tag).toBe("");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest app/__tests__/csv.test.ts --verbose
```

Expected: FAIL — `Cannot find module '@/lib/csv'`

- [ ] **Step 3: Implement CSV parser**

Create `app/lib/csv.ts`:

```typescript
import Papa from "papaparse";
import { CsvRow } from "./types";

const HEADER_MAP: Record<string, keyof CsvRow> = {
  暱稱: "nickname",
  nickname: "nickname",
  地址: "address",
  address: "address",
  標籤: "tag",
  tag: "tag",
};

export function parseCsv(csvString: string): CsvRow[] {
  const { data, errors } = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length && !data.length) {
    throw new Error(`CSV 解析錯誤: ${errors[0].message}`);
  }

  return data
    .map((row) => {
      const mapped: Partial<CsvRow> = {};
      for (const [key, value] of Object.entries(row)) {
        const field = HEADER_MAP[key.trim()];
        if (field) {
          mapped[field] = (value ?? "").trim();
        }
      }
      return {
        nickname: mapped.nickname ?? "",
        address: mapped.address ?? "",
        tag: mapped.tag ?? "",
      };
    })
    .filter((row) => row.nickname !== "" && row.address !== "");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest app/__tests__/csv.test.ts --verbose
```

Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/lib/csv.ts app/__tests__/csv.test.ts
git commit -m "feat: add CSV parser with header mapping"
```

---

### Task 6: Entries API Route (GET + POST)

**Files:**
- Create: `app/api/entries/route.ts`, `app/__tests__/entries-route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/__tests__/entries-route.test.ts`:

```typescript
import { GET, POST } from "@/api/entries/route";
import * as kvModule from "@/lib/kv";
import * as geocodeModule from "@/lib/geocode";

jest.mock("@/lib/kv");
jest.mock("@/lib/geocode");

const mockGetEntries = kvModule.getEntries as jest.MockedFunction<
  typeof kvModule.getEntries
>;
const mockAddEntry = kvModule.addEntry as jest.MockedFunction<
  typeof kvModule.addEntry
>;
const mockGeocode = geocodeModule.geocodeAddress as jest.MockedFunction<
  typeof geocodeModule.geocodeAddress
>;

beforeEach(() => {
  jest.resetAllMocks();
  process.env.ENTRY_PASSWORD = "test123";
});

describe("GET /api/entries", () => {
  it("returns all entries", async () => {
    const entries = [
      {
        id: "1",
        nickname: "小明",
        address: "台北市",
        tag: "朋友",
        lat: 25.03,
        lng: 121.56,
        createdAt: "2026-04-11T00:00:00Z",
      },
    ];
    mockGetEntries.mockResolvedValue(entries);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(entries);
  });
});

describe("POST /api/entries", () => {
  it("creates entry with valid password", async () => {
    mockGeocode.mockResolvedValue({ lat: 25.03, lng: 121.56 });
    mockAddEntry.mockResolvedValue(undefined);

    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-entry-password": "test123",
      },
      body: JSON.stringify({
        nickname: "小明",
        address: "台北市信義區",
        tag: "朋友",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.nickname).toBe("小明");
    expect(data.lat).toBe(25.03);
    expect(data.lng).toBe(121.56);
    expect(mockAddEntry).toHaveBeenCalledTimes(1);
  });

  it("rejects wrong password", async () => {
    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-entry-password": "wrong",
      },
      body: JSON.stringify({
        nickname: "小明",
        address: "台北市",
        tag: "",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("rejects missing nickname or address", async () => {
    const request = new Request("http://localhost/api/entries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-entry-password": "test123",
      },
      body: JSON.stringify({ nickname: "", address: "台北市", tag: "" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest app/__tests__/entries-route.test.ts --verbose
```

Expected: FAIL — `Cannot find module '@/api/entries/route'`

- [ ] **Step 3: Implement entries route**

Create `app/api/entries/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getEntries, addEntry } from "@/lib/kv";
import { geocodeAddress } from "@/lib/geocode";
import { Entry } from "@/lib/types";

export async function GET() {
  const entries = await getEntries();
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const password = request.headers.get("x-entry-password");
  if (password !== process.env.ENTRY_PASSWORD) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
  }

  const body = await request.json();
  const { nickname, address, tag } = body;

  if (!nickname?.trim() || !address?.trim()) {
    return NextResponse.json(
      { error: "暱稱和地址為必填" },
      { status: 400 }
    );
  }

  let coords;
  try {
    coords = await geocodeAddress(address.trim());
  } catch {
    return NextResponse.json(
      { error: `無法解析地址: ${address}` },
      { status: 422 }
    );
  }

  const entry: Entry = {
    id: uuidv4(),
    nickname: nickname.trim(),
    address: address.trim(),
    tag: (tag ?? "").trim(),
    lat: coords.lat,
    lng: coords.lng,
    createdAt: new Date().toISOString(),
  };

  await addEntry(entry);
  return NextResponse.json(entry, { status: 201 });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest app/__tests__/entries-route.test.ts --verbose
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/entries/route.ts app/__tests__/entries-route.test.ts
git commit -m "feat: add entries API route (GET + POST)"
```

---

### Task 7: Batch Upload API Route

**Files:**
- Create: `app/api/entries/batch/route.ts`, `app/__tests__/batch-route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `app/__tests__/batch-route.test.ts`:

```typescript
import { POST } from "@/api/entries/batch/route";
import * as kvModule from "@/lib/kv";
import * as geocodeModule from "@/lib/geocode";

jest.mock("@/lib/kv");
jest.mock("@/lib/geocode");

const mockAddEntries = kvModule.addEntries as jest.MockedFunction<
  typeof kvModule.addEntries
>;
const mockGeocode = geocodeModule.geocodeAddress as jest.MockedFunction<
  typeof geocodeModule.geocodeAddress
>;

beforeEach(() => {
  jest.resetAllMocks();
  process.env.ENTRY_PASSWORD = "test123";
});

describe("POST /api/entries/batch", () => {
  function createCsvRequest(csv: string, password = "test123") {
    const formData = new FormData();
    formData.append("file", new Blob([csv], { type: "text/csv" }), "data.csv");

    return new Request("http://localhost/api/entries/batch", {
      method: "POST",
      headers: { "x-entry-password": password },
      body: formData,
    });
  }

  it("processes valid CSV", async () => {
    mockGeocode
      .mockResolvedValueOnce({ lat: 25.03, lng: 121.56 })
      .mockResolvedValueOnce({ lat: 25.01, lng: 121.47 });
    mockAddEntries.mockResolvedValue(undefined);

    const csv = `暱稱,地址,標籤\n小明,台北市,朋友\n小華,新北市,同事`;
    const response = await POST(createCsvRequest(csv));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(2);
    expect(data.failed).toHaveLength(0);
    expect(mockAddEntries).toHaveBeenCalledTimes(1);
  });

  it("reports geocoding failures per row", async () => {
    mockGeocode
      .mockResolvedValueOnce({ lat: 25.03, lng: 121.56 })
      .mockRejectedValueOnce(new Error("無法解析地址"));
    mockAddEntries.mockResolvedValue(undefined);

    const csv = `暱稱,地址,標籤\n小明,台北市,朋友\n小華,不存在地址,同事`;
    const response = await POST(createCsvRequest(csv));
    const data = await response.json();

    expect(data.success).toBe(1);
    expect(data.failed).toHaveLength(1);
    expect(data.failed[0].row).toBe(2);
    expect(data.failed[0].address).toBe("不存在地址");
  });

  it("rejects wrong password", async () => {
    const response = await POST(
      createCsvRequest("暱稱,地址,標籤\n小明,台北市,朋友", "wrong")
    );
    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest app/__tests__/batch-route.test.ts --verbose
```

Expected: FAIL — `Cannot find module '@/api/entries/batch/route'`

- [ ] **Step 3: Implement batch route**

Create `app/api/entries/batch/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { addEntries } from "@/lib/kv";
import { geocodeAddress } from "@/lib/geocode";
import { parseCsv } from "@/lib/csv";
import { Entry, BatchResult } from "@/lib/types";

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
    return NextResponse.json(
      { error: "CSV 中無有效資料" },
      { status: 400 }
    );
  }

  const result: BatchResult = { success: 0, failed: [] };
  const entries: Entry[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Rate limit: 1 req/sec for Nominatim
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
    await addEntries(entries);
  }

  return NextResponse.json(result);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest app/__tests__/batch-route.test.ts --verbose
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/entries/batch/route.ts app/__tests__/batch-route.test.ts
git commit -m "feat: add batch CSV upload API route"
```

---

### Task 8: HeatMap Component

**Files:**
- Create: `app/components/HeatMap.tsx`

- [ ] **Step 1: Create HeatMap component**

Create `app/components/HeatMap.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { Entry } from "@/lib/types";

// Fix Leaflet default marker icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TAIWAN_CENTER: [number, number] = [23.5, 121];
const DEFAULT_ZOOM = 7;

function HeatLayer({ entries }: { entries: Entry[] }) {
  const map = useMap();
  const heatLayerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }

    if (entries.length === 0) return;

    const points: L.HeatLatLngTuple[] = entries.map((e) => [
      e.lat,
      e.lng,
      1,
    ]);

    heatLayerRef.current = (L as any).heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    });
    heatLayerRef.current!.addTo(map);

    // Auto-fit bounds
    const bounds = L.latLngBounds(entries.map((e) => [e.lat, e.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [entries, map]);

  return null;
}

interface HeatMapProps {
  entries: Entry[];
}

export default function HeatMap({ entries }: HeatMapProps) {
  return (
    <MapContainer
      center={TAIWAN_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <HeatLayer entries={entries} />
    </MapContainer>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit --pretty
```

Expected: No errors (or only unrelated warnings).

- [ ] **Step 3: Commit**

```bash
git add app/components/HeatMap.tsx
git commit -m "feat: add HeatMap component with leaflet.heat"
```

---

### Task 9: PasswordModal Component

**Files:**
- Create: `app/components/PasswordModal.tsx`

- [ ] **Step 1: Create PasswordModal**

Create `app/components/PasswordModal.tsx`:

```tsx
"use client";

import { useState } from "react";

interface PasswordModalProps {
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

export default function PasswordModal({
  onSubmit,
  onCancel,
}: PasswordModalProps) {
  const [password, setPassword] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-800">
          請輸入密碼
        </h3>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && password) onSubmit(password);
          }}
          placeholder="共用密碼"
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-gray-800 focus:border-blue-500 focus:outline-none"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
          >
            取消
          </button>
          <button
            onClick={() => password && onSubmit(password)}
            disabled={!password}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            確認
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/PasswordModal.tsx
git commit -m "feat: add PasswordModal component"
```

---

### Task 10: EntryForm Component

**Files:**
- Create: `app/components/EntryForm.tsx`

- [ ] **Step 1: Create EntryForm**

Create `app/components/EntryForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import PasswordModal from "./PasswordModal";

interface EntryFormProps {
  onEntryAdded: () => void;
}

export default function EntryForm({ onEntryAdded }: EntryFormProps) {
  const [nickname, setNickname] = useState("");
  const [address, setAddress] = useState("");
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  function getPassword(): string | null {
    return localStorage.getItem("entry-password");
  }

  async function submitEntry(password: string) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-entry-password": password,
        },
        body: JSON.stringify({ nickname, address, tag }),
      });

      if (res.status === 401) {
        localStorage.removeItem("entry-password");
        setError("密碼錯誤");
        setShowPasswordModal(true);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "新增失敗");
        return;
      }

      localStorage.setItem("entry-password", password);
      setNickname("");
      setAddress("");
      setTag("");
      onEntryAdded();
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nickname.trim() || !address.trim()) return;

    const savedPassword = getPassword();
    if (savedPassword) {
      submitEntry(savedPassword);
    } else {
      setShowPasswordModal(true);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">📍 新增標記</h3>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="暱稱"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
          required
        />
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="地址"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
          required
        />
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="標籤（選填）"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !nickname.trim() || !address.trim()}
          className="w-full rounded bg-blue-600 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "處理中..." : "送出"}
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </form>

      {showPasswordModal && (
        <PasswordModal
          onSubmit={(pw) => {
            setShowPasswordModal(false);
            submitEntry(pw);
          }}
          onCancel={() => setShowPasswordModal(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/EntryForm.tsx
git commit -m "feat: add EntryForm component with password flow"
```

---

### Task 11: CsvUpload Component

**Files:**
- Create: `app/components/CsvUpload.tsx`

- [ ] **Step 1: Create CsvUpload**

Create `app/components/CsvUpload.tsx`:

```tsx
"use client";

import { useCallback, useState } from "react";
import PasswordModal from "./PasswordModal";
import { BatchResult } from "@/lib/types";

interface CsvUploadProps {
  onUploaded: () => void;
}

export default function CsvUpload({ onUploaded }: CsvUploadProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFile(file: File, password: string) {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/entries/batch", {
        method: "POST",
        headers: { "x-entry-password": password },
        body: formData,
      });

      if (res.status === 401) {
        localStorage.removeItem("entry-password");
        setError("密碼錯誤");
        setPendingFile(file);
        setShowPasswordModal(true);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "上傳失敗");
        return;
      }

      localStorage.setItem("entry-password", password);
      const data: BatchResult = await res.json();
      setResult(data);
      onUploaded();
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  function handleFile(file: File) {
    const savedPassword = localStorage.getItem("entry-password");
    if (savedPassword) {
      uploadFile(file, savedPassword);
    } else {
      setPendingFile(file);
      setShowPasswordModal(true);
    }
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    []
  );

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">📂 上傳 CSV</h3>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed p-4 text-center transition-colors ${
            dragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".csv";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }}
        >
          {loading ? (
            <p className="text-sm text-gray-500">處理中...</p>
          ) : (
            <>
              <p className="text-sm text-gray-500">拖放 CSV 檔案或點擊選擇</p>
              <p className="mt-1 text-xs text-gray-400">
                格式：暱稱, 地址, 標籤
              </p>
            </>
          )}
        </div>

        {result && (
          <div className="rounded bg-gray-50 p-2 text-xs">
            <p className="text-green-600">成功：{result.success} 筆</p>
            {result.failed.length > 0 && (
              <>
                <p className="text-red-500">
                  失敗：{result.failed.length} 筆
                </p>
                <ul className="mt-1 text-gray-500">
                  {result.failed.map((f, i) => (
                    <li key={i}>
                      第 {f.row} 行：{f.address}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {showPasswordModal && (
        <PasswordModal
          onSubmit={(pw) => {
            setShowPasswordModal(false);
            if (pendingFile) {
              uploadFile(pendingFile, pw);
              setPendingFile(null);
            }
          }}
          onCancel={() => {
            setShowPasswordModal(false);
            setPendingFile(null);
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/CsvUpload.tsx
git commit -m "feat: add CsvUpload component with drag-and-drop"
```

---

### Task 12: StatsPanel Component

**Files:**
- Create: `app/components/StatsPanel.tsx`

- [ ] **Step 1: Create StatsPanel**

Create `app/components/StatsPanel.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { Entry } from "@/lib/types";

// Extract city name from Taiwan address (first 2-3 chars typically)
function extractCity(address: string): string {
  // Match common Taiwan city/county patterns
  const match = address.match(
    /^(臺北市|台北市|新北市|桃園市|臺中市|台中市|臺南市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)/
  );
  return match ? match[1] : "其他";
}

interface StatsPanelProps {
  entries: Entry[];
}

export default function StatsPanel({ entries }: StatsPanelProps) {
  const stats = useMemo(() => {
    const byTag: Record<string, number> = {};
    const byCity: Record<string, number> = {};

    for (const entry of entries) {
      // Count by tag
      const tag = entry.tag || "(無標籤)";
      byTag[tag] = (byTag[tag] || 0) + 1;

      // Count by city
      const city = extractCity(entry.address);
      byCity[city] = (byCity[city] || 0) + 1;
    }

    // Sort cities by count descending
    const citySorted = Object.entries(byCity).sort((a, b) => b[1] - a[1]);
    const maxCityCount = citySorted.length > 0 ? citySorted[0][1] : 0;

    return { byTag, citySorted, maxCityCount };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="text-sm text-gray-400">
        尚無資料
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">📊 統計</h3>

      {/* Total count */}
      <div className="text-sm text-gray-600">
        總人數：<span className="font-bold text-gray-800">{entries.length}</span>
      </div>

      {/* By tag */}
      <div>
        <p className="mb-1 text-xs font-medium text-gray-500">依標籤</p>
        <div className="space-y-1">
          {Object.entries(stats.byTag).map(([tag, count]) => (
            <div key={tag} className="flex justify-between text-xs">
              <span className="text-gray-600">{tag}</span>
              <span className="font-medium text-gray-800">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* City bar chart */}
      <div>
        <p className="mb-2 text-xs font-medium text-gray-500">區域分布</p>
        <div className="space-y-1">
          {stats.citySorted.map(([city, count]) => (
            <div key={city} className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 text-right text-gray-600">
                {city}
              </span>
              <div className="h-4 flex-1 rounded bg-gray-100">
                <div
                  className="h-full rounded bg-blue-500 transition-all"
                  style={{
                    width: `${(count / stats.maxCityCount) * 100}%`,
                  }}
                />
              </div>
              <span className="w-6 text-right font-medium text-gray-800">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/StatsPanel.tsx
git commit -m "feat: add StatsPanel with city distribution bar chart"
```

---

### Task 13: Sidebar Component

**Files:**
- Create: `app/components/Sidebar.tsx`

- [ ] **Step 1: Create Sidebar**

Create `app/components/Sidebar.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Entry } from "@/lib/types";
import EntryForm from "./EntryForm";
import CsvUpload from "./CsvUpload";
import StatsPanel from "./StatsPanel";

interface SidebarProps {
  entries: Entry[];
  onDataChanged: () => void;
}

export default function Sidebar({ entries, onDataChanged }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="absolute left-2 top-2 z-10 rounded bg-white p-2 shadow-md hover:bg-gray-50"
        title="展開側欄"
      >
        ☰
      </button>
    );
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Header with toggle */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-bold text-gray-800">
          🗺️ 地址熱點圖
        </h2>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="收合側欄"
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <EntryForm onEntryAdded={onDataChanged} />
        <hr className="border-gray-200" />
        <CsvUpload onUploaded={onDataChanged} />
        <hr className="border-gray-200" />
        <StatsPanel entries={entries} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/Sidebar.tsx
git commit -m "feat: add collapsible Sidebar component"
```

---

### Task 14: Main Page Assembly

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Update globals.css**

Replace the content of `app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  height: 100%;
  margin: 0;
}
```

- [ ] **Step 2: Update layout.tsx**

Replace the content of `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "地址熱點圖 POC",
  description: "輸入暱稱與地址，顯示在地圖上的熱點圖與統計",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className="h-full">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Create main page**

Replace the content of `app/page.tsx` with:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Entry } from "@/lib/types";
import Sidebar from "@/components/Sidebar";

const HeatMap = dynamic(() => import("@/components/HeatMap"), { ssr: false });

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/entries");
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch {
      console.error("Failed to fetch entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return (
    <main className="flex h-screen">
      <Sidebar entries={entries} onDataChanged={fetchEntries} />
      <div className="relative flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            載入中...
          </div>
        ) : (
          <HeatMap entries={entries} />
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify the app builds**

```bash
cd /Users/fongci/Vibe/gmap_heatmap
npm run build
```

Expected: Build succeeds (KV calls will fail without env vars, but build should pass).

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/layout.tsx app/globals.css
git commit -m "feat: assemble main page with sidebar + heatmap layout"
```

---

### Task 15: Local Dev Testing & Deploy Config

**Files:**
- Modify: `next.config.js`
- Create: `.env.local` (not committed)

- [ ] **Step 1: Update next.config.js for leaflet compatibility**

Replace `next.config.js` (or `next.config.mjs` if scaffolded that way):

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
```

No special config needed — react-leaflet works with App Router via dynamic import.

- [ ] **Step 2: Create .env.local for local development**

Create `.env.local` (this file is gitignored):

```
KV_REST_API_URL=your_vercel_kv_url_here
KV_REST_API_TOKEN=your_vercel_kv_token_here
ENTRY_PASSWORD=<REDACTED>
GOOGLE_GEOCODING_API_KEY=
```

To get KV credentials:
1. Go to https://vercel.com → create a new project → Storage → Create KV Database
2. Copy the `KV_REST_API_URL` and `KV_REST_API_TOKEN` from the dashboard

- [ ] **Step 3: Run dev server and manual smoke test**

```bash
cd /Users/fongci/Vibe/gmap_heatmap
npm run dev
```

Open http://localhost:3000 and verify:
1. Sidebar renders with form, CSV upload, stats panel
2. Map renders with OSM tiles centered on Taiwan
3. Enter nickname "測試" + address "台北市信義區" → prompted for password → enter "<REDACTED>" → pin appears on map + heat layer updates
4. Toggle sidebar collapse/expand works
5. Stats update after adding entry

- [ ] **Step 4: Run all tests**

```bash
npx jest --verbose
```

Expected: All tests pass (geocode: 4, csv: 5, entries-route: 4, batch-route: 3 = 16 total).

- [ ] **Step 5: Final commit**

```bash
git add next.config.js .env.local.example
git commit -m "chore: finalize config for local dev and Vercel deploy"
```

---

## Deployment Checklist

After all tasks complete:

1. Push to GitHub: `git remote add origin <repo-url> && git push -u origin main`
2. Import project in Vercel dashboard
3. Add environment variables in Vercel project settings:
   - `KV_REST_API_URL` — from Vercel KV dashboard
   - `KV_REST_API_TOKEN` — from Vercel KV dashboard
   - `ENTRY_PASSWORD` — your chosen shared password
   - `GOOGLE_GEOCODING_API_KEY` — (optional) Google API key
4. Deploy
