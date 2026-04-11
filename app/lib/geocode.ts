import { GeocodingResult } from "./types";

function extractRegion(displayName: string): string {
  // display_name: "懷德街, 嵐翠里, 板橋區, 埔墘, 新北市, 22045, 臺灣"
  // 取倒數第三段（跳過國家和郵遞區號）作為 region
  const parts = displayName.split(",").map((s) => s.trim());
  // 從後面找：跳過國家、跳過純數字（郵遞區號）
  for (let i = parts.length - 2; i >= 0; i--) {
    if (!/^\d+$/.test(parts[i])) return parts[i];
  }
  return parts[parts.length - 1] || "未知";
}

async function geocodeWithNominatim(address: string): Promise<GeocodingResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;
  const response = await fetch(url, {
    headers: { "User-Agent": "heatmap-poc/1.0" },
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (!data.length) return null;
  const item = data[0];
  const addr = item.address || {};
  // 優先用 state（州/省/直轄市），其次 city，最後從 display_name 擷取
  const region = addr.state || addr.city || addr.county || extractRegion(item.display_name || "");
  return { lat: parseFloat(item.lat), lng: parseFloat(item.lon), region };
}

async function geocodeWithGoogle(address: string): Promise<GeocodingResult | null> {
  const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!apiKey) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  if (data.status !== "OK" || !data.results.length) return null;
  const result = data.results[0];
  const { lat, lng } = result.geometry.location;
  // 從 address_components 取行政區
  const components = result.address_components || [];
  const stateComp = components.find((c: { types: string[] }) =>
    c.types.includes("administrative_area_level_1")
  );
  const region = stateComp?.long_name || address;
  return { lat, lng, region };
}

// Nominatim 對精確門牌地址常查無結果。
// 策略：逐步簡化地址重試，支援中文和英文格式。
function simplifyAddress(address: string): string[] {
  const cleaned = address.replace(/^\d{3,5}\s*/, ""); // 移除郵遞區號
  const variants = [cleaned];
  const seen = new Set([cleaned]);

  function add(v: string) {
    const trimmed = v.replace(/^[,，\s]+|[,，\s]+$/g, "").trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      variants.push(trimmed);
    }
  }

  // 中文：移除「號」及之後
  add(cleaned.replace(/\d+號.*$/, ""));
  // 中文：移除「巷」及之後
  add(cleaned.replace(/\d+巷.*$/, ""));
  // 中文：移除「弄」及之後
  add(cleaned.replace(/\d+弄.*$/, ""));

  // 英文：移除 "No. X," / "No X,"
  add(cleaned.replace(/No\.?\s*\d+\s*,?\s*/i, ""));
  // 英文：移除 "Section X," / "Sec. X,"
  add(cleaned.replace(/Sec(tion|\.)\s*\d+\s*,?\s*/i, ""));
  // 英文：移除門牌號開頭 "123, Street" → "Street"
  add(cleaned.replace(/^\d+\s*,\s*/, ""));
  // 英文：移除 "Floor X" / "Xf" / "X/F"
  add(cleaned.replace(/,?\s*\d+\s*(st|nd|rd|th)?\s*(floor|f)\b,?\s*/i, ""));

  // 通用：逐步移除逗號/空格分隔的最左段（最精確的部分）
  // 例如 "Mingalar Don, Yangon 11021" → "Yangon 11021" → "Yangon"
  const parts = cleaned.split(/[,，]\s*/);
  for (let i = 1; i < parts.length; i++) {
    add(parts.slice(i).join(", "));
  }
  // 移除郵遞區號（各種格式）
  // "Yangon 11021" / "Yangon 11021緬甸" / "11021 Yangon"
  add(cleaned.replace(/\s*\d{4,6}\s*\S*$/, ""));  // 尾部數字+可能的後綴
  add(cleaned.replace(/\s*\d{4,6}\s*/g, " ").trim()); // 移除所有嵌入的郵遞區號

  // 對每個逗號段也做郵遞區號清理再重試
  for (let i = 1; i < parts.length; i++) {
    const segment = parts.slice(i).join(", ");
    add(segment.replace(/\s*\d{4,6}\s*\S*$/, ""));
    add(segment.replace(/\s*\d{4,6}\s*/g, " ").trim());
  }

  return variants;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  const variants = simplifyAddress(address);

  for (const variant of variants) {
    const result = await geocodeWithNominatim(variant).catch(() => null);
    if (result) return result;
  }

  // Fallback: try Google with original address
  const googleResult = await geocodeWithGoogle(address).catch(() => null);
  if (googleResult) return googleResult;

  throw new Error(`無法解析地址: ${address}`);
}
