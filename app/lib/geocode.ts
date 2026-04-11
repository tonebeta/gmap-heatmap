import { GeocodingResult } from "./types";

async function geocodeWithNominatim(address: string): Promise<GeocodingResult | null> {
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

async function geocodeWithGoogle(address: string): Promise<GeocodingResult | null> {
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
