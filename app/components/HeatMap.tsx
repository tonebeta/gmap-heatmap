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
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
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

    const points: L.HeatLatLngTuple[] = entries.map((e) => [e.lat, e.lng, 1]);

    heatLayerRef.current = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    });
    heatLayerRef.current.addTo(map);

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
    <MapContainer center={TAIWAN_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <HeatLayer entries={entries} />
    </MapContainer>
  );
}
