"use client";

import { useEffect, useRef, useState } from "react";
import { TruckIcon, PhoneIcon, CloseIcon, SirenIcon, IdCardIcon } from "@/components/Icons";
import { createAlertSiren } from "@/lib/alertSiren";

/**
 * Merchant-side equivalent of the driver's LoadAlertOverlay: the instant a
 * driver accepts one of this merchant's loads, this rings full-screen with
 * the truck + driver details, the same way an incoming call would.
 */
export default function LoadAcceptedAlert({ load, vehicle, onDismiss }) {
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

  function handleDismiss() {
    sirenRef.current?.stop();
    onDismiss();
  }

  function enableSound() {
    const started = sirenRef.current?.start();
    setNeedsSoundTap(!started);
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-brand-navy/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center animate-[fadeIn_0.2s_ease-out]">
      <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6 relative">
        <span className="absolute inset-0 rounded-full bg-green-500/30 animate-ping" />
        <SirenIcon className="w-11 h-11 text-green-400 relative" />
      </div>

      {needsSoundTap && (
        <button onClick={enableSound} className="mb-4 text-xs font-semibold text-white bg-white/10 px-4 py-2 rounded-full">
          🔊 Tap to enable alert sound
        </button>
      )}

      <p className="text-green-400 font-bold uppercase tracking-wide text-sm mb-2">Driver Accepted!</p>
      <h2 className="text-white text-2xl sm:text-3xl font-bold mb-6">{load.commodity} Shipment</h2>

      <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 mb-8">
        <div className="flex items-center gap-3 text-left">
          <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl shrink-0">
            <TruckIcon className="w-5 h-5" />
          </span>
          <div>
            <p className="font-semibold text-brand-navy text-sm">{vehicle?.vehicle_no || "Vehicle"}</p>
            <p className="text-xs text-slate-500">{vehicle?.vehicle_type || ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-left">
          <span className="icon-badge bg-blue-50 text-blue-600 w-11 h-11 rounded-xl shrink-0">
            <IdCardIcon className="w-5 h-5" />
          </span>
          <p className="font-semibold text-brand-navy text-sm">{vehicle?.driver_name || "Driver"}</p>
        </div>
        {vehicle?.mobile_no && (
          <div className="flex items-center gap-3 text-left">
            <span className="icon-badge bg-green-50 text-green-600 w-11 h-11 rounded-xl shrink-0">
              <PhoneIcon className="w-5 h-5" />
            </span>
            <a href={`tel:${vehicle.mobile_no}`} className="font-semibold text-brand-navy text-sm">
              {vehicle.mobile_no}
            </a>
          </div>
        )}
      </div>

      <button
        onClick={handleDismiss}
        className="flex items-center justify-center gap-2 bg-brand-orange text-white font-semibold py-3.5 rounded-full shadow-lg w-full max-w-sm"
      >
        <CloseIcon className="w-4 h-4" /> OK, View Shipment
      </button>
    </div>
  );
}
