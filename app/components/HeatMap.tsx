"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { Entry } from "@/lib/types";

// Fix Leaflet default marker icon issue in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const markersRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }
    if (markersRef.current) {
      map.removeLayer(markersRef.current);
    }

    if (entries.length === 0) return;

    const points: L.HeatLatLngTuple[] = entries.map((e) => [e.lat, e.lng, 1]);

    heatLayerRef.current = L.heatLayer(points, {
      radius: 40,
      blur: 25,
      maxZoom: 12,
      minOpacity: 0.4,
    });
    heatLayerRef.current.addTo(map);

    // Add circle markers with popups
    markersRef.current = L.layerGroup();
    for (const entry of entries) {
      L.circleMarker([entry.lat, entry.lng], {
        radius: 6,
        color: "#e53e3e",
        fillColor: "#fc8181",
        fillOpacity: 0.8,
        weight: 2,
      })
        .bindPopup(
          `<b>${entry.nickname}</b><br/>${entry.address}${entry.tag ? `<br/><i>${entry.tag}</i>` : ""}`
        )
        .addTo(markersRef.current!);
    }
    markersRef.current.addTo(map);

    // Auto-fit bounds with max zoom limit
    const bounds = L.latLngBounds(entries.map((e) => [e.lat, e.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
      if (markersRef.current) {
        map.removeLayer(markersRef.current);
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
