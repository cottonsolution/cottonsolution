"use client";

import { TruckIcon, MoonIcon, RadarIcon } from "@/components/Icons";

export const MODES = [
  {
    key: "working",
    label: "Work Mode",
    sublabel: "On a delivery",
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
  {
    key: "searching",
    label: "Find Loads",
    sublabel: "Searching nearby",
    icon: RadarIcon,
    activeClasses: "bg-blue-600 text-white",
  },
];

/**
 * Big-tap-target, colour-coded 3-way switch — deliberately not a small
 * dropdown, since the driver audience may not read English/Urdu labels
 * confidently. Colour + icon alone should be enough to tell the modes apart:
 * green truck = working, orange moon = resting, blue radar = searching.
 */
export default function ModeSwitcher({ mode, onChange, disabled }) {
  return (
    <div className="grid grid-cols-3 gap-2 bg-white rounded-2xl shadow-card p-2">
      {MODES.map((m) => {
        const active = mode === m.key;
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
