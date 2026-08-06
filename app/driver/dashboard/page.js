"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowserClient";
import { useUser } from "@/lib/useUser";
import { useLiveLocation } from "@/lib/useLiveLocation";
import { haversineKm } from "@/lib/distance";
import { effectiveStage, stageMeta, MAX_STAGE } from "@/lib/tripStages";
import {
  TruckIcon,
  GridIcon,
  RouteIcon,
  ChartIcon,
  ShieldCheckIcon,
  WalletIcon,
  TruckCheckIcon,
  CloseIcon,
  MapPinIcon,
  IdCardIcon,
  CheckCircleIcon,
  GavelIcon,
  ClockIcon,
  PhoneIcon,
  ChatIcon,
  MoonIcon,
  RadarIcon,
} from "@/components/Icons";
import ModeSwitcher from "@/components/driver/ModeSwitcher";
import WorkTaskBar, { TripTrackerModal } from "@/components/driver/WorkTaskBar";
import LoadAlertOverlay from "@/components/driver/LoadAlertOverlay";
import NotificationBell from "@/components/NotificationBell";
import { subscribeToPush } from "@/lib/pushClient";
import { notifyMerchantLoadAccepted } from "@/lib/shipmentActions";

// Leaflet touches `window`, so the map can only render on the client —
// load it lazily with SSR turned off instead of at the top of the bundle.
const DriverMap = dynamic(() => import("@/components/driver/DriverMap"), { ssr: false });

const SEARCH_RADIUS_KM = 60;

// The driver's full-screen grid menu — same style as the Merchant Dashboard:
// emoji renders as the OS's native "semi-realistic 3D" icon, English label,
// Urdu label, alternating light-blue/cream tile.
const TABS = [
  { label: "Find a Load", urdu: "لوڈ تلاش کریں", emoji: "🗺️", tint: "bg-sky-100" },
  { label: "Available Loads", urdu: "دستیاب لوڈز", emoji: "📋", tint: "bg-orange-50" },
  { label: "My Trips", urdu: "میری ٹرپس", emoji: "🚚", tint: "bg-orange-50" },
  { label: "My Truck", urdu: "میری گاڑی", emoji: "🪪", tint: "bg-sky-100" },
  { label: "Billing & Payments", urdu: "بلنگ اور ادائیگیاں", emoji: "💵", tint: "bg-orange-50" },
  { label: "Help & Support", urdu: "مدد اور سپورٹ", emoji: "🎧", tint: "bg-sky-100" },
];

const LOGOUT_BOX = { label: "Log out", urdu: "لاگ آؤٹ", emoji: "🚪", tint: "bg-orange-50", isLogout: true };

