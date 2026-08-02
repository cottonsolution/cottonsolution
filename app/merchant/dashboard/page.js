"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import VehicleSearch from "@/components/VehicleSearch";
import {
  TruckIcon,
  PlusIcon,
  ChartIcon,
  ShieldCheckIcon,
  CottonIcon,
  WheatIcon,
  RouteIcon,
  WalletIcon,
  BuildingIcon,
  MapPinIcon,
  IdCardIcon,
  UserIcon,
  PhoneIcon,
  CrosshairIcon,
  MenuIcon,
  CloseIcon,
  LogoutIcon,
  RadarIcon,
  ClockIcon,
  TruckCheckIcon,
} from "@/components/Icons";

const COMMODITIES = ["Cotton", "Wheat", "Rapeseed", "Maize", "Rice", "Sugarcane", "Other"];
const COMMODITY_ICON = { Cotton: CottonIcon, Wheat: WheatIcon, Rapeseed: WheatIcon, Maize: WheatIcon, Rice: WheatIcon, Sugarcane: WheatIcon, Other: TruckIcon };

// Each tab gets its own gradient tile — same "semi-realistic" sidebar
// pattern used across Admin and Driver dashboards, so all three portals
// feel like one consistent product.
const TABS = [
  { label: "Post a Load", icon: PlusIcon, from: "#fb923c", to: "#c2410c" },
  { label: "Active Shipments", icon: ChartIcon, from: "#38bdf8", to: "#0369a1" },
  { label: "Verify a Vehicle", icon: ShieldCheckIcon, from: "#4ade80", to: "#15803d" },
  { label: "My Profile", icon: BuildingIcon, from: "#a78bfa", to: "#6d28d9" },
];

export default function MerchantDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [activeTab, setActiveTab] = useState(TABS[0].label);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "merchant")) {
      router.push("/login");
    }
  }, [loading, user, profile, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading || !user || profile?.role !== "merchant") return null;

  const activeMeta = TABS.find((t) => t.label === activeTab);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="icon-tile w-12 h-12" style={{ "--tile-from": "#fb923c", "--tile-to": "#c2410c" }}>
            <TruckIcon className="w-6 h-6 text-white" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy leading-tight">Merchant Dashboard</h1>
            <p className="text-slate-500 text-sm hidden sm:block">Post loads, track shipments, and verify vehicles before dispatch.</p>
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

      <div className="flex gap-6 items-start">
        {/* DESKTOP SIDEBAR — same structure as Admin/Driver dashboards */}
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

          {activeTab === "Post a Load" && <PostLoad merchantId={user.id} />}
          {activeTab === "Active Shipments" && <ActiveShipments merchantId={user.id} />}
          {activeTab === "Verify a Vehicle" && <VehicleSearch />}
          {activeTab === "My Profile" && <MerchantProfile userId={user.id} initialProfile={profile} />}
        </div>
      </div>
    </section>
  );
}

const MUNDS_PER_TON = 26.796; // 1 metric ton ≈ 26.8 Pakistani munds (37.32 kg each)

