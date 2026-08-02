"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { TruckIcon } from "@/components/Icons";

// Leaflet calls L.DomEvent.disableClickPropagation on every Popup's
// container so clicks inside it don't pan/zoom or close the map — but that
// also stops the click from ever bubbling up to React's root listener,
// which is how React's onClick normally gets triggered. The result: a
// plain <button onClick={...}> inside a Popup silently does nothing.
// Fix: attach a real, native click listener straight to the button via a
// ref, which fires before propagation is stopped further up the tree.
function AcceptButton({ onClick }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const handler = (e) => {
      e.stopPropagation();
      onClick();
    };
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [onClick]);

  return (
    <button ref={ref} type="button" className="btn-orange w-full text-xs py-2">
      <TruckIcon className="w-3.5 h-3.5" /> Accept Load
    </button>
  );
}

const PAKISTAN_CENTER = { lat: 30.1575, lng: 71.5249 }; // roughly Multan — sane default before GPS locks on

// Custom pin markers built from inline SVG (divIcon) so we never depend on
// Leaflet's default marker image assets, which commonly 404 under Next.js
// bundling unless manually copied to /public.
function pinIcon({ bg, pulse }) {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:34px;height:34px;">
        ${pulse ? `<span style="position:absolute;inset:0;border-radius:9999px;background:${bg};opacity:0.35;animation:driverPulse 1.8s ease-out infinite;"></span>` : ""}
        <div style="position:relative;width:34px;height:34px;border-radius:9999px;background:${bg};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
          <div style="width:10px;height:10px;border-radius:9999px;background:white;"></div>
        </div>
      </div>
      <style>
        @keyframes driverPulse { 0%{transform:scale(0.6);opacity:0.45;} 100%{transform:scale(2.1);opacity:0;} }
      </style>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

const driverIcon = pinIcon({ bg: "#2563eb", pulse: true });
const loadIcon = pinIcon({ bg: "#f2711f", pulse: false });

// Keeps the map centered on the driver as their GPS position updates,
// without fighting the user if they've manually panned/zoomed recently.
function RecenterOnMove({ position }) {
  const map = useMap();
  const hasCenteredRef = useRef(false);
  useEffect(() => {
    if (!position) return;
    if (!hasCenteredRef.current) {
      map.setView([position.lat, position.lng], 12);
      hasCenteredRef.current = true;
    }
  }, [position, map]);
  return null;
}

export default function DriverMap({ driverPosition, loads = [], onAccept, radiusKm }) {
  const center = driverPosition ?? PAKISTAN_CENTER;

  return (
    <div className="relative w-full h-[420px] sm:h-[520px] rounded-2xl overflow-hidden shadow-card">
      <MapContainer center={[center.lat, center.lng]} zoom={driverPosition ? 12 : 6} className="w-full h-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterOnMove position={driverPosition} />

        {driverPosition && (
          <Marker position={[driverPosition.lat, driverPosition.lng]} icon={driverIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}

        {loads.map((load) => (
          <Marker key={load.id} position={[load.pickup_lat, load.pickup_lng]} icon={loadIcon}>
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-semibold text-brand-navy mb-1">
                  {load.commodity} — {load.quantity_value ?? load.quantity_munds} {load.quantity_unit ?? "Munds"}
                </p>
                <p className="text-xs text-slate-500 mb-1">
                  {load.pickup_location} &rarr; {load.dropoff_location}
                </p>
                <p className="text-xs text-brand-orange font-semibold mb-2">{load.distance_km} km away</p>
                {load.offered_rate && <p className="text-xs text-slate-600 mb-2">PKR {load.offered_rate}</p>}
                <AcceptButton onClick={() => onAccept?.(load)} />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {radiusKm && (
        <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-card text-xs font-semibold text-brand-navy">
          Showing loads within {radiusKm} km
        </div>
      )}
    </div>
  );
}
