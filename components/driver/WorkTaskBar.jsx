"use client";

import { RouteIcon, TruckCheckIcon, ClockIcon } from "@/components/Icons";

const STATUS_META = {
  assigned: { label: "Ready to start", color: "bg-blue-100 text-blue-700" },
  in_transit: { label: "On the way", color: "bg-green-100 text-green-700" },
  delivered: { label: "Delivered", color: "bg-slate-100 text-slate-600" },
};

/**
 * Persistent band at the top of the dashboard while the driver is in Work
 * Mode — always-visible status/route/delivery info so they never have to
 * dig through tabs to see what they're currently hauling.
 */
export default function WorkTaskBar({ loads, onAdvance }) {
  const active = loads.filter((l) => l.status !== "delivered");

  if (active.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-3 text-slate-400">
        <span className="icon-badge bg-slate-100 text-slate-400 w-11 h-11 rounded-xl shrink-0">
          <TruckCheckIcon className="w-5 h-5" />
        </span>
        <p className="text-sm font-medium">No active delivery yet — accept a load to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {active.map((l) => {
        const meta = STATUS_META[l.status] ?? STATUS_META.assigned;
        return (
          <div key={l.id} className="bg-white rounded-2xl shadow-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="icon-badge bg-green-500/10 text-green-600 w-12 h-12 rounded-xl shrink-0">
                <RouteIcon className="w-6 h-6" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-brand-navy truncate">
                  {l.commodity} — {l.quantity_value ?? l.quantity_munds} {l.quantity_unit ?? "Munds"}
                </p>
                <p className="text-sm text-slate-500 truncate">{l.pickup_location} &rarr; {l.dropoff_location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${meta.color}`}>
                <ClockIcon className="w-3.5 h-3.5" /> {meta.label}
              </span>
              {l.status !== "delivered" && (
                <button onClick={() => onAdvance(l)} className="btn-orange px-4 py-2 text-sm">
                  <TruckCheckIcon className="w-4 h-4" />
                  {l.status === "assigned" ? "Start Trip" : "Mark Delivered"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
