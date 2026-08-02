"use client";

import { useEffect, useRef, useState } from "react";
import { TruckIcon, RouteIcon, WalletIcon, CloseIcon, SirenIcon } from "@/components/Icons";
import { createAlertSiren } from "@/lib/alertSiren";

/**
 * Full-screen "new nearby load" alert — the driver-portal equivalent of an
 * InDrive/Yango incoming-ride screen. Rings continuously (Web Audio, no
 * asset file) until the driver accepts or dismisses, so a busy or
 * low-literacy driver can't miss it even with the phone in their pocket.
 */
export default function LoadAlertOverlay({ load, onAccept, onDismiss }) {
  const sirenRef = useRef(null);
  const [needsSoundTap, setNeedsSoundTap] = useState(false);

  useEffect(() => {
    if (!load) return;
    sirenRef.current = createAlertSiren();
    const started = sirenRef.current.start();
    setNeedsSoundTap(!started);
    return () => sirenRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load?.id]);

  if (!load) return null;

  function stopSiren() {
    sirenRef.current?.stop();
  }

  function handleAccept() {
    stopSiren();
    onAccept(load);
  }

  function handleDismiss() {
    stopSiren();
    onDismiss();
  }

  function enableSound() {
    const started = sirenRef.current?.start();
    setNeedsSoundTap(!started);
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-brand-navy/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center animate-[fadeIn_0.2s_ease-out]">
      <div className="w-24 h-24 rounded-full bg-brand-orange/20 flex items-center justify-center mb-6 relative">
        <span className="absolute inset-0 rounded-full bg-brand-orange/30 animate-ping" />
        <SirenIcon className="w-11 h-11 text-brand-orange relative" />
      </div>

      {needsSoundTap && (
        <button
          onClick={enableSound}
          className="mb-4 text-xs font-semibold text-white bg-white/10 px-4 py-2 rounded-full"
        >
          🔊 Tap to enable alert sound
        </button>
      )}

      <p className="text-brand-orange font-bold uppercase tracking-wide text-sm mb-2">New Load Nearby</p>
      <h2 className="text-white text-2xl sm:text-3xl font-bold mb-6">{load.commodity}</h2>

      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 mb-8">
        <div className="flex items-center gap-3 text-left">
          <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl shrink-0">
            <RouteIcon className="w-5 h-5" />
          </span>
          <div>
            <p className="font-semibold text-brand-navy text-sm">{load.pickup_location} &rarr; {load.dropoff_location}</p>
            <p className="text-xs text-slate-500">
              {load.quantity_value ?? load.quantity_munds} {load.quantity_unit ?? "Munds"} · {load.distance_km} km away
            </p>
          </div>
        </div>
        {load.offered_rate && (
          <div className="flex items-center gap-3 text-left">
            <span className="icon-badge bg-green-50 text-green-600 w-11 h-11 rounded-xl shrink-0">
              <WalletIcon className="w-5 h-5" />
            </span>
            <p className="font-semibold text-brand-navy text-sm">PKR {load.offered_rate}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 w-full max-w-sm">
        <button
          onClick={handleDismiss}
          className="flex-1 flex items-center justify-center gap-2 border-2 border-white/30 text-white font-semibold py-3.5 rounded-full"
        >
          <CloseIcon className="w-4 h-4" /> Dismiss
        </button>
        <button
          onClick={handleAccept}
          className="flex-1 flex items-center justify-center gap-2 bg-brand-orange text-white font-semibold py-3.5 rounded-full shadow-lg"
        >
          <TruckIcon className="w-4 h-4" /> Accept
        </button>
      </div>
    </div>
  );
}
