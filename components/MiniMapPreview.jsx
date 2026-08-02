"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

// Same inline-SVG divIcon technique as DriverMap.jsx — avoids depending on
// Leaflet's default marker image assets, which 404 under Next.js unless
// manually copied into /public.
const pinIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:28px;height:28px;">
      <div style="width:28px;height:28px;border-radius:9999px;background:#f2711f;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <div style="width:8px;height:8px;border-radius:9999px;background:white;"></div>
      </div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export default function MiniMapPreview({ lat, lng }) {
  if (lat == null || lng == null) return null;
  return (
    <div className="w-full h-[160px] rounded-xl overflow-hidden shadow-card border border-slate-100">
      <MapContainer
        key={`${lat}-${lng}`}
        center={[lat, lng]}
        zoom={13}
        className="w-full h-full"
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
      >
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}
