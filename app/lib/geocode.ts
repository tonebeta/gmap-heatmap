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

// Nominatim 對台灣地址只支援到「街/路」層級，
// 含巷弄門牌號的完整地址會查無結果。
// 策略：逐步簡化地址重試（完整 → 去門牌 → 去巷弄）。
function simplifyTaiwanAddress(address: string): string[] {
  const cleaned = address.replace(/^\d{3,5}\s*/, ""); // 移除郵遞區號
  const variants = [cleaned];

  // 移除「號」及之後（例如 42號 → 去掉）
  const noNumber = cleaned.replace(/\d+號.*$/, "");
  if (noNumber !== cleaned) variants.push(noNumber);

  // 移除「巷」及之後（例如 181巷42號 → 去掉）
  const noAlley = cleaned.replace(/\d+巷.*$/, "");
  if (noAlley !== noNumber && noAlley !== cleaned) variants.push(noAlley);

  // 移除「弄」及之後
  const noLane = cleaned.replace(/\d+弄.*$/, "");
  if (noLane !== noAlley && noLane !== cleaned) variants.push(noLane);

  return variants;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  const variants = simplifyTaiwanAddress(address);

  for (const variant of variants) {
    const result = await geocodeWithNominatim(variant).catch(() => null);
    if (result) return result;
  }

  // Fallback: try Google with original address
  const googleResult = await geocodeWithGoogle(address).catch(() => null);
  if (googleResult) return googleResult;

  throw new Error(`無法解析地址: ${address}`);
}
