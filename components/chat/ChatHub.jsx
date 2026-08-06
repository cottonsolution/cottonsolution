"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowserClient";
import { ChatIcon, UserIcon, RouteIcon, ShieldCheckIcon } from "@/components/Icons";
import CallButton from "@/components/CallButton";
import ChatModal from "./ChatModal";

/**
 * "Messages" tab shared by Driver / Merchant / Admin dashboards.
 *  - General contacts: Admin/support (always available) + whoever this
 *    user has actually shared a load with (merchant<->driver), each with
 *    their latest general message preview.
 *  - Shipment chats: a shortcut list of loads this user is party to, each
 *    opening that load's dedicated chat (same thread as the "Chat" button
 *    on the shipment/trip card).
 */
export default function ChatHub({ userId, role, vehicleId }) {
  const [contacts, setContacts] = useState([]);
  const [shipmentThreads, setShipmentThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openContact, setOpenContact] = useState(null); // { id, full_name }
  const [openLoad, setOpenLoad] = useState(null); // { id, label }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // ---- General contacts: admins + load counterparts ----
      const [{ data: admins }, { data: myGeneralMessages }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone, role").eq("role", "admin"),
        supabase
          .from("messages")
          .select("*")
          .is("load_id", null)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order("created_at", { ascending: false }),
      ]);

      let counterpartIds = [];
      if (role === "merchant") {
        const { data: myLoads } = await supabase
          .from("loads")
          .select("assigned_vehicle_id")
          .eq("merchant_id", userId)
          .not("assigned_vehicle_id", "is", null);
        const vIds = [...new Set((myLoads ?? []).map((l) => l.assigned_vehicle_id))];
        if (vIds.length) {
          const { data: vehicles } = await supabase.from("vehicles").select("id, driver_id").in("id", vIds);
          counterpartIds = [...new Set((vehicles ?? []).map((v) => v.driver_id).filter(Boolean))];
        }
      } else if (role === "driver" && vehicleId) {
        const { data: myLoads } = await supabase.from("loads").select("merchant_id").eq("assigned_vehicle_id", vehicleId);
        counterpartIds = [...new Set((myLoads ?? []).map((l) => l.merchant_id).filter(Boolean))];
      }

      let counterpartProfiles = [];
      if (counterpartIds.length) {
        const { data } = await supabase.from("profiles").select("id, full_name, phone, role").in("id", counterpartIds);
        counterpartProfiles = data ?? [];
      }

      const byId = new Map();
      (admins ?? []).forEach((p) => byId.set(p.id, { ...p, lastMessage: null }));
      counterpartProfiles.forEach((p) => byId.set(p.id, { ...p, lastMessage: null }));
      (myGeneralMessages ?? []).forEach((m) => {
        const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
        if (!otherId) return;
        const existing = byId.get(otherId);
        if (existing && !existing.lastMessage) existing.lastMessage = m;
      });

      // ---- Shipment (per-load) chats ----
      let loads = [];
      if (role === "merchant") {
        const { data } = await supabase
          .from("loads")
          .select("id, commodity, pickup_location, dropoff_location, status")
          .eq("merchant_id", userId)
          .neq("status", "cancelled")
          .order("created_at", { ascending: false })
          .limit(30);
        loads = data ?? [];
      } else if (role === "driver" && vehicleId) {
        const { data } = await supabase
          .from("loads")
          .select("id, commodity, pickup_location, dropoff_location, status")
          .eq("assigned_vehicle_id", vehicleId)
          .order("created_at", { ascending: false })
          .limit(30);
        loads = data ?? [];
      } else if (role === "admin") {
        const { data } = await supabase
          .from("loads")
          .select("id, commodity, pickup_location, dropoff_location, status")
          .neq("status", "cancelled")
          .not("assigned_vehicle_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(30);
        loads = data ?? [];
      }

      if (!cancelled) {
        setContacts([...byId.values()]);
        setShipmentThreads(loads);
        setLoading(false);
      }
    }

    if (userId) load();
    return () => {
      cancelled = true;
    };
  }, [userId, role, vehicleId]);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-bold text-brand-navy mb-3 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-brand-orange" /> Contacts
        </h3>
        {loading && <p className="text-slate-400 text-sm">Loading...</p>}
        {!loading && contacts.length === 0 && <p className="text-slate-400 text-sm">No contacts yet.</p>}
        <div className="space-y-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="w-full text-left card flex items-center gap-3 py-3 hover:ring-2 hover:ring-brand-orange/30 transition-shadow"
            >
              <button onClick={() => setOpenContact(c)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl shrink-0">
                  {c.role === "admin" ? <ShieldCheckIcon className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-brand-navy truncate">
                    {c.full_name} {c.role === "admin" && <span className="text-xs text-brand-orange font-bold">(Support)</span>}
                  </p>
                  <p className="text-sm text-slate-500 truncate">{c.lastMessage?.body || "Tap to start chatting"}</p>
                </div>
              </button>
              {c.phone && (
                <CallButton
                  phone={c.phone}
                  label=""
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full text-green-600 bg-green-500/10"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-bold text-brand-navy mb-3 flex items-center gap-2">
          <RouteIcon className="w-4 h-4 text-brand-orange" /> Shipment Chats
        </h3>
        {!loading && shipmentThreads.length === 0 && (
          <p className="text-slate-400 text-sm">No shipment chats yet.</p>
        )}
        <div className="space-y-2">
          {shipmentThreads.map((l) => (
            <button
              key={l.id}
              onClick={() => setOpenLoad({ id: l.id, label: `${l.commodity} — ${l.pickup_location} → ${l.dropoff_location}` })}
              className="w-full text-left card flex items-center gap-3 py-3 hover:ring-2 hover:ring-brand-orange/30 transition-shadow"
            >
              <span className="icon-badge bg-green-500/10 text-green-600 w-11 h-11 rounded-xl shrink-0">
                <ChatIcon className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-navy truncate">{l.commodity}</p>
                <p className="text-sm text-slate-500 truncate">{l.pickup_location} &rarr; {l.dropoff_location}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {openContact && (
        <ChatModal
          title={openContact.full_name}
          subtitle={openContact.role === "admin" ? "Support" : undefined}
          otherUserId={openContact.id}
          otherUserName={openContact.full_name}
          phone={openContact.phone}
          currentUserId={userId}
          onClose={() => setOpenContact(null)}
        />
      )}
      {openLoad && (
        <ChatModal
          title="Shipment Chat"
          subtitle={openLoad.label}
          loadId={openLoad.id}
          currentUserId={userId}
          onClose={() => setOpenLoad(null)}
        />
      )}
    </div>
  );
}
