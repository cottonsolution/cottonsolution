"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowserClient";

/**
 * Watches the browser's GPS position continuously (navigator.geolocation.
 * watchPosition) and writes it to this driver's `vehicles` row so:
 *  - the driver's own map can center on "you are here"
 *  - the nearby_open_loads() database function can find loads close to them
 *
 * Writes are throttled to once every MIN_UPDATE_MS so a driver's phone
 * doesn't hammer the database while sitting still with a jittery GPS signal.
 *
 * @param {string|null} vehicleId  This driver's vehicles.id (skip if null — no vehicle yet)
 * @param {boolean} active         Only track while true (e.g. mode is "working" or "searching")
 */
const MIN_UPDATE_MS = 12000;

export function useLiveLocation(vehicleId, active) {
  const [position, setPosition] = useState(null); // { lat, lng }
  const [error, setError] = useState("");
  const lastWriteRef = useRef(0);

  useEffect(() => {
    if (!active || !vehicleId) return undefined;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location services aren't available on this device.");
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });
        setError("");

        const now = Date.now();
        if (now - lastWriteRef.current < MIN_UPDATE_MS) return;
        lastWriteRef.current = now;

        supabase
          .from("vehicles")
          .update({ current_lat: lat, current_lng: lng, location_updated_at: new Date().toISOString() })
          .eq("id", vehicleId)
          .then(() => {});
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location access was denied — turn it on to see nearby loads."
            : "Couldn't get your location. Check your GPS signal."
        );
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [vehicleId, active]);

  return { position, error };
}
