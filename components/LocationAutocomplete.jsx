"use client";

/**
 * LocationAutocomplete
 * ---------------------------------------------------------------------------
 * Interactive location search field used for the Post Load form's Pickup
 * and Drop-off fields (functional requirements #4 & #5).
 *
 * Equivalent to Google Places Autocomplete, but built on the OpenStreetMap /
 * Leaflet stack this project already ships (see components/driver/DriverMap.jsx)
 * so no external API key is required:
 *   - Search-as-you-type suggestions come from OSM's free Nominatim geocoder.
 *   - Picking a suggestion drops a pin on a small preview map so the merchant
 *     can visually confirm the point before submitting.
 *   - Selecting a suggestion returns { label, lat, lng, place_id } to the
 *     parent form via onSelect(...).
 *
 * Props:
 *   label        - field label text, e.g. "Pickup Location"
 *   value        - current text value (controlled)
 *   onChangeText - (text) => void, fired on every keystroke
 *   onSelect     - ({ label, lat, lng, place_id }) => void, fired on pick
 *   coords       - { lat, lng } | null — current pinned point (for the preview map)
 *   required     - boolean
 */

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapPinIcon, SearchIcon, CrosshairIcon } from "@/components/Icons";

const MiniMapPreview = dynamic(() => import("./MiniMapPreview"), { ssr: false });

let debounceTimer = null;

export default function LocationAutocomplete({
  label,
  value,
  onChangeText,
  onSelect,
  coords,
  required = false,
  placeholder = "Search a city, town, or address…",
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleInput(text) {
    onChangeText(text);
    setOpen(true);
    clearTimeout(debounceTimer);

    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=6&countrycodes=pk&q=${encodeURIComponent(
            text
          )}`,
          { headers: { Accept: "application/json" } }
        );
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  function pick(place) {
    const label = place.display_name;
    onChangeText(label);
    onSelect({
      label,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      place_id: String(place.place_id ?? place.osm_id ?? ""),
    });
    setSuggestions([]);
    setOpen(false);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        onSelect({ label: value || "My current location", lat, lng, place_id: "" });
        // Reverse-geocode so the text field shows a readable address.
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            { headers: { Accept: "application/json" } }
          );
          const data = await res.json();
          if (data?.display_name) onChangeText(data.display_name);
        } catch {
          // keep whatever text was already there
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="field-label">
        <MapPinIcon className="w-4 h-4 text-brand-orange" /> {label}
      </label>

      <div className="relative">
        <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          required={required}
          value={value}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => value?.trim().length >= 3 && setOpen(true)}
          placeholder={placeholder}
          className="field-input pl-9"
          autoComplete="off"
        />
      </div>

      {open && (loading || suggestions.length > 0) && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-card border border-slate-100 max-h-64 overflow-y-auto">
          {loading && <p className="px-4 py-2.5 text-xs text-slate-400">Searching…</p>}
          {!loading &&
            suggestions.map((s) => (
              <button
                type="button"
                key={s.place_id}
                onClick={() => pick(s)}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-brand-orangeSoft flex items-start gap-2"
              >
                <MapPinIcon className="w-3.5 h-3.5 text-brand-orange mt-0.5 shrink-0" />
                <span className="truncate">{s.display_name}</span>
              </button>
            ))}
        </div>
      )}

      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className={`mt-2 w-full inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border-2 transition-colors disabled:opacity-50 ${
          coords ? "border-green-500 bg-green-50 text-green-700" : "border-brand-orange/40 text-brand-orange hover:bg-brand-orangeSoft"
        }`}
      >
        <CrosshairIcon className="w-4 h-4" />
        {locating ? "Locating…" : coords ? "Location pinned on map" : "Use My Current Location"}
      </button>

      {coords && (
        <div className="mt-2">
          <MiniMapPreview lat={coords.lat} lng={coords.lng} />
        </div>
      )}
    </div>
  );
}
