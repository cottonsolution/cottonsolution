"use client";

import { useEffect, useState } from "react";
import {
  RouteIcon,
  TruckCheckIcon,
  CloseIcon,
  CheckCircleIcon,
  UploadIcon,
  ClockIcon,
  EyeIcon,
  ChatIcon,
} from "@/components/Icons";
import { TRIP_STAGES, MAX_STAGE, stageMeta, effectiveStage } from "@/lib/tripStages";
import { supabase } from "@/lib/supabaseBrowserClient";
import {
  startDocumentation,
  uploadWeighmentSlip,
  markOnTheWay,
  uploadArrivalProof,
  markRentReceived,
} from "@/lib/shipmentActions";
import BiltyModal from "@/components/BiltyModal";
import LoadChatButton from "@/components/chat/LoadChatButton";
import CallButton from "@/components/CallButton";
import { useLockBodyScroll } from "@/lib/useLockBodyScroll";

/**
 * Persistent band at the top of the dashboard while the driver is in Work
 * Mode. Tapping a load opens the full 6-step tracking line, including the
 * Documentation (weighment slip + Bilty) and arrival-approval steps.
 */
export default function WorkTaskBar({ loads, driverId, onChanged }) {
  const [openLoad, setOpenLoad] = useState(null);
  const active = loads.filter((l) => effectiveStage(l) < MAX_STAGE);

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
                <StageIcon className="w-3.5 h-3.5" /> Step {stage.value}/{MAX_STAGE} — {stage.label}
              </span>
            </button>
          );
        })}
      </div>

      {openLoad && (
        <TripTrackerModal
          load={openLoad}
          driverId={driverId}
          onClose={() => setOpenLoad(null)}
          onChanged={async (fresh) => {
            setOpenLoad(fresh);
            await onChanged?.();
          }}
        />
      )}
    </>
  );
}

