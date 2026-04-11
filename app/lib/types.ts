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
