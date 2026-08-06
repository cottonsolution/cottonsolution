// Straight-line distance between two lat/lng points, in kilometers.
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Real road distance (km) between two pinned points, used by the "Post a
 * Load" form to auto-suggest a fare (functional requirement #1).
 *
 * This project already runs on the free OpenStreetMap / Leaflet stack (see
 * LocationAutocomplete.jsx, DriverMap.jsx) instead of a paid Google Maps key,
 * so distance here is fetched from OSRM's public routing API — the OSM
 * equivalent of the Google Distance Matrix API, no API key required:
 *   https://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}
 *
 * If the OSRM request fails (offline, rate-limited, etc.) this falls back to
 * the straight-line haversine distance scaled by a 1.3x "road-windiness"
 * factor, a reasonable approximation for Pakistani highway routes.
 *
 * @param {{lat:number,lng:number}} pickup
 * @param {{lat:number,lng:number}} dropoff
 * @returns {Promise<{ km: number, source: "osrm" | "estimated" }>}
 */
export async function getRoadDistanceKm(pickup, dropoff) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=false&alternatives=false&steps=false`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const meters = data?.routes?.[0]?.distance;
      if (typeof meters === "number" && meters > 0) {
        return { km: Math.round((meters / 1000) * 10) / 10, source: "osrm" };
      }
    }
  } catch {
    // fall through to the haversine estimate below
  }
  const straight = haversineKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
  return { km: Math.round(straight * 1.3 * 10) / 10, source: "estimated" };
}