export function TripTrackerModal({ load, driverId, onClose, onChanged, autoOpenChat, onChatOpened }) {
  useLockBodyScroll(true);
  const current = effectiveStage(load);
  const [busy, setBusy] = useState(false);
  const [bilty, setBilty] = useState(null);
  const [showBilty, setShowBilty] = useState(false);
  const [error, setError] = useState("");
  const [merchantPhone, setMerchantPhone] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("profiles")
      .select("phone")
      .eq("id", load.merchant_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setMerchantPhone(data?.phone ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [load.merchant_id]);

  async function refreshBilty() {
    const { data } = await supabase.from("biltys").select("*").eq("load_id", load.id).maybeSingle();
    setBilty(data ?? null);
  }
  useEffect(() => {
    refreshBilty();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load.id]);

  // Live-refresh the Bilty the instant the merchant submits it, so the
  // driver's "Mark On the Way" unlocks without needing to close/reopen.
  useEffect(() => {
    const channel = supabase
      .channel(`bilty-watch-${load.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "biltys", filter: `load_id=eq.${load.id}` }, ({ new: row }) => {
        setBilty(row);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load.id]);

  async function refreshLoad() {
    const { data } = await supabase.from("loads").select("*").eq("id", load.id).maybeSingle();
    if (data) await onChanged(data);
  }

  async function handleStartDocumentation() {
    setBusy(true);
    setError("");
    const { error: err } = await startDocumentation(load.id);
    setBusy(false);
    if (err) return setError(err.message);
    await refreshLoad();
  }

  async function handleUploadSlip(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await uploadWeighmentSlip({ load, file, driverId, merchantId: load.merchant_id });
      await refreshLoad();
    } catch (err) {
      setError(err.message || "Upload failed.");
    }
    setBusy(false);
  }

  async function handleMarkOnTheWay() {
    setBusy(true);
    setError("");
    try {
      await markOnTheWay({ load, merchantId: load.merchant_id });
      await refreshLoad();
    } catch (err) {
      setError(err.message || "Could not update trip status.");
    }
    setBusy(false);
  }

  async function handleUploadArrival(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await uploadArrivalProof({ load, file, driverId, merchantId: load.merchant_id });
      await refreshLoad();
    } catch (err) {
      setError(err.message || "Upload failed.");
    }
    setBusy(false);
  }

  async function handleMarkRentReceived() {
    setBusy(true);
    setError("");
    const { error: err } = await markRentReceived(load);
    setBusy(false);
    if (err) return setError(err.message);
    await refreshLoad();
  }

  const biltySubmitted = bilty?.status === "submitted";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-brand-navy">Load Tracking</h3>
          <div className="flex items-center gap-1">
            <CallButton
              phone={merchantPhone}
              label=""
              className="w-9 h-9 flex items-center justify-center rounded-full text-green-600 bg-green-500/10"
            />
            <LoadChatButton
              loadId={load.id}
              currentUserId={driverId}
              label=""
              counterpartLabel="Chat with Merchant"
              className="w-9 h-9 flex items-center justify-center rounded-full text-brand-orange bg-brand-orange/10"
              autoOpen={autoOpenChat}
              onOpened={onChatOpened}
            />
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400" aria-label="Close">
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          {load.commodity} — {load.pickup_location} &rarr; {load.dropoff_location}
        </p>

        <div className="space-y-0 mb-2">
          {TRIP_STAGES.filter((s) => s.value > 0).map((stage, i, arr) => {
            const done = stage.value < current;
            const isCurrent = stage.value === current;
            const StageIcon = stage.icon;
            return (
              <div key={stage.value} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      done ? "bg-green-500 text-white" : isCurrent ? "bg-brand-orange text-white" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {done ? <CheckCircleIcon className="w-4 h-4" /> : <StageIcon className="w-4 h-4" />}
                  </span>
                  {i < arr.length - 1 && <span className={`w-0.5 flex-1 min-h-[22px] ${done ? "bg-green-500" : "bg-slate-200"}`} />}
                </div>
                <div className="pb-5 pt-1 flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isCurrent ? "text-brand-navy" : done ? "text-green-700" : "text-slate-400"}`}>
                    {stage.label}
                  </p>

                  {/* ---- Stage 1: Load Accepted ---- */}
                  {isCurrent && stage.value === 1 && (
                    <button onClick={handleStartDocumentation} disabled={busy} className="btn-orange mt-2 text-sm py-2">
                      {busy ? "Please wait..." : "Start Documentation"}
                    </button>
                  )}

                  {/* ---- Stage 2: Documentation ---- */}
                  {isCurrent && stage.value === 2 && (
                    <div className="mt-2 space-y-2">
                      {load.weighment_slip_status === "resubmit_requested" && (
                        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                          The merchant asked you to re-upload the slip
                          {load.weighment_slip_note ? <>: &ldquo;{load.weighment_slip_note}&rdquo;</> : "."}
                        </p>
                      )}

                      {!load.weighment_slip_url || load.weighment_slip_status === "resubmit_requested" ? (
                        <label className="btn-orange text-sm py-2 cursor-pointer inline-flex">
                          <UploadIcon className="w-4 h-4" />{" "}
                          {busy ? "Uploading..." : load.weighment_slip_url ? "Re-upload Weighment Slip" : "Upload Weighment Slip"}
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUploadSlip} disabled={busy} />
                        </label>
                      ) : (
                        <p className="text-xs text-green-700 flex items-center gap-1.5">
                          <CheckCircleIcon className="w-3.5 h-3.5" /> Weighment slip uploaded.
                        </p>
                      )}

                      {load.weighment_slip_url && load.weighment_slip_status !== "resubmit_requested" && load.weighment_slip_status !== "approved" && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                          <ClockIcon className="w-3.5 h-3.5 shrink-0" /> Waiting for the merchant to review the slip...
                        </p>
                      )}

                      {load.weighment_slip_status === "approved" && !biltySubmitted && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                          <ClockIcon className="w-3.5 h-3.5 shrink-0" /> Slip approved — waiting for the merchant to submit the Bilty...
                        </p>
                      )}

                      {biltySubmitted && (
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => setShowBilty(true)} className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-600">
                            <EyeIcon className="w-4 h-4" /> View / Print Bilty
                          </button>
                          <button onClick={handleMarkOnTheWay} disabled={busy} className="btn-orange text-sm py-2">
                            {busy ? "Please wait..." : "Mark On the Way"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ---- Stage 3: On the Way ---- */}
                  {isCurrent && stage.value === 3 && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-slate-400">Your live GPS is visible to the merchant while you're in Work Mode.</p>
                      <label className="btn-orange text-sm py-2 cursor-pointer inline-flex">
                        <UploadIcon className="w-4 h-4" /> {busy ? "Uploading..." : "Upload Arrival Photo & Mark Reached"}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleUploadArrival} disabled={busy} />
                      </label>
                    </div>
                  )}

                  {/* ---- Stage 4: Reached Destination ---- */}
                  {isCurrent && stage.value === 4 && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-green-700 flex items-center gap-1.5">
                        <CheckCircleIcon className="w-3.5 h-3.5" /> Arrival photo uploaded.
                      </p>
                      {!load.merchant_approved_at ? (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                          <ClockIcon className="w-3.5 h-3.5 shrink-0" /> Waiting for merchant to approve the delivery...
                        </p>
                      ) : (
                        <button onClick={handleMarkRentReceived} disabled={busy} className="btn-orange text-sm py-2">
                          {busy ? "Please wait..." : "Mark Rent Received"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {current >= MAX_STAGE && (
          <p className="text-center text-green-700 text-sm font-semibold mt-2">Trip complete — rent received.</p>
        )}
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>

      {showBilty && bilty && <BiltyModal bilty={bilty} load={load} onClose={() => setShowBilty(false)} />}
    </div>
  );
}
