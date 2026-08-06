"use client";

import { TruckIcon, MoonIcon } from "@/components/Icons";

export const MODES = [
  {
    key: "searching",
    label: "Work Mode",
    sublabel: "Available for loads",
    icon: TruckIcon,
    activeClasses: "bg-green-500 text-white",
  },
  {
    key: "resting",
    label: "Rest Mode",
    sublabel: "Offline / resting",
    icon: MoonIcon,
    activeClasses: "bg-brand-orangeDark text-white",
  },
];

/**
 * Big-tap-target, colour-coded 2-way switch — deliberately not a small
 * dropdown, since the driver audience may not read English/Urdu labels
 * confidently. Colour + icon alone should be enough to tell the modes
 * apart: green truck = Work Mode (available, searching for loads, GPS on),
 * orange moon = Rest Mode (offline).
 *
 * A third internal state, "working" (actively on a delivery), still exists
 * and still drives live GPS + the trip tracker — it's set automatically the
 * moment a load is accepted (see acceptLoad / onAccepted in the dashboard),
 * so it never needs its own button here.
 */
export default function ModeSwitcher({ mode, onChange, disabled }) {
  // While on a delivery, show Work Mode as the active state (a driver who's
  // "working" is obviously not resting) — tapping either button here simply
  // sets the driver back to available-or-offline once the trip is done.
  const effectiveMode = mode === "working" ? "searching" : mode;

  return (
    <div className="grid grid-cols-2 gap-2 bg-white rounded-2xl shadow-card p-2">
      {MODES.map((m) => {
        const active = effectiveMode === m.key;
        return (
          <button
            key={m.key}
            disabled={disabled}
            onClick={() => onChange(m.key)}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl py-3.5 px-2 transition-all disabled:opacity-50 ${
              active ? `${m.activeClasses} shadow-md scale-[1.02]` : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            <m.icon className="w-6 h-6" />
            <span className="text-xs font-bold leading-tight text-center">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
