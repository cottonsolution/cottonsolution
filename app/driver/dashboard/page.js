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
  MenuIcon,
  CloseIcon,
  LogoutIcon,
  MoonIcon,
  RadarIcon,
  MapPinIcon,
  IdCardIcon,
  CheckCircleIcon,
  ChatIcon,
} from "@/components/Icons";
import ModeSwitcher from "@/components/driver/ModeSwitcher";
import WorkTaskBar, { TripTrackerModal } from "@/components/driver/WorkTaskBar";
import LoadAlertOverlay from "@/components/driver/LoadAlertOverlay";
import ChatHub from "@/components/chat/ChatHub";
import { subscribeToPush } from "@/lib/pushClient";
import { notifyMerchantLoadAccepted } from "@/lib/shipmentActions";

// Leaflet touches `window`, so the map can only render on the client —
// load it lazily with SSR turned off instead of at the top of the bundle.
const DriverMap = dynamic(() => import("@/components/driver/DriverMap"), { ssr: false });

const SEARCH_RADIUS_KM = 60;

const TABS = [
  { label: "Dashboard", icon: ChartIcon, from: "#38bdf8", to: "#0369a1" },
  { label: "Available Loads", icon: GridIcon, from: "#a78bfa", to: "#6d28d9" },
  { label: "My Trips", icon: RouteIcon, from: "#4ade80", to: "#15803d" },
  { label: "Messages", icon: ChatIcon, from: "#f472b6", to: "#be185d" },
  { label: "My Truck", icon: IdCardIcon, from: "#fb923c", to: "#c2410c" },
];

export default function DriverDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [activeTab, setActiveTab] = useState(TABS[0].label);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      setActiveTab("Dashboard");
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
    setActiveTab("Dashboard");
    notifyMerchantLoadAccepted({ load: updated, merchantId: updated.merchant_id, vehicle: myVehicle });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading || !user || profile?.role !== "driver") return null;

  const activeMeta = TABS.find((t) => t.label === activeTab);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {alertLoad && (
        <LoadAlertOverlay load={alertLoad} onAccept={acceptLoad} onDismiss={() => setAlertLoad(null)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="icon-tile w-12 h-12" style={{ "--tile-from": "#4ade80", "--tile-to": "#15803d" }}>
            <TruckIcon className="w-6 h-6 text-white" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy leading-tight">Driver Dashboard</h1>
            <p className="text-slate-500 text-sm hidden sm:block">Set your status, find loads, and manage trips.</p>
          </div>
        </div>

        <button
          className="lg:hidden w-10 h-10 rounded-xl bg-white shadow-card flex items-center justify-center text-brand-navy shrink-0"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
      </div>

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

      <div className="flex gap-6 items-start">
        {/* DESKTOP SIDEBAR — mirrors the Admin Dashboard's navigation structure */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white rounded-2xl shadow-card p-3 sticky top-24 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`admin-sidebar-link ${activeTab === tab.label ? "active" : ""}`}
            >
              <span className="icon-tile" style={{ "--tile-from": tab.from, "--tile-to": tab.to }}>
                <tab.icon className="w-5 h-5 text-white" />
              </span>
              {tab.label}
            </button>
          ))}
          <div className="border-t border-slate-100 mt-2 pt-2">
            <button onClick={handleLogout} className="admin-sidebar-link text-red-500 hover:bg-red-50 w-full">
              <span className="icon-tile" style={{ "--tile-from": "#94a3b8", "--tile-to": "#475569" }}>
                <LogoutIcon className="w-5 h-5 text-white" />
              </span>
              Logout
            </button>
          </div>
        </aside>

        {/* MOBILE DRAWER */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl p-4 flex flex-col gap-1 animate-[slideIn_0.25s_ease-out]">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-brand-navy">Menu</span>
                <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-400">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
              {TABS.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => {
                    setActiveTab(tab.label);
                    setDrawerOpen(false);
                  }}
                  className={`admin-sidebar-link ${activeTab === tab.label ? "active" : ""}`}
                >
                  <span className="icon-tile" style={{ "--tile-from": tab.from, "--tile-to": tab.to }}>
                    <tab.icon className="w-5 h-5 text-white" />
                  </span>
                  {tab.label}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-2 pt-2">
                <button onClick={handleLogout} className="admin-sidebar-link text-red-500 w-full">
                  <span className="icon-tile" style={{ "--tile-from": "#94a3b8", "--tile-to": "#475569" }}>
                    <LogoutIcon className="w-5 h-5 text-white" />
                  </span>
                  Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* CONTENT */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-6 lg:hidden overflow-x-auto pb-1">
            <span className="icon-tile w-9 h-9" style={{ "--tile-from": activeMeta.from, "--tile-to": activeMeta.to }}>
              <activeMeta.icon className="w-4 h-4 text-white" />
            </span>
            <h2 className="font-bold text-brand-navy whitespace-nowrap">{activeTab}</h2>
          </div>

          {activeTab === "Dashboard" && (
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
                setActiveTab("Dashboard");
              }}
            />
          )}
          {activeTab === "My Trips" && <MyTrips vehicle={myVehicle} driverId={user.id} />}
          {activeTab === "Messages" && <ChatHub userId={user.id} role="driver" vehicleId={myVehicle?.id} />}
          {activeTab === "My Truck" && <TruckProfile vehicle={myVehicle} onUpdated={refreshVehicle} />}
        </div>
      </div>
    </section>
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
        &quot;Find Loads&quot; when you&apos;re ready to go back on duty.
      </p>
    </div>
  );
}

function AvailableLoads({ driverId, vehicle, onAccepted }) {
  const [loads, setLoads] = useState([]);
  const [bidAmounts, setBidAmounts] = useState({});
  const [message, setMessage] = useState("");

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

  async function placeBid(load, accept) {
    if (!vehicle) return setMessage("Register your vehicle before bidding.");
    const amount = accept ? load.offered_rate ?? 0 : Number(bidAmounts[load.id] || 0);

    await supabase.from("bids").insert({
      load_id: load.id,
      driver_id: driverId,
      vehicle_id: vehicle.id,
      bid_amount: amount,
      status: accept ? "accepted" : "pending",
    });

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
      setMessage(`Counter-bid of PKR ${amount} sent to the merchant.`);
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
              </p>
              {l.offered_rate && (
                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                  <WalletIcon className="w-3.5 h-3.5" /> Offered rate: PKR {l.offered_rate}
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

function MyTrips({ vehicle, driverId }) {
  const [loads, setLoads] = useState([]);
  const [openLoad, setOpenLoad] = useState(null);

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
          onChanged={async (fresh) => {
            setOpenLoad(fresh);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
