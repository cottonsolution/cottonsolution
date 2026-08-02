"use client";

import { useState } from "react";
import { RouteIcon, TruckCheckIcon, CloseIcon, CheckCircleIcon } from "@/components/Icons";
import { TRIP_STAGES, stageMeta, effectiveStage } from "@/lib/tripStages";

/**
 * Persistent band at the top of the dashboard while the driver is in Work
 * Mode. Tapping a load opens the full 8-step tracking line so the driver
 * (and, indirectly, the merchant watching the coarse status) always knows
 * exactly where the shipment stands.
 */
export default function WorkTaskBar({ loads, onAdvanceStage }) {
  const [openLoad, setOpenLoad] = useState(null);
  const active = loads.filter((l) => effectiveStage(l) < 8);

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
    <>
      <div className="space-y-3">
        {active.map((l) => {
          const stage = stageMeta(effectiveStage(l));
          const StageIcon = stage.icon;
          return (
            <button
              key={l.id}
              onClick={() => setOpenLoad(l)}
              className="w-full text-left bg-white rounded-2xl shadow-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:ring-2 hover:ring-brand-orange/40 transition-shadow"
            >
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-brand-orangeSoft text-brand-orangeDark shrink-0">
                <StageIcon className="w-3.5 h-3.5" /> Step {stage.value}/8 — {stage.label}
              </span>
            </button>
          );
        })}
      </div>

      {openLoad && (
        <TripTrackerModal
          load={openLoad}
          onClose={() => setOpenLoad(null)}
          onAdvanceStage={async (nextStage) => {
            await onAdvanceStage(openLoad, nextStage);
            setOpenLoad((prev) => (prev ? { ...prev, trip_stage: nextStage } : prev));
          }}
        />
      )}
    </>
  );
}

function TripTrackerModal({ load, onClose, onAdvanceStage }) {
  const current = effectiveStage(load);
  const [advancing, setAdvancing] = useState(false);

  async function handleAdvance() {
    if (current >= 8) return;
    setAdvancing(true);
    await onAdvanceStage(current + 1);
    setAdvancing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl p-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-brand-navy">Load Tracking</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          {load.commodity} — {load.pickup_location} &rarr; {load.dropoff_location}
        </p>

        <div className="space-y-0">
          {TRIP_STAGES.map((stage, i) => {
            const done = stage.value < current;
            const isCurrent = stage.value === current;
            const StageIcon = stage.icon;
            return (
              <div key={stage.value} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      done
                        ? "bg-green-500 text-white"
                        : isCurrent
                        ? "bg-brand-orange text-white"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {done ? <CheckCircleIcon className="w-4 h-4" /> : <StageIcon className="w-4 h-4" />}
                  </span>
                  {i < TRIP_STAGES.length - 1 && (
                    <span className={`w-0.5 flex-1 min-h-[22px] ${done ? "bg-green-500" : "bg-slate-200"}`} />
                  )}
                </div>
                <div className="pb-5 pt-1">
                  <p className={`text-sm font-semibold ${isCurrent ? "text-brand-navy" : done ? "text-green-700" : "text-slate-400"}`}>
                    {stage.label}
                  </p>
                  {isCurrent && <p className="text-xs text-slate-400 mt-0.5">Current step</p>}
                </div>
              </div>
            );
          })}
        </div>

        {current < 8 ? (
          <button onClick={handleAdvance} disabled={advancing} className="btn-orange w-full mt-2">
            {advancing ? "Updating..." : `Mark "${stageMeta(current + 1).label}" Done`}
          </button>
        ) : (
          <p className="text-center text-green-700 text-sm font-semibold mt-2">Trip complete — rent received.</p>
        )}
      </div>
    </div>
  );
}
