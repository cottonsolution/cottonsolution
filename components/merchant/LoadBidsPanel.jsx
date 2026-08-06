"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowserClient";
import { notifyDriverBidAccepted, notifyDriverBidRejected } from "@/lib/shipmentActions";
import CallButton from "@/components/CallButton";
import LoadChatButton from "@/components/chat/LoadChatButton";
import {
  CloseIcon,
  GavelIcon,
  TruckIcon,
  UserIcon,
  WalletIcon,
  CheckCircleIcon,
  ClockIcon,
  TrashIcon,
} from "@/components/Icons";

/**
 * Merchant "Bid Review" screen (functional requirement #3).
 *
 * Lists every bid a driver has placed on one specific load — live, via
 * Supabase Realtime — cheapest first, so the merchant can compare offers at
 * a glance, call/chat a driver directly, and finalize the deal with one tap.
 * Accepting a bid calls the `accept_bid` RPC (see migration 006), which
 * atomically:
 *   - marks that bid 'accepted'
 *   - marks every other pending bid on this load 'rejected'
 *   - assigns the load to the winning driver's vehicle
 * so there's no window where two drivers could both think they won.
 */
export default function LoadBidsPanel({ load, merchantId, onClose, onAccepted }) {
  const [bids, setBids] = useState([]);
  const [drivers, setDrivers] = useState({}); // driver_id -> profile
  const [vehicles, setVehicles] = useState({}); // vehicle_id -> vehicle
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh() {
    const { data: bidRows } = await supabase
      .from("bids")
      .select("*")
      .eq("load_id", load.id)
      .order("bid_amount", { ascending: true });
    const rows = bidRows ?? [];
    setBids(rows);

    const driverIds = [...new Set(rows.map((b) => b.driver_id).filter(Boolean))];
    const vehicleIds = [...new Set(rows.map((b) => b.vehicle_id).filter(Boolean))];

    const [{ data: profileRows }, { data: vehicleRows }] = await Promise.all([
      driverIds.length ? supabase.from("profiles").select("id, full_name, phone").in("id", driverIds) : { data: [] },
      vehicleIds.length ? supabase.from("vehicles").select("id, vehicle_no, vehicle_type, mobile_no, driver_name").in("id", vehicleIds) : { data: [] },
    ]);

    setDrivers(Object.fromEntries((profileRows ?? []).map((p) => [p.id, p])));
    setVehicles(Object.fromEntries((vehicleRows ?? []).map((v) => [v.id, v])));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load.id]);

  // Realtime: new counter-bids and status changes appear instantly.
  useEffect(() => {
    const channel = supabase
      .channel(`load-bids-${load.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bids", filter: `load_id=eq.${load.id}` }, () => refresh())
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load.id]);

  async function handleAccept(bid) {
    setBusyId(bid.id);
    setError("");
    const { data: updatedLoad, error: rpcError } = await supabase.rpc("accept_bid", { p_bid_id: bid.id });
    setBusyId(null);
    if (rpcError) {
      setError(rpcError.message || "Could not accept this bid.");
      refresh();
      return;
    }
    setNotice(`Deal finalized with ${drivers[bid.driver_id]?.full_name || "the driver"} at PKR ${bid.bid_amount}.`);
    notifyDriverBidAccepted({ load: updatedLoad ?? load, driverId: bid.driver_id });
    onAccepted?.(updatedLoad);
  }

  async function handleReject(bid) {
    setBusyId(bid.id);
    setError("");
    const { error: updateError } = await supabase.from("bids").update({ status: "rejected" }).eq("id", bid.id);
    setBusyId(null);
    if (updateError) return setError(updateError.message);
    notifyDriverBidRejected({ load, driverId: bid.driver_id });
    refresh();
  }

  const statusBadge = {
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
    accepted: "bg-green-50 text-green-700 border border-green-200",
    rejected: "bg-slate-100 text-slate-400 border border-slate-200",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <h3 className="font-semibold text-brand-navy flex items-center gap-2">
              <GavelIcon className="w-4 h-4 text-brand-orange" /> Driver Bids
            </h3>
            <p className="text-xs text-slate-400 truncate">{load.commodity} — {load.pickup_location} &rarr; {load.dropoff_location}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 shrink-0" aria-label="Close">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {notice && (
            <p className="text-green-700 text-sm flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircleIcon className="w-4 h-4 shrink-0" /> {notice}
            </p>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {load.status !== "open" && !notice && (
            <p className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              This load is no longer open — a driver has already been assigned.
            </p>
          )}

          {loading && <p className="text-slate-400 text-sm">Loading bids…</p>}
          {!loading && bids.length === 0 && (
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <GavelIcon className="w-4 h-4" /> No bids yet — drivers nearby will see this load and can counter-offer.
            </p>
          )}

          {bids.map((b, i) => {
            const driver = drivers[b.driver_id];
            const vehicle = vehicles[b.vehicle_id];
            const isBest = i === 0 && b.status === "pending";
            const isFinal = b.status !== "pending";
            return (
              <div
                key={b.id}
                className={`card space-y-3 ${b.status === "accepted" ? "border-2 border-green-400" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl shrink-0">
                      <UserIcon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-brand-navy truncate flex items-center gap-2">
                        {driver?.full_name || vehicle?.driver_name || "Driver"}
                        {isBest && (
                          <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                            Best offer
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
                        <TruckIcon className="w-3.5 h-3.5 shrink-0" /> {vehicle?.vehicle_no || "—"} · {vehicle?.vehicle_type || "—"}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full shrink-0 capitalize ${statusBadge[b.status] || statusBadge.pending}`}>
                    {b.status}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <p className="font-bold text-lg text-brand-navy flex items-center gap-1.5">
                    <WalletIcon className="w-4 h-4 text-brand-orange" /> PKR {Number(b.bid_amount).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" /> {timeAgo(b.updated_at || b.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <CallButton
                    phone={vehicle?.mobile_no || driver?.phone}
                    label="Call"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2.5 min-h-[40px] text-xs font-semibold border border-slate-300 rounded-lg text-slate-600 active:bg-slate-50"
                  />
                  <LoadChatButton
                    loadId={load.id}
                    currentUserId={merchantId}
                    label="Chat"
                    counterpartLabel={`Chat with ${driver?.full_name || "Driver"}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2.5 min-h-[40px] text-xs font-semibold border border-slate-300 rounded-lg text-slate-600 active:bg-slate-50"
                  />
                  {b.status === "pending" && load.status === "open" && (
                    <>
                      <button
                        onClick={() => handleReject(b)}
                        disabled={busyId === b.id}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2.5 min-h-[40px] text-xs font-semibold border border-red-200 text-red-600 rounded-lg active:bg-red-50 disabled:opacity-50"
                      >
                        <TrashIcon className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => handleAccept(b)}
                        disabled={busyId === b.id}
                        className="flex-1 btn-orange text-xs py-2.5 min-h-[40px] disabled:opacity-50"
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5" /> {busyId === b.id ? "Please wait…" : "Accept Bid"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
