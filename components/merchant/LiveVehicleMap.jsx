"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

function pinIcon({ bg, pulse }) {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:32px;height:32px;">
        ${pulse ? `<span style="position:absolute;inset:0;border-radius:9999px;background:${bg};opacity:0.35;animation:liveTrackPulse 1.8s ease-out infinite;"></span>` : ""}
        <div style="position:relative;width:32px;height:32px;border-radius:9999px;background:${bg};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
          <div style="width:9px;height:9px;border-radius:9999px;background:white;"></div>
        </div>
      </div>
      <style>
        @keyframes liveTrackPulse { 0%{transform:scale(0.6);opacity:0.45;} 100%{transform:scale(2.1);opacity:0;} }
      </style>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

const truckIcon = pinIcon({ bg: "#2563eb", pulse: true });
const destinationIcon = pinIcon({ bg: "#16a34a", pulse: false });

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

/**
 * Merchant-side "On the Way" live map — the truck's marker updates on its
 * own via the realtime subscription set up by the caller (see
 * `ShipmentTracking` in the merchant dashboard), no polling needed.
 */
export default function LiveVehicleMap({ vehiclePosition, destination, driverName, vehicleNo }) {
  const center = vehiclePosition ?? destination;
  if (!center) {
    return (
      <div className="w-full h-[220px] rounded-xl bg-slate-100 flex items-center justify-center text-sm text-slate-400">
        Waiting for the driver&apos;s GPS signal...
      </div>
    );
  }

  return (
    <div className="w-full h-[260px] rounded-xl overflow-hidden shadow-card border border-slate-100">
      <MapContainer center={[center.lat, center.lng]} zoom={12} className="w-full h-full" scrollWheelZoom={false}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <RecenterOnMove position={vehiclePosition} />

        {vehiclePosition && (
          <Marker position={[vehiclePosition.lat, vehiclePosition.lng]} icon={truckIcon}>
            <Popup>
              {vehicleNo || "Your truck"} {driverName ? `— ${driverName}` : ""}
            </Popup>
          </Marker>
        )}
        {destination && (
          <Marker position={[destination.lat, destination.lng]} icon={destinationIcon}>
            <Popup>Drop-off</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
