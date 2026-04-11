"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Entry } from "@/lib/types";

// Fix Leaflet default marker icon issue in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [19.75, 96.13]; // Myanmar
const DEFAULT_ZOOM = 6;

function createCountIcon(count: number) {
  const size = count < 10 ? 36 : count < 100 ? 44 : 52;
  return L.divIcon({
    html: `<div style="
      background: rgba(229, 62, 62, 0.85);
      color: white;
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: ${size < 44 ? 14 : 16}px;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${count}</div>`,
    className: "",
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  });
}

function HeatLayer({ entries }: { entries: Entry[] }) {
  const map = useMap();
  const heatLayerRef = useRef<L.HeatLayer | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
    }
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
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

    // Marker cluster with count display
    clusterRef.current = L.markerClusterGroup({
      iconCreateFunction: (cluster) => createCountIcon(cluster.getChildCount()),
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });

    for (const entry of entries) {
      const marker = L.marker([entry.lat, entry.lng], {
        icon: L.divIcon({
          html: `<div style="
            background: #e53e3e;
            color: white;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            border: 2px solid white;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
          ">1</div>`,
          className: "",
          iconSize: L.point(28, 28),
          iconAnchor: L.point(14, 14),
        }),
      }).bindPopup(
        `<b>${entry.nickname}</b><br/>${entry.address}${entry.tag ? `<br/><i>${entry.tag}</i>` : ""}`
      );
      clusterRef.current.addLayer(marker);
    }
    map.addLayer(clusterRef.current);

    // Auto-fit bounds
    const bounds = L.latLngBounds(entries.map((e) => [e.lat, e.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
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
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <HeatLayer entries={entries} />
    </MapContainer>
  );
}
