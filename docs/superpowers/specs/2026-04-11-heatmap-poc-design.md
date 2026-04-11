# 地址熱點圖 POC 設計文件

## 概述

一個 Web 應用，讓多位使用者透過輸入暱稱與地址（或批次上傳 CSV），將位置資料顯示在互動式熱點圖上，並提供區域計數與密度分布統計。

## 技術棧

- **框架：** Next.js 14 (App Router) + TypeScript
- **樣式：** Tailwind CSS
- **地圖：** OpenStreetMap + react-leaflet + leaflet.heat
- **儲存：** Vercel KV (Upstash Redis)
- **Geocoding：** Nominatim（優先）+ Google Geocoding API（fallback）
- **CSV 解析：** papaparse
- **部署：** Vercel 免費方案

## UI 佈局

左側欄 + 右地圖的經典 dashboard 佈局：

- **左側欄**（可收合，toggle 按鈕切換）
  - 新增標記表單（暱稱、地址、標籤）
  - CSV 拖放上傳區
  - 統計面板（總人數、各標籤計數、密度分布直方圖）
- **右側**：全高 Leaflet 地圖 + 熱點圖層
- 側欄收合時地圖自動填滿全寬

## 資料流

### 單筆新增
```
POST /api/entries
Header: x-entry-password: <密碼>
Body: { nickname, address, tag }

流程：
1. 驗證密碼（比對環境變數 ENTRY_PASSWORD）
2. Geocode 地址 → Nominatim（timeout 3s）→ 失敗 fallback Google
3. 存入 Vercel KV
4. 回傳 { id, nickname, address, tag, lat, lng, createdAt }
```

### 批次上傳
```
POST /api/entries/batch
Header: x-entry-password: <密碼>
Body: FormData (CSV file)

CSV 格式：暱稱, 地址, 標籤

流程：
1. 驗證密碼
2. papaparse 解析 CSV
3. 逐筆 geocode（Nominatim 限速 1 req/sec，失敗 fallback Google）
4. 批次存入 Vercel KV
5. 回傳 { success: N, failed: [{ row, address, error }] }
```

### 讀取資料
```
GET /api/entries（公開，不需密碼）

回傳：[{ id, nickname, address, tag, lat, lng, createdAt }, ...]
```

### 統計（client-side 計算）

前端從 GET /api/entries 取得所有資料後，在 client-side 計算：
- 總人數
- 各標籤人數
- 地址前綴分群計數（取地址中的縣市名稱作為分群 key）

## KV 資料結構

- Key: `entries` → Value: JSON array
- 每筆 entry: `{ id, nickname, address, tag, lat, lng, createdAt }`
- 單一 key 儲存，POC 規模足夠（Vercel KV 單 value 上限 1MB，約可存數千筆）

## 前端元件結構

```
app/
├── page.tsx                  # 主頁面（左右佈局容器）
├── layout.tsx                # root layout
├── globals.css
├── components/
│   ├── Sidebar.tsx           # 左側欄容器（含收合 toggle）
│   ├── EntryForm.tsx         # 暱稱+地址+標籤表單
│   ├── CsvUpload.tsx         # CSV 拖放上傳
│   ├── StatsPanel.tsx        # 統計面板（計數 + 直方圖）
│   ├── HeatMap.tsx           # Leaflet 地圖 + 熱點圖層
│   └── PasswordModal.tsx     # 首次新增時彈出密碼輸入
├── api/
│   ├── entries/
│   │   ├── route.ts          # GET + POST
│   │   └── batch/
│   │       └── route.ts      # POST (CSV)
└── lib/
    ├── geocode.ts            # Nominatim + Google fallback
    ├── kv.ts                 # Vercel KV 讀寫封裝
    └── csv.ts                # CSV 解析
```

## 元件互動

- `Sidebar`：toggle 按鈕切換收合，收合時僅顯示 `☰` 展開鈕
- `EntryForm`：送出後呼叫 API → 成功後觸發地圖和統計重新載入
- `CsvUpload`：上傳後顯示進度（成功 N 筆、失敗 N 筆及失敗清單）
- `StatsPanel`：總人數、各標籤計數、密度分布直方圖（純 div bar chart，不引入圖表庫）
- `HeatMap`：`react-leaflet` + `leaflet.heat`，dynamic import with `ssr: false`

## 密碼機制

- 環境變數 `ENTRY_PASSWORD` 存放共用密碼
- 前端首次新增時彈出 `PasswordModal`，輸入後存 `localStorage`
- API 從 request header `x-entry-password` 驗證
- GET 端點不需密碼（查看公開）

## Geocoding 策略

- **單筆：** Nominatim 優先（timeout 3s），失敗 fallback Google Geocoding API
- **批次：** Nominatim 限速 1 req/sec，失敗的該筆改用 Google
- **結果處理：** Nominatim 回傳多筆取第一筆；地址無法辨識時回傳錯誤，該筆不存入
- **Google API Key：** 環境變數 `GOOGLE_GEOCODING_API_KEY`（選配，沒設定則只用 Nominatim）

## 地圖設定

- 預設中心：台灣（lat: 23.5, lng: 121, zoom: 7）
- 有資料時 auto-fit bounds 至所有標記範圍
- 熱點圖層使用 leaflet.heat，依據經緯度密度渲染

## 統計功能

1. **簡單計數：** 總人數、各標籤人數
2. **區域分布直方圖：** 從地址中擷取縣市名稱分群，以 div bar chart 呈現各縣市人數
3. **熱點密度：** 由 leaflet.heat 在地圖上視覺化呈現，無需額外計算

## 環境變數

| 變數 | 必要 | 說明 |
|------|------|------|
| `KV_REST_API_URL` | 是 | Vercel KV 連線 URL |
| `KV_REST_API_TOKEN` | 是 | Vercel KV Token |
| `ENTRY_PASSWORD` | 是 | 新增資料的共用密碼 |
| `GOOGLE_GEOCODING_API_KEY` | 否 | Google Geocoding fallback |

## 邊界處理

- 地址為空或無法辨識 → 回傳明確錯誤訊息，不存入
- 批次上傳部分失敗 → 成功的照存，回傳失敗清單
- KV 接近 1MB 上限 → 前端顯示提示
- Leaflet 為 client-side only → dynamic import with ssr: false
