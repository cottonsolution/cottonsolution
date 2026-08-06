"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowserClient";
import { BellIcon, CloseIcon, TruckIcon } from "@/components/Icons";

/**
 * Bell icon + dropdown feed of recent notifications for `userId`. Every
 * important event in the app already calls `triggerPush()` (see
 * lib/pushClient.js), which now also writes a row to `public.notifications`
 * — so this component just reads that table, live, without any new
 * notification-firing logic anywhere else in the app.
 *
 * Tapping a notification marks it read and calls `onOpenLoad(loadId)` so the
 * parent dashboard can jump straight to that load's shipment (and open its
 * chat), matching the "click a notification -> land inside Active Shipments
 * with that vehicle's history + chat open" requirement.
 */
export default function NotificationBell({ userId, onOpenLoad }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  async function refresh() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems(data ?? []);
  }

  useEffect(() => {
    if (userId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () => refresh())
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = items.filter((n) => !n.read_at).length;

  async function handleClick(n) {
    if (!n.read_at) {
      supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id).then(() => {});
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    }
    setOpen(false);
    if (n.load_id) onOpenLoad?.(n.load_id);
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-10 h-10 rounded-xl bg-white shadow-card flex items-center justify-center text-brand-navy shrink-0"
        aria-label="Notifications"
      >
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-slate-100 z-[95] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-bold text-brand-navy text-sm">Notifications</p>
            <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center text-slate-400" aria-label="Close">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {items.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8 flex flex-col items-center gap-2">
                <TruckIcon className="w-6 h-6 text-slate-300" /> No notifications yet.
              </p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${!n.read_at ? "bg-brand-orangeSoft/40" : ""}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && <span className="w-2 h-2 rounded-full bg-brand-orange mt-1.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-navy truncate">{n.title}</p>
                    {n.body && <p className="text-xs text-slate-500 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
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