function PostLoad({ merchantId }) {
  const [form, setForm] = useState({
    commodity: "Cotton",
    quantity_value: "",
    quantity_unit: "Munds",
    pickup_location: "",
    dropoff_location: "",
    offered_rate: "",
    vehicle_type_needed: "",
  });
  const [pickupCoords, setPickupCoords] = useState(null); // { lat, lng }
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [success, setSuccess] = useState(false);
  const [wasLiveConnected, setWasLiveConnected] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("vehicle_types").select("*").order("sort_order").then(({ data }) => setVehicleTypes(data ?? []));
  }, []);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocateError("Location isn't available on this device/browser.");
      return;
    }
    setLocating(true);
    setLocateError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocateError("Couldn't get your location — check permissions.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const value = Number(form.quantity_value);
    const quantityMunds = form.quantity_unit === "Tons" ? Math.round(value * MUNDS_PER_TON * 100) / 100 : value;

    const { error: insertError } = await supabase.from("loads").insert({
      merchant_id: merchantId,
      commodity: form.commodity,
      quantity_munds: quantityMunds,
      quantity_value: value,
      quantity_unit: form.quantity_unit,
      pickup_location: form.pickup_location,
      dropoff_location: form.dropoff_location,
      offered_rate: form.offered_rate ? Number(form.offered_rate) : null,
      vehicle_type_needed: form.vehicle_type_needed || null,
      pickup_lat: pickupCoords?.lat ?? null,
      pickup_lng: pickupCoords?.lng ?? null,
    });
    if (insertError) return setError(insertError.message);
    setSuccess(true);
    setWasLiveConnected(!!pickupCoords);
    setPickupCoords(null);
    setForm({ commodity: "Cotton", quantity_value: "", quantity_unit: "Munds", pickup_location: "", dropoff_location: "", offered_rate: "", vehicle_type_needed: "" });
  }

  const CommodityIcon = COMMODITY_ICON[form.commodity] ?? CottonIcon;

  return (
    <form onSubmit={handleSubmit} className="card max-w-xl space-y-5">
      {success && (
        <p className="text-green-700 text-sm flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
          <TruckIcon className="w-4 h-4 shrink-0" />
          {wasLiveConnected
            ? "Load posted — nearby matching drivers are being alerted right now."
            : "Load posted and visible under Available Loads. Tip: pin a pickup location next time for instant driver alerts."}
        </p>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="icon-badge bg-blue-500/10 text-blue-600 w-9 h-9 rounded-lg shrink-0">
          <RadarIcon className="w-4 h-4" />
        </span>
        <p className="text-xs text-blue-900 leading-relaxed">
          <span className="font-semibold">Live-connected to the Driver App:</span> when you pin a pickup
          location and truck type below, any driver in &quot;Find Loads&quot; mode nearby with a matching
          truck gets an instant ringing alert for this load — no manual searching needed on their end.
        </p>
      </div>

      <div>
        <label className="field-label">
          <CommodityIcon className="w-4 h-4 text-brand-orange" /> Commodity
        </label>
        <div className="grid grid-cols-3 gap-3">
          {COMMODITIES.map((c) => {
            const Icon = COMMODITY_ICON[c];
            const active = form.commodity === c;
            return (
              <button
                type="button"
                key={c}
                onClick={() => setForm((f) => ({ ...f, commodity: c }))}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                  active ? "border-brand-orange bg-brand-orangeSoft text-brand-navy" : "border-slate-200 text-slate-500"
                }`}
              >
                <Icon className="w-6 h-6" />
                {c}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="field-label">
          <ChartIcon className="w-4 h-4 text-brand-orange" /> Quantity
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            required
            min="0"
            step="0.01"
            placeholder="Amount"
            value={form.quantity_value}
            onChange={(e) => setForm((f) => ({ ...f, quantity_value: e.target.value }))}
            className="field-input flex-1"
          />
          <div className="flex rounded-xl bg-slate-100 p-1 shrink-0">
            {["Munds", "Tons"].map((u) => (
              <button
                type="button"
                key={u}
                onClick={() => setForm((f) => ({ ...f, quantity_unit: u }))}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  form.quantity_unit === u ? "bg-white shadow text-brand-navy" : "text-slate-500"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="field-label">
          <TruckIcon className="w-4 h-4 text-brand-orange" /> Truck Type Needed (optional)
        </label>
        <select
          value={form.vehicle_type_needed}
          onChange={(e) => setForm((f) => ({ ...f, vehicle_type_needed: e.target.value }))}
          className="field-input"
        >
          <option value="">Any truck type</option>
          {vehicleTypes.map((t) => (
            <option key={t.id} value={t.name}>{t.name}</option>
          ))}
        </select>
        <p className="text-xs text-slate-400 mt-1">Only drivers with a matching registered truck will be alerted first.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="field-label">
            <RouteIcon className="w-4 h-4 text-brand-orange" /> Pickup Location
          </label>
          <input
            required
            value={form.pickup_location}
            onChange={(e) => setForm((f) => ({ ...f, pickup_location: e.target.value }))}
            className="field-input"
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className={`mt-2 w-full inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border-2 transition-colors disabled:opacity-50 ${
              pickupCoords
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-brand-orange/40 text-brand-orange hover:bg-brand-orangeSoft"
            }`}
          >
            <CrosshairIcon className="w-4 h-4" />
            {locating ? "Locating…" : pickupCoords ? "Location pinned — drivers will be alerted" : "Pin Pickup Location (for live driver alerts)"}
          </button>
          {locateError && <p className="text-xs text-red-500 mt-1">{locateError}</p>}
        </div>
        <div>
          <label className="field-label">
            <RouteIcon className="w-4 h-4 text-brand-orange" /> Drop-off Location
          </label>
          <input
            required
            value={form.dropoff_location}
            onChange={(e) => setForm((f) => ({ ...f, dropoff_location: e.target.value }))}
            className="field-input"
          />
        </div>
      </div>
      <div>
        <label className="field-label">
          <WalletIcon className="w-4 h-4 text-brand-orange" /> Target Freight Rate (PKR, optional)
        </label>
        <input
          type="number"
          value={form.offered_rate}
          onChange={(e) => setForm((f) => ({ ...f, offered_rate: e.target.value }))}
          className="field-input"
        />
      </div>
      <button type="submit" className="btn-orange w-full">
        <PlusIcon className="w-4 h-4" /> Post Load
      </button>
    </form>
  );
}

function MerchantProfile({ userId, initialProfile }) {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    company_name: "",
    business_city: "",
    ntn_number: "",
    warehouse_address: "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialProfile) {
      setForm({
        full_name: initialProfile.full_name ?? "",
        phone: initialProfile.phone ?? "",
        company_name: initialProfile.company_name ?? "",
        business_city: initialProfile.business_city ?? "",
        ntn_number: initialProfile.ntn_number ?? "",
        warehouse_address: initialProfile.warehouse_address ?? "",
      });
    }
  }, [initialProfile]);

  async function handleSave(e) {
    e.preventDefault();
    setSaved(false);
    setError("");
    const { error: updateError } = await supabase.from("profiles").update(form).eq("id", userId);
    if (updateError) return setError(updateError.message);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSave} className="card max-w-xl space-y-5">
      {saved && <p className="text-green-700 text-sm">Profile updated.</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div>
        <label className="field-label">
          <UserIcon className="w-4 h-4 text-brand-orange" /> Owner / Representative Name
        </label>
        <input
          value={form.full_name}
          onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          className="field-input"
        />
      </div>
      <div>
        <label className="field-label">
          <PhoneIcon className="w-4 h-4 text-brand-orange" /> Mobile No
        </label>
        <input
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className="field-input"
        />
      </div>
      <div>
        <label className="field-label">
          <BuildingIcon className="w-4 h-4 text-brand-orange" /> Merchant / Company Name
        </label>
        <input
          value={form.company_name}
          onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
          className="field-input"
        />
      </div>
      <div>
        <label className="field-label">
          <MapPinIcon className="w-4 h-4 text-brand-orange" /> Business City / Location
        </label>
        <input
          value={form.business_city}
          onChange={(e) => setForm((f) => ({ ...f, business_city: e.target.value }))}
          className="field-input"
        />
      </div>
      <div>
        <label className="field-label">
          <IdCardIcon className="w-4 h-4 text-brand-orange" /> Business / NTN Number
        </label>
        <input
          value={form.ntn_number}
          onChange={(e) => setForm((f) => ({ ...f, ntn_number: e.target.value }))}
          className="field-input"
        />
      </div>
      <div>
        <label className="field-label">
          <BuildingIcon className="w-4 h-4 text-brand-orange" /> Address / Warehouse Location
        </label>
        <textarea
          rows={2}
          value={form.warehouse_address}
          onChange={(e) => setForm((f) => ({ ...f, warehouse_address: e.target.value }))}
          className="field-input"
        />
      </div>
      <button type="submit" className="btn-orange w-full">Save Profile</button>
    </form>
  );
}

// Maps each shipment-status tab to the underlying `loads.status` value(s)
// it should include. "Load On Way" also catches "delivered" so completed
// trips don't just disappear from the merchant's view.
const SHIPMENT_TABS = [
  { label: "Waiting for Truck", statuses: ["open"], icon: ClockIcon, from: "#f59e0b", to: "#b45309" },
  { label: "Load Accepted", statuses: ["assigned"], icon: ShieldCheckIcon, from: "#38bdf8", to: "#0369a1" },
  { label: "Load On Way", statuses: ["in_transit", "delivered"], icon: TruckCheckIcon, from: "#4ade80", to: "#15803d" },
];

function ActiveShipments({ merchantId }) {
  const [loads, setLoads] = useState([]);
  const [biltyMap, setBiltyMap] = useState({});
  const [vehicleMap, setVehicleMap] = useState({});
  const [shipmentTab, setShipmentTab] = useState(SHIPMENT_TABS[0].label);

  useEffect(() => {
    supabase
      .from("loads")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const loadRows = data ?? [];
        setLoads(loadRows);

        const loadIds = loadRows.map((l) => l.id);
        if (loadIds.length) {
          const { data: biltys } = await supabase.from("biltys").select("*").in("load_id", loadIds);
          const bMap = {};
          (biltys ?? []).forEach((b) => (bMap[b.load_id] = b));
          setBiltyMap(bMap);
        }

        const vehicleIds = [...new Set(loadRows.map((l) => l.assigned_vehicle_id).filter(Boolean))];
        if (vehicleIds.length) {
          const { data: vehicles } = await supabase.from("vehicles").select("*").in("id", vehicleIds);
          const vMap = {};
          (vehicles ?? []).forEach((v) => (vMap[v.id] = v));
          setVehicleMap(vMap);
        }
      });
  }, [merchantId]);

  const counts = SHIPMENT_TABS.reduce((acc, tab) => {
    acc[tab.label] = loads.filter((l) => tab.statuses.includes(l.status)).length;
    return acc;
  }, {});
  const activeStatuses = SHIPMENT_TABS.find((t) => t.label === shipmentTab)?.statuses ?? [];
  const visibleLoads = loads.filter((l) => activeStatuses.includes(l.status));

  return (
    <div>
      {/* Status tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {SHIPMENT_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setShipmentTab(tab.label)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${
              shipmentTab === tab.label ? "bg-white shadow-card text-brand-navy" : "bg-slate-100 text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="icon-tile w-7 h-7 rounded-lg" style={{ "--tile-from": tab.from, "--tile-to": tab.to }}>
              <tab.icon className="w-3.5 h-3.5 text-white" />
            </span>
            {tab.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${shipmentTab === tab.label ? "bg-brand-orangeSoft text-brand-orange" : "bg-slate-200 text-slate-500"}`}>
              {counts[tab.label] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Cards list */}
      <div className="space-y-3">
        {visibleLoads.length === 0 && (
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <ChartIcon className="w-4 h-4" /> No loads in this stage right now.
          </p>
        )}
        {visibleLoads.map((l) => {
          const CommodityIcon = COMMODITY_ICON[l.commodity] ?? CottonIcon;
          const vehicle = l.assigned_vehicle_id ? vehicleMap[l.assigned_vehicle_id] : null;
          return (
            <div key={l.id} className="card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl shrink-0">
                    <CommodityIcon className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-brand-navy">
                      {l.commodity} — {l.quantity_value ?? l.quantity_munds} {l.quantity_unit ?? "Munds"}
                    </p>
                    <p className="text-sm text-slate-500 flex items-center gap-1.5">
                      <RouteIcon className="w-3.5 h-3.5 shrink-0" /> {l.pickup_location} &rarr; {l.dropoff_location}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="badge-valid capitalize">{l.status.replace("_", " ")}</span>
                  {biltyMap[l.id] && <span className="text-xs text-slate-500">Bilty: {biltyMap[l.id].bilty_no}</span>}
                </div>
              </div>

              {/* Vehicle & driver details — shown once a truck has accepted the load */}
              {vehicle ? (
                <div className="border-t border-slate-100 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <VehicleDetail icon={TruckIcon} label="Vehicle No" value={vehicle.vehicle_no} />
                  <VehicleDetail icon={TruckCheckIcon} label="Vehicle Type" value={vehicle.vehicle_type || "—"} />
                  <VehicleDetail icon={UserIcon} label="Driver" value={vehicle.driver_name} />
                  <VehicleDetail icon={PhoneIcon} label="Mobile" value={vehicle.mobile_no} />
                </div>
              ) : (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5" /> Waiting for a verified driver to accept this load.
                  </p>
                </div>
              )}
            </div>
          );
        })}
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
      <p className="text-sm font-semibold text-brand-navy truncate">{value}</p>
    </div>
  );
}
