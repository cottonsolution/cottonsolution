"use client";

import { PhoneIcon } from "@/components/Icons";

/**
 * In-app "Call" button (functional requirement #4 — calling side).
 *
 * Uses the device's native `tel:` dialer — the simplest, most reliable way
 * to connect a driver and merchant directly on both Android and iOS without
 * standing up a separate VoIP/PBX backend. Tapping it opens the phone app
 * with the number pre-filled; the person just taps "Call".
 *
 * Renders nothing (returns null) if no phone number is available, so it's
 * always safe to drop into a card even before a number is loaded.
 */
export default function CallButton({ phone, label = "Call", className = "" }) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[^\d+]/g, "");

  return (
    <a
      href={`tel:${cleaned}`}
      onClick={(e) => e.stopPropagation()}
      className={
        className ||
        "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
      }
      aria-label={`Call ${phone}`}
    >
      <PhoneIcon className="w-4 h-4" /> {label}
    </a>
  );
}
