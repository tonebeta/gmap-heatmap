# GPS 定位按鈕設計

## Context

使用者在地圖上查看熱力圖時，需要快速定位到自己目前的位置。目前地圖沒有任何定位功能，使用者只能手動拖曳/縮放來找到自己的位置。

## 需求

在地圖右下角加一個 GPS 定位按鈕，點擊後地圖平移到使用者目前位置。

## 設計

### 元件：`LocateControl`

- `MapContainer` 的子元件（與 `MapResizeHandler`、`HeatLayer` 同層）
- 用 `useMap()` hook 取得地圖實例
- `useEffect` 中建立 `L.Control({ position: 'bottomright' })` 加到地圖

### 按鈕外觀

- 白色圓角方塊背景，跟 Leaflet 原生 zoom 按鈕風格一致
- Crosshair SVG icon（定位圖示）
- Hover 灰底效果
- Loading 狀態：icon 旋轉動畫
- 尺寸：34x34px（跟 zoom 按鈕一致）

### 行為

1. 點擊 → `navigator.geolocation.getCurrentPosition()`
2. 定位中 → 按鈕顯示旋轉動畫
3. 成功 → `map.flyTo([lat, lng], 14)`
4. 失敗 → 按鈕恢復，`alert()` 顯示錯誤

### 錯誤處理

| 錯誤碼 | 訊息 |
|--------|------|
| `PERMISSION_DENIED` | 請允許瀏覽器存取您的位置 |
| `POSITION_UNAVAILABLE` | 無法取得位置資訊 |
| `TIMEOUT` | 定位超時，請重試 |
| 瀏覽器不支援 | 不渲染按鈕 |

### Geolocation 選項

```js
{ enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
```

## 修改檔案

- `app/components/HeatMap.tsx` — 新增 `LocateControl` 元件，加入 `MapContainer` children

## 驗證方式

1. `npm run dev` 啟動開發伺服器
2. 確認地圖右下角出現定位按鈕
3. 點擊按鈕 → 瀏覽器跳出位置權限請求
4. 允許 → 地圖平移到目前位置（zoom 14）
5. 拒絕權限 → 顯示錯誤提示
6. 行動裝置測試：確認按鈕在手機畫面上不被遮擋