export default function DriverDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [activeTab, setActiveTab] = useState(TABS[0].label);
  // The full grid is the driver's home screen too — open by default the
  // moment the dashboard mounts (right after login, and again on every
  // refresh), matching the Merchant Dashboard.
  const [drawerOpen, setDrawerOpen] = useState(true);
  // Set by the notification bell: { loadId, nonce } — MyTrips watches this
  // and auto-opens that load's tracker + chat. `nonce` changes on every
  // click so re-tapping the same notification still re-triggers it.
  const [jumpTarget, setJumpTarget] = useState(null);

  const [myVehicle, setMyVehicle] = useState(null);
  const [mode, setMode] = useState("resting");
  const [modeSaving, setModeSaving] = useState(false);

  const [workLoads, setWorkLoads] = useState([]);
  const [nearbyLoads, setNearbyLoads] = useState([]);
  const [alertLoad, setAlertLoad] = useState(null);
  const seenLoadIds = useRef(new Set());

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "driver")) {
      router.push("/login");
    }
  }, [loading, user, profile, router]);

  async function refreshVehicle() {
    if (!user) return;
    const { data } = await supabase.from("vehicles").select("*").eq("driver_id", user.id).maybeSingle();
    setMyVehicle(data);
    if (data?.status_mode) setMode(data.status_mode);
  }
  useEffect(() => { refreshVehicle(); }, [user]);

  // Background/lock-screen push alerts (new load nearby, load documentation
  // ready, arrival approved, new chat message) — safe to call repeatedly.
  useEffect(() => {
    if (user) subscribeToPush(user.id);
  }, [user]);

  const { position, error: locationError } = useLiveLocation(myVehicle?.id, mode === "working" || mode === "searching");

  async function handleModeChange(nextMode) {
    if (!myVehicle) {
      setActiveTab("Find a Load");
      return;
    }
    setMode(nextMode); // optimistic — instant tap feedback matters most for this audience
    setModeSaving(true);
    await supabase.from("vehicles").update({ status_mode: nextMode }).eq("id", myVehicle.id);
    setModeSaving(false);
  }

  // ---- Work Mode: my active (non-delivered) assigned loads ----
  async function refreshWorkLoads() {
    if (!myVehicle) return;
    const { data } = await supabase
      .from("loads")
      .select("*")
      .eq("assigned_vehicle_id", myVehicle.id)
      .neq("status", "delivered")
      .order("created_at", { ascending: false });
    setWorkLoads(data ?? []);
  }
  useEffect(() => { refreshWorkLoads(); }, [myVehicle]);

  // Keep the Work Mode task bar live — the moment the merchant submits a
  // Bilty or approves an arrival, this driver's dashboard updates itself.
  useEffect(() => {
    if (!myVehicle) return undefined;
    const channel = supabase
      .channel(`driver-loads-${myVehicle.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "loads", filter: `assigned_vehicle_id=eq.${myVehicle.id}` },
        () => refreshWorkLoads()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myVehicle]);

  // ---- Search Mode: nearby matching open loads, refreshed periodically ----
  async function refreshNearbyLoads() {
    if (!position || mode !== "searching") return;
    const { data, error } = await supabase.rpc("nearby_open_loads", {
      p_lat: position.lat,
      p_lng: position.lng,
      p_vehicle_type: myVehicle?.vehicle_type ?? null,
      p_radius_km: SEARCH_RADIUS_KM,
    });
    if (!error) setNearbyLoads(data ?? []);
  }
  useEffect(() => {
    refreshNearbyLoads();
    if (mode !== "searching") return undefined;
    const interval = setInterval(refreshNearbyLoads, 25000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, position?.lat, position?.lng, myVehicle?.vehicle_type]);

  // ---- Live InDrive/Yango-style alert: fires the instant a matching load is posted ----
  useEffect(() => {
    if (mode !== "searching" || !position) return undefined;

    const channel = supabase
      .channel("driver-nearby-load-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "loads", filter: "status=eq.open" },
        ({ new: newLoad }) => {
          if (seenLoadIds.current.has(newLoad.id)) return;
          if (newLoad.vehicle_type_needed && myVehicle?.vehicle_type && newLoad.vehicle_type_needed !== myVehicle.vehicle_type) return;
          if (newLoad.pickup_lat == null || newLoad.pickup_lng == null) return;

          const distance_km = haversineKm(position.lat, position.lng, newLoad.pickup_lat, newLoad.pickup_lng);
          if (distance_km > SEARCH_RADIUS_KM) return;

          seenLoadIds.current.add(newLoad.id);
          setNearbyLoads((prev) => [{ ...newLoad, distance_km }, ...prev]);
          setAlertLoad({ ...newLoad, distance_km });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [mode, position, myVehicle]);

  async function acceptLoad(load) {
    if (!myVehicle) return;
    await supabase.from("bids").insert({
      load_id: load.id,
      driver_id: user.id,
      vehicle_id: myVehicle.id,
      bid_amount: load.offered_rate ?? 0,
      status: "accepted",
    });
    const { data: updated, error: acceptError } = await supabase
      .from("loads")
      .update({ status: "assigned", trip_stage: 1, assigned_vehicle_id: myVehicle.id })
      .eq("id", load.id)
      .eq("status", "open") // guard: don't steal a load another driver just accepted
      .select()
      .maybeSingle();

    if (acceptError || !updated) {
      // Either a DB/permissions error, or someone else accepted it first.
      alert(
        acceptError
          ? `Could not accept this load: ${acceptError.message}`
          : "This load was just accepted by another driver."
      );
      setAlertLoad(null);
      return;
    }

    setNearbyLoads((prev) => prev.filter((l) => l.id !== load.id));
    setAlertLoad(null);
    await refreshWorkLoads();
    handleModeChange("working");
    setActiveTab("Find a Load");
    notifyMerchantLoadAccepted({ load: updated, merchantId: updated.merchant_id, vehicle: myVehicle });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleOpenLoadFromNotification(loadId) {
    setActiveTab("My Trips");
    setDrawerOpen(false);
    setJumpTarget({ loadId, nonce: Date.now() });
  }

  if (loading || !user || profile?.role !== "driver") return null;

  return (
    <section className="app-scroll max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-12">
      {alertLoad && (
        <LoadAlertOverlay load={alertLoad} onAccept={acceptLoad} onDismiss={() => setAlertLoad(null)} />
      )}

      <div className="sticky top-0 z-[90] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 mb-4 sm:mb-8 flex items-center justify-between gap-4 bg-white/85 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white shadow-card flex items-center justify-center text-brand-navy shrink-0 text-xl touch-manipulation select-none"
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="min-w-0 mr-2">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-brand-navy leading-tight truncate">{activeTab}</h1>
            <p className="text-slate-500 text-sm hidden sm:block truncate">Smart Goods Transport Company — Driver Dashboard</p>
          </div>
        </div>

        <div className="shrink-0">
          <NotificationBell userId={user.id} onOpenLoad={handleOpenLoadFromNotification} />
        </div>
      </div>

      <DriverGridMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onSelect={(label) => {
          setActiveTab(label);
          setDrawerOpen(false);
        }}
        onLogout={handleLogout}
      />

      {!myVehicle && (
        <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm mb-6 flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4 shrink-0" />
          You haven&apos;t registered a vehicle yet.{" "}
          <a href="/register" className="font-semibold underline">Register now</a> to switch modes and receive loads.
        </p>
      )}

      {/* MODE SWITCHER — pinned above everything, always visible regardless of tab */}
      <div className="mb-6">
        <ModeSwitcher mode={mode} onChange={handleModeChange} disabled={!myVehicle || modeSaving} />
      </div>

      {activeTab === "Find a Load" && (
        <DashboardHome
          mode={mode}
          myVehicle={myVehicle}
          workLoads={workLoads}
          driverId={user.id}
          onChanged={refreshWorkLoads}
          position={position}
          locationError={locationError}
          nearbyLoads={nearbyLoads}
          onAccept={acceptLoad}
        />
      )}
      {activeTab === "Available Loads" && (
        <AvailableLoads
          driverId={user.id}
          vehicle={myVehicle}
          onAccepted={async () => {
            await refreshWorkLoads();
            handleModeChange("working");
            setActiveTab("Find a Load");
          }}
        />
      )}
      {activeTab === "My Trips" && <MyTrips vehicle={myVehicle} driverId={user.id} jumpTarget={jumpTarget} />}
      {activeTab === "My Truck" && <TruckProfile vehicle={myVehicle} onUpdated={refreshVehicle} />}
      {activeTab === "Billing & Payments" && <BillingPayments />}
      {activeTab === "Help & Support" && <HelpSupport />}
    </section>
  );
}

/**
 * Full-screen grid navigation — identical style/behaviour to the Merchant
 * Dashboard's grid: light blue/cream 3-column grid, semi-realistic 3D emoji
 * + English + Urdu label per box, Logout as the 10th box (row 4, centred),
 * smooth fade+scale open/close, glossy premium tiles, lift-up tap feedback.
 * Positioned to start just below the sticky header (not overlapping it).
 */
function DriverGridMenu({ open, onClose, activeTab, onSelect, onLogout }) {
  const boxes = [...TABS, LOGOUT_BOX];

  return (
    <div
      className={`fixed left-0 right-0 bottom-0 top-16 sm:top-20 z-[70] app-scroll overflow-y-auto bg-gradient-to-b from-sky-50 via-white to-orange-50 transition-all duration-300 ease-out ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div className={`max-w-md mx-auto px-4 pt-6 pb-10 transition-all duration-300 ease-out ${open ? "translate-y-0 scale-100" : "translate-y-2 scale-[0.98]"}`}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-bold tracking-wide text-brand-navy">Driver Menu</p>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center text-slate-500 touch-manipulation select-none"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {boxes.map((box) => {
            const isActive = !box.isLogout && activeTab === box.label;
            return (
              <button
                key={box.label}
                onClick={() => (box.isLogout ? onLogout() : onSelect(box.label))}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl px-2 py-4 text-center overflow-hidden border border-white/70 shadow-[0_3px_10px_rgba(15,30,60,0.10)] transition-all duration-150 ease-out touch-manipulation select-none active:-translate-y-1 active:scale-[1.02] active:shadow-[0_12px_26px_rgba(15,30,60,0.20)] ${box.tint} ${
                  isActive ? "ring-2 ring-brand-orange" : ""
                } ${box.isLogout ? "col-start-2" : ""}`}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/70 to-transparent" />
                <span className="relative text-4xl leading-none drop-shadow-sm">{box.emoji}</span>
                <span className={`relative font-semibold leading-tight text-[13px] ${box.isLogout ? "text-red-500" : "text-brand-navy"}`}>
                  {box.label}
                </span>
                <span className="relative text-[11px] text-slate-500 leading-tight" dir="rtl" lang="ur">
                  {box.urdu}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Static, bilingual "free for now" notice — identical framing to the Merchant Dashboard's Billing & Payments tab. */
function BillingPayments() {
  return (
    <div className="card max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <span className="icon-badge bg-green-500/10 text-green-600 w-11 h-11 rounded-xl">
          <WalletIcon className="w-5 h-5" />
        </span>
        <h3 className="font-bold text-brand-navy text-lg">Billing & Payments</h3>
      </div>
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="font-semibold text-green-800">
          This service is currently free for trucks and drivers on the Smart Goods Transport Company platform. There are no
          subscription fees, commission charges, or hidden costs at this time.
        </p>
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4" dir="rtl" lang="ur">
        <p className="font-semibold text-slate-700">
          یہ سروس فی الحال Smart Goods Transport Company کے پلیٹ فارم پر ٹرکس اور ڈرائیورز کے لیے مکمل طور پر مفت ہے۔ اس وقت کوئی
          سبسکرپشن فیس، کمیشن، یا کوئی چھپی ہوئی لاگت نہیں ہے۔
        </p>
      </div>
      <p className="text-xs text-slate-400">Pricing may be introduced in the future — you will be notified in advance before any charges apply.</p>
    </div>
  );
}

/** Reuses the same public Contact Us info the Admin panel manages — identical to the Merchant Dashboard's Help & Support tab. */
function HelpSupport() {
  const [contact, setContact] = useState(null);

  useEffect(() => {
    supabase.from("contact_info").select("*").eq("id", 1).maybeSingle().then(({ data }) => setContact(data ?? null));
  }, []);

  return (
    <div className="card max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl">
          <ChatIcon className="w-5 h-5" />
        </span>
        <h3 className="font-bold text-brand-navy text-lg">Help & Support</h3>
      </div>
      <p className="text-sm text-slate-500">Need help with a load, your account, or anything else? Reach out any time.</p>
      <div className="space-y-3">
        {contact?.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-sm font-semibold text-brand-navy">
            <PhoneIcon className="w-4 h-4 text-brand-orange shrink-0" /> {contact.phone}
          </a>
        )}
        {contact?.whatsapp && (
          <a href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm font-semibold text-brand-navy">
            <ChatIcon className="w-4 h-4 text-green-600 shrink-0" /> WhatsApp: {contact.whatsapp}
          </a>
        )}
        {contact?.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm font-semibold text-brand-navy">
            <ChatIcon className="w-4 h-4 text-brand-orange shrink-0" /> {contact.email}
          </a>
        )}
        {contact?.address && (
          <p className="flex items-start gap-3 text-sm text-slate-600">
            <MapPinIcon className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" /> {contact.address}
          </p>
        )}
        {!contact && <p className="text-sm text-slate-400">Loading contact details…</p>}
      </div>
    </div>
  );
}

function DashboardHome({ mode, myVehicle, workLoads, driverId, onChanged, position, locationError, nearbyLoads, onAccept }) {
  if (!myVehicle) {
    return (
      <div className="card text-center py-12">
        <ShieldCheckIcon className="w-10 h-10 text-brand-orange mx-auto mb-3" />
        <p className="font-semibold text-brand-navy mb-1">Register your vehicle to get started</p>
        <p className="text-sm text-slate-500 mb-4">Once registered, you can switch modes and start receiving loads.</p>
        <a href="/register" className="btn-orange inline-flex">Register Now</a>
      </div>
    );
  }

  if (mode === "working") {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="icon-badge bg-green-500/10 text-green-600 w-9 h-9 rounded-lg"><TruckIcon className="w-4 h-4" /></span>
          <h3 className="font-bold text-brand-navy">Work Mode — Live Status</h3>
        </div>
        <WorkTaskBar loads={workLoads} driverId={driverId} onChanged={onChanged} />
      </div>
    );
  }

  if (mode === "searching") {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="icon-badge bg-blue-500/10 text-blue-600 w-9 h-9 rounded-lg"><RadarIcon className="w-4 h-4" /></span>
            <h3 className="font-bold text-brand-navy">Searching for Loads Nearby</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> Live
          </span>
        </div>

        {locationError && (
          <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm mb-4 flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 shrink-0" /> {locationError}
          </p>
        )}

        <DriverMap driverPosition={position} loads={nearbyLoads} onAccept={onAccept} radiusKm={SEARCH_RADIUS_KM} />

        <p className="text-xs text-slate-400 mt-3">
          Matching loads for your vehicle type within {SEARCH_RADIUS_KM} km will ring and pop up automatically.
        </p>
      </div>
    );
  }

  // resting
  return (
    <div className="card text-center py-14">
      <span className="icon-badge-round bg-brand-orangeSoft text-brand-orangeDark mx-auto mb-4">
        <MoonIcon className="w-9 h-9" />
      </span>
      <p className="font-bold text-brand-navy text-lg mb-1">You&apos;re Resting</p>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">
        You&apos;re marked offline and won&apos;t receive new load alerts. Switch to
        &quot;Work Mode&quot; when you&apos;re ready to go back on duty.
      </p>
    </div>
  );
}

function AvailableLoads({ driverId, vehicle, onAccepted }) {
  const [loads, setLoads] = useState([]);
  const [bidAmounts, setBidAmounts] = useState({});
  const [message, setMessage] = useState("");
  const [myBids, setMyBids] = useState({}); // load_id -> latest bid row placed by this driver

  async function refresh() {
    const { data } = await supabase.from("loads").select("*").eq("status", "open").order("created_at", { ascending: false });
    const rows = data ?? [];
    // Loads that match this driver's registered truck type bubble to the top.
    rows.sort((a, b) => {
      const aMatch = vehicle?.vehicle_type && a.vehicle_type_needed === vehicle.vehicle_type ? 0 : 1;
      const bMatch = vehicle?.vehicle_type && b.vehicle_type_needed === vehicle.vehicle_type ? 0 : 1;
      return aMatch - bMatch;
    });
    setLoads(rows);
  }
  useEffect(() => { refresh(); }, [vehicle]);

  async function refreshMyBids() {
    if (!driverId) return;
    const { data } = await supabase
      .from("bids")
      .select("*")
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false });
    const latestByLoad = {};
    (data ?? []).forEach((b) => {
      if (!latestByLoad[b.load_id]) latestByLoad[b.load_id] = b; // newest first, thanks to ordering above
    });
    setMyBids(latestByLoad);
  }
  useEffect(() => { refreshMyBids(); }, [driverId]);

  // Realtime: the open-loads board updates the instant a merchant posts a
  // new load or another driver's bid gets accepted (this load disappears
  // from "open"); this driver's own bids update the instant the merchant
  // accepts/rejects one from the Bid Review panel (functional requirement #2).
  useEffect(() => {
    const loadsChannel = supabase
      .channel("driver-open-loads-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "loads" }, () => refresh())
      .subscribe();
    const bidsChannel = driverId
      ? supabase
          .channel(`driver-my-bids-${driverId}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "bids", filter: `driver_id=eq.${driverId}` }, () => refreshMyBids())
          .subscribe()
      : null;
    return () => {
      supabase.removeChannel(loadsChannel);
      if (bidsChannel) supabase.removeChannel(bidsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  async function placeBid(load, accept) {
    if (!vehicle) return setMessage("Register your vehicle before bidding.");
    const amount = accept ? load.offered_rate ?? 0 : Number(bidAmounts[load.id] || 0);
    if (!accept && amount <= 0) return setMessage("Enter a counter-offer amount first.");

    await supabase.from("bids").insert({
      load_id: load.id,
      driver_id: driverId,
      vehicle_id: vehicle.id,
      bid_amount: amount,
      status: accept ? "accepted" : "pending",
    });
    refreshMyBids();

    if (accept) {
      const { data: updated, error: acceptError } = await supabase
        .from("loads")
        .update({ status: "assigned", trip_stage: 1, assigned_vehicle_id: vehicle.id })
        .eq("id", load.id)
        .eq("status", "open") // guard: don't steal a load another driver just accepted
        .select()
        .maybeSingle();

      if (acceptError || !updated) {
        setMessage(
          acceptError
            ? `Could not accept this load: ${acceptError.message}`
            : "This load was just accepted by another driver."
        );
        refresh();
        return;
      }

      setMessage(`Load accepted at PKR ${amount}. A digital bilty has been generated.`);
      refresh();
      onAccepted?.();
    } else {
      setMessage(`Counter-bid of PKR ${amount} sent to the merchant — you'll be notified when they respond.`);
    }
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="text-sm text-brand-navy bg-slate-100 rounded-lg px-4 py-2 flex items-center gap-2">
          <TruckCheckIcon className="w-4 h-4 shrink-0" /> {message}
        </p>
      )}
      {loads.length === 0 && (
        <p className="text-slate-400 text-sm flex items-center gap-2">
          <GridIcon className="w-4 h-4" /> No open loads right now — check back soon.
        </p>
      )}
      {loads.map((l) => {
        const isMatch = vehicle?.vehicle_type && l.vehicle_type_needed === vehicle.vehicle_type;
        const myBid = myBids[l.id];
        return (
        <div key={l.id} className={`card flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isMatch ? "border-2 border-green-400" : ""}`}>
          <div className="flex items-center gap-3">
            <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl">
              <TruckIcon className="w-5 h-5" />
            </span>
            <div>
              <p className="font-semibold text-brand-navy flex items-center gap-2 flex-wrap">
                {l.commodity} — {l.quantity_value ?? l.quantity_munds} {l.quantity_unit ?? "Munds"}
                {isMatch && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                    <CheckCircleIcon className="w-3 h-3" /> Matches your truck
                  </span>
                )}
                {l.vehicle_type_needed && !isMatch && (
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    Needs: {l.vehicle_type_needed}
                  </span>
                )}
              </p>
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <RouteIcon className="w-3.5 h-3.5" /> {l.pickup_location} &rarr; {l.dropoff_location}
                {l.distance_km != null && <span className="text-slate-400">· {l.distance_km} km</span>}
              </p>
              {l.offered_rate && (
                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                  <WalletIcon className="w-3.5 h-3.5" /> Offered rate: PKR {l.offered_rate}
                </p>
              )}
              {/* Live status of this driver's own bid on this load — updates
                  instantly via realtime when the merchant accepts/rejects it
                  from the Bid Review panel. */}
              {myBid && (
                <p
                  className={`mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    myBid.status === "accepted"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : myBid.status === "rejected"
                      ? "bg-slate-100 text-slate-400 border border-slate-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                >
                  <GavelIcon className="w-3 h-3" /> Your bid: PKR {Number(myBid.bid_amount).toLocaleString()} — {myBid.status}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              placeholder="Counter bid"
              className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={bidAmounts[l.id] || ""}
              onChange={(e) => setBidAmounts((b) => ({ ...b, [l.id]: e.target.value }))}
            />
            <button onClick={() => placeBid(l, false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg font-medium text-slate-600">
              Counter-Bid
            </button>
            <button onClick={() => placeBid(l, true)} className="btn-orange px-4 py-2 text-sm">
              <ShieldCheckIcon className="w-4 h-4" /> Accept
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
}

function TruckProfile({ vehicle, onUpdated }) {
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("vehicle_types").select("*").order("sort_order").then(({ data }) => setVehicleTypes(data ?? []));
  }, []);

  useEffect(() => {
    if (vehicle?.vehicle_type_id) setSelectedTypeId(vehicle.vehicle_type_id);
  }, [vehicle]);

  if (!vehicle) {
    return (
      <div className="card text-center py-12">
        <IdCardIcon className="w-10 h-10 text-brand-orange mx-auto mb-3" />
        <p className="font-semibold text-brand-navy mb-1">No truck registered yet</p>
        <p className="text-sm text-slate-500 mb-4">Register your vehicle to set up your truck profile.</p>
        <a href="/register" className="btn-orange inline-flex">Register Now</a>
      </div>
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    const type = vehicleTypes.find((t) => t.id === selectedTypeId);
    const { error: updateError } = await supabase
      .from("vehicles")
      .update({ vehicle_type_id: selectedTypeId || null, vehicle_type: type?.name ?? null })
      .eq("id", vehicle.id);
    setSaving(false);
    if (updateError) return setError(updateError.message);
    setSaved(true);
    await onUpdated?.();
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <span className="icon-badge bg-brand-orange/10 text-brand-orange w-9 h-9 rounded-lg"><TruckIcon className="w-4 h-4" /></span>
          <h3 className="font-bold text-brand-navy">My Truck Profile</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
          <VehicleDetail icon={TruckIcon} label="Vehicle No" value={vehicle.vehicle_no} />
          <VehicleDetail icon={ShieldCheckIcon} label="Status" value={vehicle.status} />
          <VehicleDetail icon={IdCardIcon} label="Driver Name" value={vehicle.driver_name} />
          <VehicleDetail icon={MapPinIcon} label="Mobile No" value={vehicle.mobile_no} />
        </div>

        <div className="border-t border-slate-100 pt-4">
          <label className="field-label">
            <TruckIcon className="w-4 h-4 text-brand-orange" /> Vehicle Type
          </label>
          <p className="text-xs text-slate-400 mb-2">
            Keep this accurate — merchants pick a required truck type when posting a load, and you&apos;ll only
            get instant alerts for loads that match what you select here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="field-input flex-1"
            >
              <option value="">Not set</option>
              {vehicleTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button onClick={handleSave} disabled={saving} className="btn-orange shrink-0">
              {saving ? "Saving..." : "Save Truck Type"}
            </button>
          </div>
          {saved && (
            <p className="text-green-700 text-sm mt-2 flex items-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4" /> Truck type updated.
            </p>
          )}
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function VehicleDetail({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1">
        <Icon className="w-3 h-3" /> {label}
      </p>
      <p className="text-sm font-semibold text-brand-navy truncate capitalize">{value || "—"}</p>
    </div>
  );
}

function MyTrips({ vehicle, driverId, jumpTarget }) {
  const [loads, setLoads] = useState([]);
  const [openLoad, setOpenLoad] = useState(null);
  const [autoOpenChatId, setAutoOpenChatId] = useState(null);

  async function refresh() {
    if (!vehicle) return;
    const { data } = await supabase
      .from("loads")
      .select("*")
      .eq("assigned_vehicle_id", vehicle.id)
      .order("created_at", { ascending: false });
    setLoads(data ?? []);
  }
  useEffect(() => { refresh(); }, [vehicle]);

  useEffect(() => {
    if (!vehicle) return undefined;
    const channel = supabase
      .channel(`my-trips-${vehicle.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "loads", filter: `assigned_vehicle_id=eq.${vehicle.id}` },
        () => refresh()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle]);

  // Notification bell deep-link: jump straight to this load's tracker + chat.
  useEffect(() => {
    if (!jumpTarget?.loadId) return;
    const match = loads.find((l) => l.id === jumpTarget.loadId);
    if (match) {
      setOpenLoad(match);
      setAutoOpenChatId(jumpTarget.loadId);
    }
  }, [jumpTarget, loads]);

  return (
    <div className="space-y-3">
      {(!vehicle || loads.length === 0) && (
        <p className="text-slate-400 text-sm flex items-center gap-2">
          <RouteIcon className="w-4 h-4" /> No active trips yet.
        </p>
      )}
      {loads.map((l) => {
        const stage = effectiveStage(l);
        const meta = stageMeta(stage);
        const StageIcon = meta.icon;
        return (
          <button
            key={l.id}
            onClick={() => setOpenLoad(l)}
            className="w-full text-left card flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:ring-2 hover:ring-brand-orange/40 transition-shadow"
          >
            <div className="flex items-center gap-3">
              <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl">
                <TruckIcon className="w-5 h-5" />
              </span>
              <div>
                <p className="font-semibold text-brand-navy">{l.commodity} — {l.quantity_value ?? l.quantity_munds} {l.quantity_unit ?? "Munds"}</p>
                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                  <RouteIcon className="w-3.5 h-3.5" /> {l.pickup_location} &rarr; {l.dropoff_location}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 badge-valid shrink-0">
              <StageIcon className="w-3.5 h-3.5" /> Step {stage}/{MAX_STAGE} — {meta.label}
            </span>
          </button>
        );
      })}

      {openLoad && (
        <TripTrackerModal
          load={openLoad}
          driverId={driverId}
          onClose={() => setOpenLoad(null)}
          autoOpenChat={autoOpenChatId === openLoad.id}
          onChatOpened={() => setAutoOpenChatId(null)}
          onChanged={async (fresh) => {
            setOpenLoad(fresh);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
