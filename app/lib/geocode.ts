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

export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  const nominatimResult = await geocodeWithNominatim(address).catch(() => null);
  if (nominatimResult) return nominatimResult;
  const googleResult = await geocodeWithGoogle(address).catch(() => null);
  if (googleResult) return googleResult;
  throw new Error(`無法解析地址: ${address}`);
}
