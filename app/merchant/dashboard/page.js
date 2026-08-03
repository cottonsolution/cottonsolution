"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseBrowserClient";
import { useUser } from "@/lib/useUser";
import VehicleSearch from "@/components/VehicleSearch";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { effectiveStage, stageMeta, MAX_STAGE, TRIP_STAGES } from "@/lib/tripStages";
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
  CloseIcon,
  LogoutIcon,
  RadarIcon,
  ClockIcon,
  TruckCheckIcon,
  EditIcon,
  EyeIcon,
  TrashIcon,
  BoxIcon,
  ScaleIcon,
  ChatIcon,
  UploadIcon,
  CheckCircleIcon,
  DocumentCheckIcon,
  GavelIcon,
} from "@/components/Icons";
import ChatHub from "@/components/chat/ChatHub";
import LoadChatButton from "@/components/chat/LoadChatButton";
import LoadAcceptedAlert from "@/components/merchant/LoadAcceptedAlert";
import LoadBidsPanel from "@/components/merchant/LoadBidsPanel";
import CallButton from "@/components/CallButton";
import BiltyModal from "@/components/BiltyModal";
import { subscribeToPush } from "@/lib/pushClient";
import { submitBilty, approveArrival } from "@/lib/shipmentActions";
import { getRoadDistanceKm } from "@/lib/distance";
import { estimateFare } from "@/lib/fareEstimate";

const LiveVehicleMap = dynamic(() => import("@/components/merchant/LiveVehicleMap"), { ssr: false });

const MiniMapPreview = dynamic(() => import("@/components/MiniMapPreview"), { ssr: false });

const COMMODITY_ICON = { Cotton: CottonIcon, Wheat: WheatIcon, Rapeseed: WheatIcon, Maize: WheatIcon, Rice: WheatIcon, Sugarcane: WheatIcon, Other: TruckIcon };

// Each tab gets its own gradient tile — same "semi-realistic" sidebar
// pattern used across Admin and Driver dashboards, so all three portals
// feel like one consistent product.
const TABS = [
  { label: "Post a Load", short: "Post Load", icon: PlusIcon, from: "#fb923c", to: "#c2410c" },
  { label: "Active Shipments", short: "Shipments", icon: ChartIcon, from: "#38bdf8", to: "#0369a1" },
  { label: "Messages", short: "Chat", icon: ChatIcon, from: "#f472b6", to: "#be185d" },
  { label: "Verify a Vehicle", short: "Verify", icon: ShieldCheckIcon, from: "#4ade80", to: "#15803d" },
  { label: "My Profile", short: "Profile", icon: BuildingIcon, from: "#a78bfa", to: "#6d28d9" },
];

export default function MerchantDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [activeTab, setActiveTab] = useState(TABS[0].label);
  const [acceptedAlert, setAcceptedAlert] = useState(null); // { load, vehicle }

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "merchant")) {
      router.push("/login");
    }
  }, [loading, user, profile, router]);

  // Background/lock-screen push alerts (driver accepted, documentation
  // ready, truck arrived, new chat message) — safe to call repeatedly.
  useEffect(() => {
    if (user) subscribeToPush(user.id);
  }, [user]);

  // Call-style ring the instant a driver accepts one of this merchant's
  // loads — the merchant-side equivalent of the driver's incoming-load ring.
  useEffect(() => {
    if (!user) return undefined;
    const channel = supabase
      .channel(`merchant-load-accepted-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "loads", filter: `merchant_id=eq.${user.id}` },
        async ({ new: updated, old: previous }) => {
          if (previous.status === "open" && updated.status === "assigned" && updated.assigned_vehicle_id) {
            const { data: vehicle } = await supabase.from("vehicles").select("*").eq("id", updated.assigned_vehicle_id).maybeSingle();
            setAcceptedAlert({ load: updated, vehicle });
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading || !user || profile?.role !== "merchant") return null;

  const activeMeta = TABS.find((t) => t.label === activeTab);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-12 pb-24 lg:pb-12">
      {acceptedAlert && (
        <LoadAcceptedAlert
          load={acceptedAlert.load}
          vehicle={acceptedAlert.vehicle}
          onDismiss={() => {
            setAcceptedAlert(null);
            setActiveTab("Active Shipments");
          }}
        />
      )}

      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <span className="icon-tile w-10 h-10 sm:w-12 sm:h-12 shrink-0" style={{ "--tile-from": "#fb923c", "--tile-to": "#c2410c" }}>
            <TruckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-brand-navy leading-tight truncate">Merchant Dashboard</h1>
            <p className="text-slate-500 text-sm hidden sm:block">Post loads, track shipments, and verify vehicles before dispatch.</p>
          </div>
        </div>

        {/* Mobile: nav lives in the bottom tab bar now, so the top-right slot
            just holds a quick logout button. */}
        <button
          className="lg:hidden w-10 h-10 rounded-xl bg-white shadow-card flex items-center justify-center text-red-500 shrink-0"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <LogoutIcon className="w-5 h-5" />
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

        {/* CONTENT */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 lg:hidden">
            <span className="icon-tile w-8 h-8 sm:w-9 sm:h-9" style={{ "--tile-from": activeMeta.from, "--tile-to": activeMeta.to }}>
              <activeMeta.icon className="w-4 h-4 text-white" />
            </span>
            <h2 className="font-bold text-brand-navy text-sm sm:text-base whitespace-nowrap">{activeTab}</h2>
          </div>

          {activeTab === "Post a Load" && <PostLoad merchantId={user.id} />}
          {activeTab === "Active Shipments" && <ActiveShipments merchantId={user.id} />}
          {activeTab === "Messages" && <ChatHub userId={user.id} role="merchant" />}
          {activeTab === "Verify a Vehicle" && <VehicleSearch />}
          {activeTab === "My Profile" && <MerchantProfile userId={user.id} initialProfile={profile} />}
        </div>
      </div>

      {/* MOBILE BOTTOM TAB BAR — thumb-reachable primary navigation. Replaces
          the old hamburger + off-canvas drawer, which made merchants take an
          extra tap just to switch sections and buried Logout two levels deep. */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100"
        style={{ boxShadow: "0 -4px 16px rgba(14, 59, 46, 0.08)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.label;
            return (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className="flex flex-col items-center justify-center gap-1 py-2 min-h-[56px]"
                aria-current={isActive ? "page" : undefined}
              >
                <span
                  className="icon-tile w-8 h-8 rounded-xl transition-transform"
                  style={{
                    "--tile-from": isActive ? tab.from : "#cbd5e1",
                    "--tile-to": isActive ? tab.to : "#94a3b8",
                    transform: isActive ? "translateY(-1px) scale(1.05)" : "none",
                  }}
                >
                  <tab.icon className="w-4 h-4 text-white" />
                </span>
                <span className={`text-[10.5px] font-semibold leading-none ${isActive ? "text-brand-navy" : "text-slate-400"}`}>
                  {tab.short}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </section>
  );
}

const MUNDS_PER_TON = 26.796; // 1 metric ton ≈ 26.8 Pakistani munds (37.32 kg each)

// Best-effort conversion into the legacy `quantity_munds` column (kept for
// backward compatibility / driver-side matching). Custom admin-added units
// with no known conversion factor are stored as-is (1:1) since we can't
// infer their weight without the admin defining a conversion — the
// `quantity_value` + `quantity_unit` pair is always the source of truth.
function toMunds(value, unitName) {
  if (unitName === "Tons") return Math.round(value * MUNDS_PER_TON * 100) / 100;
  if (unitName === "KGs") return Math.round((value / 37.32) * 100) / 100;
  return value; // Munds, Bori, or any other custom unit
}

const EMPTY_FORM = {
  commodity_id: "",
  quantity_value: "",
  quantity_unit_id: "",
  vehicle_type_id: "",
  pickup_location: "",
  dropoff_location: "",
  offered_rate: "",
  offered_rate_unit_id: "",
};

function PostLoad({ merchantId }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [pickupCoords, setPickupCoords] = useState(null); // { lat, lng, place_id }
  const [dropoffCoords, setDropoffCoords] = useState(null); // { lat, lng, place_id }
  const [commodities, setCommodities] = useState([]);
  const [quantityUnits, setQuantityUnits] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [success, setSuccess] = useState(false);
  const [wasLiveConnected, setWasLiveConnected] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0); // bumped after a successful post so the cards list refetches
  const [editingLoad, setEditingLoad] = useState(null); // load row being edited, or null

  // ---- Live distance & fare suggestion (functional requirement #1) ----
  const [distanceKm, setDistanceKm] = useState(null);
  const [distanceSource, setDistanceSource] = useState(null); // "osrm" | "estimated"
  const [calculatingDistance, setCalculatingDistance] = useState(false);
  const [fareApplied, setFareApplied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!pickupCoords || !dropoffCoords) {
      setDistanceKm(null);
      setDistanceSource(null);
      return;
    }
    setCalculatingDistance(true);
    setFareApplied(false);
    getRoadDistanceKm(pickupCoords, dropoffCoords).then(({ km, source }) => {
      if (cancelled) return;
      setDistanceKm(km);
      setDistanceSource(source);
      setCalculatingDistance(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pickupCoords, dropoffCoords]);

  const selectedVehicleTypeName = vehicleTypes.find((v) => v.id === form.vehicle_type_id)?.name;
  const suggestedFare = distanceKm ? estimateFare(distanceKm, selectedVehicleTypeName) : null;

  function applySuggestedFare() {
    if (!suggestedFare) return;
    setForm((f) => ({ ...f, offered_rate: String(suggestedFare) }));
    setFareApplied(true);
  }

  // Dynamic dropdown sources — Commodity, Quantity Unit, and Truck Type all
  // come from the Admin Dashboard (functional requirements #1, #2, #3, #6).
  useEffect(() => {
    supabase.from("commodities").select("*").eq("active", true).order("sort_order").then(({ data }) => {
      setCommodities(data ?? []);
      setForm((f) => (f.commodity_id ? f : { ...f, commodity_id: data?.[0]?.id ?? "" }));
    });
    supabase.from("quantity_units").select("*").eq("active", true).order("sort_order").then(({ data }) => {
      setQuantityUnits(data ?? []);
      setForm((f) => ({
        ...f,
        quantity_unit_id: f.quantity_unit_id || data?.[0]?.id || "",
        offered_rate_unit_id: f.offered_rate_unit_id || data?.[0]?.id || "",
      }));
    });
    supabase.from("vehicle_types").select("*").order("sort_order").then(({ data }) => setVehicleTypes(data ?? []));
  }, []);

  function resetForm() {
    setForm({
      ...EMPTY_FORM,
      commodity_id: commodities[0]?.id ?? "",
      quantity_unit_id: quantityUnits[0]?.id ?? "",
      offered_rate_unit_id: quantityUnits[0]?.id ?? "",
    });
    setPickupCoords(null);
    setDropoffCoords(null);
    setDistanceKm(null);
    setDistanceSource(null);
    setFareApplied(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.commodity_id) return setError("Please select a commodity.");
    if (!form.quantity_unit_id) return setError("Please select a quantity unit.");
    if (!form.vehicle_type_id) return setError("Truck type is required — please select one.");

    const commodity = commodities.find((c) => c.id === form.commodity_id);
    const quantityUnit = quantityUnits.find((u) => u.id === form.quantity_unit_id);
    const vehicleType = vehicleTypes.find((v) => v.id === form.vehicle_type_id);
    const rateUnit = quantityUnits.find((u) => u.id === form.offered_rate_unit_id);

    const value = Number(form.quantity_value);

    const { error: insertError } = await supabase.from("loads").insert({
      merchant_id: merchantId,
      commodity: commodity?.name ?? "Other",
      commodity_id: form.commodity_id,
      quantity_munds: toMunds(value, quantityUnit?.name),
      quantity_value: value,
      quantity_unit: quantityUnit?.name ?? "Munds",
      quantity_unit_id: form.quantity_unit_id,
      pickup_location: form.pickup_location,
      dropoff_location: form.dropoff_location,
      pickup_lat: pickupCoords?.lat ?? null,
      pickup_lng: pickupCoords?.lng ?? null,
      pickup_place_id: pickupCoords?.place_id ?? null,
      dropoff_lat: dropoffCoords?.lat ?? null,
      dropoff_lng: dropoffCoords?.lng ?? null,
      dropoff_place_id: dropoffCoords?.place_id ?? null,
      offered_rate: form.offered_rate ? Number(form.offered_rate) : null,
      offered_rate_unit: form.offered_rate ? rateUnit?.name ?? null : null,
      offered_rate_unit_id: form.offered_rate ? form.offered_rate_unit_id : null,
      vehicle_type_needed: vehicleType?.name ?? null,
      vehicle_type_id: form.vehicle_type_id,
      distance_km: distanceKm,
    });
    if (insertError) return setError(insertError.message);

    setSuccess(true);
    setWasLiveConnected(!!pickupCoords);
    resetForm();
    setRefreshKey((k) => k + 1);
  }

  const selectedCommodity = commodities.find((c) => c.id === form.commodity_id);
  const CommodityIcon = COMMODITY_ICON[selectedCommodity?.name] ?? CottonIcon;

  return (
    <div className="space-y-8">
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

        {/* 1. COMMODITY — dynamic dropdown fed by Admin > Commodity */}
        <div>
          <label className="field-label">
            <CommodityIcon className="w-4 h-4 text-brand-orange" /> Commodity
          </label>
          <select
            required
            value={form.commodity_id}
            onChange={(e) => setForm((f) => ({ ...f, commodity_id: e.target.value }))}
            className="field-input"
          >
            <option value="" disabled>Select commodity…</option>
            {commodities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {commodities.length === 0 && (
            <p className="text-xs text-red-500 mt-1">No commodities configured yet — ask the admin to add some under Commodity.</p>
          )}
        </div>

        {/* 2. QUANTITY — numeric amount + dynamic unit dropdown fed by Admin > Quantity Units */}
        <div>
          <label className="field-label">
            <ChartIcon className="w-4 h-4 text-brand-orange" /> Quantity
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="number" inputMode="decimal"
              required
              min="0"
              step="0.01"
              placeholder="Amount"
              value={form.quantity_value}
              onChange={(e) => setForm((f) => ({ ...f, quantity_value: e.target.value }))}
              className="field-input flex-1"
            />
            <select
              required
              value={form.quantity_unit_id}
              onChange={(e) => setForm((f) => ({ ...f, quantity_unit_id: e.target.value }))}
              className="field-input sm:w-40 shrink-0"
            >
              <option value="" disabled>Unit…</option>
              {quantityUnits.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. TRUCK TYPE — now compulsory, dynamic dropdown fed by Admin > Truck Types */}
        <div>
          <label className="field-label">
            <TruckIcon className="w-4 h-4 text-brand-orange" /> Truck Type <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.vehicle_type_id}
            onChange={(e) => setForm((f) => ({ ...f, vehicle_type_id: e.target.value }))}
            className="field-input"
          >
            <option value="" disabled>Select truck type…</option>
            {vehicleTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">Required — only drivers with a matching registered truck will be alerted.</p>
        </div>

        {/* 4 & 5. PICKUP & DROP-OFF — map-based location search with live preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LocationAutocomplete
            label="Pickup Location"
            required
            value={form.pickup_location}
            onChangeText={(text) => setForm((f) => ({ ...f, pickup_location: text }))}
            onSelect={({ label, lat, lng, place_id }) => {
              setForm((f) => ({ ...f, pickup_location: label }));
              setPickupCoords({ lat, lng, place_id });
            }}
            coords={pickupCoords}
          />
          <LocationAutocomplete
            label="Drop-off Location"
            required
            value={form.dropoff_location}
            onChangeText={(text) => setForm((f) => ({ ...f, dropoff_location: text }))}
            onSelect={({ label, lat, lng, place_id }) => {
              setForm((f) => ({ ...f, dropoff_location: label }));
              setDropoffCoords({ lat, lng, place_id });
            }}
            coords={dropoffCoords}
          />
        </div>

        {/* LIVE DISTANCE & FARE SUGGESTION — functional requirement #1.
            Appears once both pickup and drop-off are pinned; auto-calculates
            road distance (OSRM) and suggests a starting base fare which the
            merchant can accept as-is or edit before posting. */}
        {(pickupCoords && dropoffCoords) && (
          <div className="bg-brand-orangeSoft/60 border border-brand-orange/20 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
              <RouteIcon className="w-4 h-4 text-brand-orange" />
              {calculatingDistance ? "Calculating distance…" : distanceKm ? `${distanceKm} km route` : "Distance unavailable"}
              {distanceSource === "estimated" && !calculatingDistance && (
                <span className="text-[10px] font-medium text-slate-400">(estimated)</span>
              )}
            </div>
            {!calculatingDistance && suggestedFare != null && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">
                  Suggested base fare: <span className="font-bold text-brand-navy">PKR {suggestedFare.toLocaleString()}</span>
                </p>
                <button
                  type="button"
                  onClick={applySuggestedFare}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                    fareApplied ? "border-green-400 text-green-700 bg-green-50" : "border-brand-orange text-brand-orange hover:bg-white"
                  }`}
                >
                  {fareApplied ? "Applied ✓" : "Use this fare"}
                </button>
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              This is only a starting point — you can edit it below, and drivers can still counter-offer their own rate.
            </p>
          </div>
        )}

        {/* 6. TARGET FREIGHT — numeric amount + dynamic rate-unit dropdown */}
        <div>
          <label className="field-label">
            <WalletIcon className="w-4 h-4 text-brand-orange" /> Target Freight Rate (PKR, optional)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="number" inputMode="decimal"
              placeholder="e.g. 1200"
              value={form.offered_rate}
              onChange={(e) => setForm((f) => ({ ...f, offered_rate: e.target.value }))}
              className="field-input flex-1"
            />
            <select
              value={form.offered_rate_unit_id}
              onChange={(e) => setForm((f) => ({ ...f, offered_rate_unit_id: e.target.value }))}
              className="field-input sm:w-32 shrink-0"
            >
              {quantityUnits.map((u) => (
                <option key={u.id} value={u.id}>/ {u.name}</option>
              ))}
            </select>
          </div>
          {form.offered_rate && (
            <p className="text-xs text-slate-400 mt-1">
              PKR {form.offered_rate} / {quantityUnits.find((u) => u.id === form.offered_rate_unit_id)?.name ?? "unit"}
            </p>
          )}
        </div>

        <button type="submit" className="btn-orange w-full">
          <PlusIcon className="w-4 h-4" /> Post Load
        </button>
      </form>

      {/* POSTED LOADS — cards with Edit / Delete / View; disappear automatically
          once a driver accepts (status leaves "open") */}
      <PostedLoadsList merchantId={merchantId} refreshKey={refreshKey} onEdit={setEditingLoad} />

      {editingLoad && (
        <EditLoadModal
          load={editingLoad}
          commodities={commodities}
          quantityUnits={quantityUnits}
          vehicleTypes={vehicleTypes}
          onClose={() => setEditingLoad(null)}
          onSaved={() => {
            setEditingLoad(null);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// POSTED LOADS — active "open" load cards for the current merchant, with
// Edit / Delete / View actions. Subscribes to Supabase Realtime so a card
// disappears the instant a driver accepts the load (status leaves "open"),
// without the merchant needing to refresh the page.
// ---------------------------------------------------------------------------
function PostedLoadsList({ merchantId, refreshKey, onEdit }) {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewLoad, setViewLoad] = useState(null);
  const [bidsLoad, setBidsLoad] = useState(null); // load whose Bid Review panel is open
  const [bidCounts, setBidCounts] = useState({}); // load_id -> pending bid count

  async function refresh() {
    const { data } = await supabase
      .from("loads")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("status", "open")
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    setLoads(rows);
    setLoading(false);

    // Pending-bid counts, so the "View Bids" button shows a live badge
    // without opening the panel first.
    const loadIds = rows.map((l) => l.id);
    if (loadIds.length) {
      const { data: bidRows } = await supabase.from("bids").select("load_id, status").in("load_id", loadIds).eq("status", "pending");
      const counts = {};
      (bidRows ?? []).forEach((b) => {
        counts[b.load_id] = (counts[b.load_id] || 0) + 1;
      });
      setBidCounts(counts);
    } else {
      setBidCounts({});
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId, refreshKey]);

  // Realtime: any INSERT/UPDATE/DELETE on this merchant's loads re-syncs the
  // list, so a card vanishes the moment `status` flips away from "open"
  // (i.e. a driver accepted it) — see workflow requirement in the spec.
  useEffect(() => {
    const channel = supabase
      .channel(`merchant-open-loads-${merchantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loads", filter: `merchant_id=eq.${merchantId}` },
        () => refresh()
      )
      .subscribe();
    // New/updated bids on any of this merchant's loads bump the badge live
    // (functional requirement #2 — Supabase Realtime bidding updates).
    const bidsChannel = supabase
      .channel(`merchant-bid-badges-${merchantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(bidsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  async function handleDelete(id) {
    if (!confirm("Delete this posted load? This can't be undone.")) return;
    await supabase.from("loads").delete().eq("id", id);
    refresh();
  }

  return (
    <div>
      <h3 className="font-semibold text-brand-navy mb-3">Your Posted Loads</h3>
      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!loading && loads.length === 0 && (
        <p className="text-slate-400 text-sm flex items-center gap-2">
          <ChartIcon className="w-4 h-4" /> No active posted loads. Once you post one above, it&apos;ll show up here as a card until a driver accepts it.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {loads.map((l) => {
          const CommodityIcon = COMMODITY_ICON[l.commodity] ?? CottonIcon;
          return (
            <div key={l.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl shrink-0">
                    <CommodityIcon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-navy truncate">
                      {l.commodity} — {l.quantity_value ?? l.quantity_munds} {l.quantity_unit ?? "Munds"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{l.vehicle_type_needed ?? "Any truck"}</p>
                  </div>
                </div>
                <span className="badge-valid shrink-0">Open</span>
              </div>

              <p className="text-sm text-slate-500 flex items-start gap-1.5">
                <RouteIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="truncate">{l.pickup_location} &rarr; {l.dropoff_location}</span>
              </p>

              {l.offered_rate && (
                <p className="text-sm font-semibold text-brand-navy">
                  PKR {l.offered_rate} / {l.offered_rate_unit ?? l.quantity_unit ?? "unit"}
                </p>
              )}
              {l.distance_km != null && (
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <RouteIcon className="w-3 h-3" /> {l.distance_km} km route
                </p>
              )}

              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <button onClick={() => setViewLoad(l)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2.5 min-h-[40px] text-xs font-semibold border border-slate-300 rounded-lg text-slate-600 active:bg-slate-50">
                  <EyeIcon className="w-3.5 h-3.5" /> View
                </button>
                <button onClick={() => onEdit(l)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2.5 min-h-[40px] text-xs font-semibold border border-slate-300 rounded-lg text-slate-600 active:bg-slate-50">
                  <EditIcon className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => handleDelete(l.id)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2.5 min-h-[40px] text-xs font-semibold border border-red-200 text-red-600 rounded-lg active:bg-red-50">
                  <TrashIcon className="w-3.5 h-3.5" /> Delete
                </button>
              </div>

              {/* Bid Review entry point — functional requirement #3.
                  Badge shows the live pending-bid count via Supabase
                  Realtime, so the merchant knows to check without opening
                  the panel first. */}
              <button
                onClick={() => setBidsLoad(l)}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] text-xs font-bold rounded-lg ${
                  bidCounts[l.id] ? "bg-brand-orange text-white" : "border border-slate-300 text-slate-600 active:bg-slate-50"
                }`}
              >
                <GavelIcon className="w-3.5 h-3.5" />
                {bidCounts[l.id] ? `View Bids (${bidCounts[l.id]} new)` : "View Bids"}
              </button>
            </div>
          );
        })}
      </div>

      {viewLoad && <ViewLoadModal load={viewLoad} onClose={() => setViewLoad(null)} />}
      {bidsLoad && (
        <LoadBidsPanel
          load={bidsLoad}
          merchantId={merchantId}
          onClose={() => setBidsLoad(null)}
          onAccepted={() => {
            setBidsLoad(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-brand-navy">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VIEW modal — read-only full detail view of a posted load, with a
// side-by-side pickup/drop-off map preview when coordinates are available.
// ---------------------------------------------------------------------------
function ViewLoadModal({ load, onClose }) {
  return (
    <ModalShell title="Load Details" onClose={onClose}>
      <div className="space-y-4">
        <DetailRow icon={BoxIcon} label="Commodity" value={load.commodity} />
        <DetailRow icon={ScaleIcon} label="Quantity" value={`${load.quantity_value ?? load.quantity_munds} ${load.quantity_unit ?? "Munds"}`} />
        <DetailRow icon={TruckIcon} label="Truck Type" value={load.vehicle_type_needed ?? "Any truck"} />
        <DetailRow icon={RouteIcon} label="Pickup" value={load.pickup_location} />
        {load.pickup_lat && <MiniMapPreview lat={load.pickup_lat} lng={load.pickup_lng} />}
        <DetailRow icon={RouteIcon} label="Drop-off" value={load.dropoff_location} />
        {load.dropoff_lat && <MiniMapPreview lat={load.dropoff_lat} lng={load.dropoff_lng} />}
        {load.distance_km != null && <DetailRow icon={RouteIcon} label="Route Distance" value={`${load.distance_km} km`} />}
        {load.offered_rate && (
          <DetailRow icon={WalletIcon} label="Target Freight" value={`PKR ${load.offered_rate} / ${load.offered_rate_unit ?? load.quantity_unit ?? "unit"}`} />
        )}
        <DetailRow icon={ClockIcon} label="Status" value="Open — waiting for a driver to accept" />
      </div>
    </ModalShell>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>
      <p className="text-sm font-semibold text-brand-navy">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EDIT modal — lets the merchant correct an "open" load's details before a
// driver accepts it. Reuses the same dynamic dropdown data already loaded
// by the parent PostLoad form.
// ---------------------------------------------------------------------------
function EditLoadModal({ load, commodities, quantityUnits, vehicleTypes, onClose, onSaved }) {
  const [form, setForm] = useState({
    commodity_id: load.commodity_id ?? "",
    quantity_value: load.quantity_value ?? load.quantity_munds ?? "",
    quantity_unit_id: load.quantity_unit_id ?? "",
    vehicle_type_id: load.vehicle_type_id ?? "",
    pickup_location: load.pickup_location ?? "",
    dropoff_location: load.dropoff_location ?? "",
    offered_rate: load.offered_rate ?? "",
    offered_rate_unit_id: load.offered_rate_unit_id ?? "",
  });
  const [pickupCoords, setPickupCoords] = useState(load.pickup_lat ? { lat: load.pickup_lat, lng: load.pickup_lng, place_id: load.pickup_place_id } : null);
  const [dropoffCoords, setDropoffCoords] = useState(load.dropoff_lat ? { lat: load.dropoff_lat, lng: load.dropoff_lng, place_id: load.dropoff_place_id } : null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const commodity = commodities.find((c) => c.id === form.commodity_id);
    const quantityUnit = quantityUnits.find((u) => u.id === form.quantity_unit_id);
    const vehicleType = vehicleTypes.find((v) => v.id === form.vehicle_type_id);
    const rateUnit = quantityUnits.find((u) => u.id === form.offered_rate_unit_id);
    const value = Number(form.quantity_value);

    // Recompute the route distance only if the pinned points actually
    // changed in this edit; otherwise keep the value already stored.
    let distanceKm = load.distance_km ?? null;
    if (pickupCoords && dropoffCoords) {
      const { km } = await getRoadDistanceKm(pickupCoords, dropoffCoords);
      distanceKm = km;
    }

    const { error: updateError } = await supabase
      .from("loads")
      .update({
        commodity: commodity?.name ?? load.commodity,
        commodity_id: form.commodity_id || null,
        quantity_munds: toMunds(value, quantityUnit?.name),
        quantity_value: value,
        quantity_unit: quantityUnit?.name ?? load.quantity_unit,
        quantity_unit_id: form.quantity_unit_id || null,
        vehicle_type_needed: vehicleType?.name ?? null,
        vehicle_type_id: form.vehicle_type_id || null,
        pickup_location: form.pickup_location,
        dropoff_location: form.dropoff_location,
        pickup_lat: pickupCoords?.lat ?? load.pickup_lat ?? null,
        pickup_lng: pickupCoords?.lng ?? load.pickup_lng ?? null,
        pickup_place_id: pickupCoords?.place_id ?? load.pickup_place_id ?? null,
        dropoff_lat: dropoffCoords?.lat ?? load.dropoff_lat ?? null,
        dropoff_lng: dropoffCoords?.lng ?? load.dropoff_lng ?? null,
        dropoff_place_id: dropoffCoords?.place_id ?? load.dropoff_place_id ?? null,
        offered_rate: form.offered_rate ? Number(form.offered_rate) : null,
        offered_rate_unit: form.offered_rate ? rateUnit?.name ?? null : null,
        offered_rate_unit_id: form.offered_rate ? form.offered_rate_unit_id || null : null,
        distance_km: distanceKm,
      })
      .eq("id", load.id)
      .eq("status", "open"); // guard: never edit a load that's already been accepted

    setSaving(false);
    if (updateError) return setError(updateError.message);
    onSaved();
  }

  return (
    <ModalShell title="Edit Load" onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div>
          <label className="field-label"><BoxIcon className="w-4 h-4 text-brand-orange" /> Commodity</label>
          <select required value={form.commodity_id} onChange={(e) => setForm((f) => ({ ...f, commodity_id: e.target.value }))} className="field-input">
            {commodities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="field-label"><ChartIcon className="w-4 h-4 text-brand-orange" /> Quantity</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="number" inputMode="decimal" required min="0" step="0.01" value={form.quantity_value} onChange={(e) => setForm((f) => ({ ...f, quantity_value: e.target.value }))} className="field-input flex-1" />
            <select required value={form.quantity_unit_id} onChange={(e) => setForm((f) => ({ ...f, quantity_unit_id: e.target.value }))} className="field-input sm:w-36 shrink-0">
              {quantityUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="field-label"><TruckIcon className="w-4 h-4 text-brand-orange" /> Truck Type <span className="text-red-500">*</span></label>
          <select required value={form.vehicle_type_id} onChange={(e) => setForm((f) => ({ ...f, vehicle_type_id: e.target.value }))} className="field-input">
            <option value="" disabled>Select truck type…</option>
            {vehicleTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <LocationAutocomplete
          label="Pickup Location"
          required
          value={form.pickup_location}
          onChangeText={(text) => setForm((f) => ({ ...f, pickup_location: text }))}
          onSelect={({ label, lat, lng, place_id }) => {
            setForm((f) => ({ ...f, pickup_location: label }));
            setPickupCoords({ lat, lng, place_id });
          }}
          coords={pickupCoords}
        />
        <LocationAutocomplete
          label="Drop-off Location"
          required
          value={form.dropoff_location}
          onChangeText={(text) => setForm((f) => ({ ...f, dropoff_location: text }))}
          onSelect={({ label, lat, lng, place_id }) => {
            setForm((f) => ({ ...f, dropoff_location: label }));
            setDropoffCoords({ lat, lng, place_id });
          }}
          coords={dropoffCoords}
        />

        <div>
          <label className="field-label"><WalletIcon className="w-4 h-4 text-brand-orange" /> Target Freight Rate (PKR, optional)</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input type="number" inputMode="decimal" value={form.offered_rate} onChange={(e) => setForm((f) => ({ ...f, offered_rate: e.target.value }))} className="field-input flex-1" />
            <select value={form.offered_rate_unit_id} onChange={(e) => setForm((f) => ({ ...f, offered_rate_unit_id: e.target.value }))} className="field-input sm:w-32 shrink-0">
              {quantityUnits.map((u) => <option key={u.id} value={u.id}>/ {u.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-orange flex-1 disabled:opacity-60">{saving ? "Saving…" : "Save Changes"}</button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm border border-slate-300 rounded-xl">Cancel</button>
        </div>
      </form>
    </ModalShell>
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
function ActiveShipments({ merchantId }) {
  const [loads, setLoads] = useState([]);
  const [biltyMap, setBiltyMap] = useState({});
  const [vehicleMap, setVehicleMap] = useState({});
  const [shipmentStage, setShipmentStage] = useState(1); // default view: loads with a driver assigned onward

  async function refresh() {
    const { data } = await supabase
      .from("loads")
      .select("*")
      .eq("merchant_id", merchantId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
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
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  // Live updates — a merchant watching this tab sees the step change the
  // instant the driver (or they themselves, from another tab) advances it.
  useEffect(() => {
    const loadsChannel = supabase
      .channel(`merchant-shipments-${merchantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "loads", filter: `merchant_id=eq.${merchantId}` }, () => refresh())
      .subscribe();
    const biltysChannel = supabase
      .channel(`merchant-biltys-${merchantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "biltys" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(loadsChannel);
      supabase.removeChannel(biltysChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  const counts = TRIP_STAGES.reduce((acc, tab) => {
    acc[tab.value] = loads.filter((l) => effectiveStage(l) === tab.value).length;
    return acc;
  }, {});
  const visibleLoads = loads.filter((l) => effectiveStage(l) === shipmentStage);

  return (
    <div>
      {/* Step tabs — identical 6 steps the driver sees */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {TRIP_STAGES.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setShipmentStage(tab.value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${
              shipmentStage === tab.value ? "bg-white shadow-card text-brand-navy" : "bg-slate-100 text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="icon-tile w-7 h-7 rounded-lg" style={{ "--tile-from": "#38bdf8", "--tile-to": "#0369a1" }}>
              <tab.icon className="w-3.5 h-3.5 text-white" />
            </span>
            {tab.label}
            <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${shipmentStage === tab.value ? "bg-brand-orangeSoft text-brand-orange" : "bg-slate-200 text-slate-500"}`}>
              {counts[tab.value] ?? 0}
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
        {visibleLoads.map((l) => (
          <ShipmentCard
            key={l.id}
            load={l}
            vehicle={l.assigned_vehicle_id ? vehicleMap[l.assigned_vehicle_id] : null}
            bilty={biltyMap[l.id]}
            merchantId={merchantId}
            onChanged={refresh}
          />
        ))}
      </div>
    </div>
  );
}

function ShipmentCard({ load, vehicle, bilty, merchantId, onChanged }) {
  const CommodityIcon = COMMODITY_ICON[load.commodity] ?? CottonIcon;
  const stage = effectiveStage(load);
  const meta = stageMeta(stage);
  const [showBilty, setShowBilty] = useState(false);

  return (
    <div className="card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl shrink-0">
            <CommodityIcon className="w-5 h-5" />
          </span>
          <div>
            <p className="font-semibold text-brand-navy">
              {load.commodity} — {load.quantity_value ?? load.quantity_munds} {load.quantity_unit ?? "Munds"}
            </p>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <RouteIcon className="w-3.5 h-3.5 shrink-0" /> {load.pickup_location} &rarr; {load.dropoff_location}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="badge-valid">
            Step {stage}/{MAX_STAGE} — {meta.label}
          </span>
          {vehicle && (
            <>
              <CallButton
                phone={vehicle.mobile_no}
                label=""
                className="w-9 h-9 flex items-center justify-center rounded-full text-green-600 bg-green-500/10"
              />
              <LoadChatButton loadId={load.id} currentUserId={merchantId} label="" counterpartLabel={`Chat with ${vehicle.driver_name || "Driver"}`} className="w-9 h-9 flex items-center justify-center rounded-full text-brand-orange bg-brand-orange/10" />
            </>
          )}
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

      {/* ---- Stage 2: Documentation — review weighment slip + fill/submit Bilty ---- */}
      {stage === 2 && (
        <div className="border-t border-slate-100 pt-4 space-y-3">
          {load.weighment_slip_url ? (
            <a href={load.weighment_slip_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-brand-orange">
              <EyeIcon className="w-4 h-4" /> View driver&apos;s weighment slip
            </a>
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Waiting for the driver to upload the weighment slip...
            </p>
          )}

          {load.weighment_slip_url && bilty && bilty.status !== "submitted" && (
            <BiltyForm load={load} bilty={bilty} vehicle={vehicle} onSubmitted={onChanged} />
          )}
          {bilty?.status === "submitted" && (
            <button onClick={() => setShowBilty(true)} className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-600">
              <DocumentCheckIcon className="w-4 h-4" /> View Submitted Bilty
            </button>
          )}
        </div>
      )}

      {/* ---- Stage 3: On the Way — live GPS tracking ---- */}
      {stage === 3 && vehicle && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-brand-navy mb-2 flex items-center gap-1.5">
            <RadarIcon className="w-3.5 h-3.5 text-blue-600" /> Live truck location
          </p>
          <LiveTrackingWidget load={load} vehicle={vehicle} />
        </div>
      )}

      {/* ---- Stage 4: Reached Destination — review arrival photo + approve ---- */}
      {stage === 4 && (
        <div className="border-t border-slate-100 pt-4 space-y-3">
          {load.delivery_proof_url && (
            <a href={load.delivery_proof_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-brand-orange">
              <EyeIcon className="w-4 h-4" /> View arrival photo
            </a>
          )}
          {!load.merchant_approved_at ? (
            <button
              onClick={async () => approveArrival({ load, driverId: vehicle?.driver_id }).then(onChanged)}
              className="btn-orange text-sm py-2"
            >
              <CheckCircleIcon className="w-4 h-4" /> Approve Delivery
            </button>
          ) : (
            <p className="text-xs text-green-700 flex items-center gap-1.5">
              <CheckCircleIcon className="w-3.5 h-3.5" /> Approved — waiting for the driver to close the trip.
            </p>
          )}
        </div>
      )}

      {/* ---- Stage 5: Rent Received — trip complete ---- */}
      {stage === 5 && bilty && (
        <div className="border-t border-slate-100 pt-4">
          <button onClick={() => setShowBilty(true)} className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-600">
            <DocumentCheckIcon className="w-4 h-4" /> View Bilty
          </button>
        </div>
      )}

      {showBilty && bilty && <BiltyModal bilty={bilty} load={load} onClose={() => setShowBilty(false)} />}
    </div>
  );
}

function LiveTrackingWidget({ load, vehicle }) {
  const [position, setPosition] = useState(
    vehicle.current_lat != null ? { lat: vehicle.current_lat, lng: vehicle.current_lng } : null
  );

  useEffect(() => {
    const channel = supabase
      .channel(`vehicle-track-${vehicle.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vehicles", filter: `id=eq.${vehicle.id}` }, ({ new: row }) => {
        if (row.current_lat != null) setPosition({ lat: row.current_lat, lng: row.current_lng });
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [vehicle.id]);

  return (
    <LiveVehicleMap
      vehiclePosition={position}
      destination={load.dropoff_lat != null ? { lat: load.dropoff_lat, lng: load.dropoff_lng } : null}
      driverName={vehicle.driver_name}
      vehicleNo={vehicle.vehicle_no}
    />
  );
}

function BiltyForm({ load, bilty, vehicle, onSubmitted }) {
  const [fields, setFields] = useState({
    vehicle_no: vehicle?.vehicle_no || "",
    driver_name: vehicle?.driver_name || "",
    commodity: load.commodity || "",
    quantity_text: `${load.quantity_value ?? load.quantity_munds ?? ""} ${load.quantity_unit ?? "Munds"}`,
    freight_rate: load.offered_rate ? String(load.offered_rate) : "",
    from_location: load.pickup_location || "",
    to_location: load.dropoff_location || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await submitBilty({ biltyId: bilty.id, fields, load, driverId: vehicle?.driver_id });
      await onSubmitted?.();
    } catch (err) {
      setError(err.message || "Could not submit the Bilty.");
    }
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 rounded-xl p-4 space-y-3">
      <p className="text-sm font-bold text-brand-navy flex items-center gap-1.5">
        <DocumentCheckIcon className="w-4 h-4 text-brand-orange" /> Fill in the Bilty
      </p>
      <div className="grid grid-cols-2 gap-3">
        <BiltyField label="Vehicle No" value={fields.vehicle_no} onChange={(v) => update("vehicle_no", v)} />
        <BiltyField label="Driver Name" value={fields.driver_name} onChange={(v) => update("driver_name", v)} />
        <BiltyField label="Commodity" value={fields.commodity} onChange={(v) => update("commodity", v)} />
        <BiltyField label="Quantity" value={fields.quantity_text} onChange={(v) => update("quantity_text", v)} />
        <BiltyField label="From" value={fields.from_location} onChange={(v) => update("from_location", v)} />
        <BiltyField label="To" value={fields.to_location} onChange={(v) => update("to_location", v)} />
        <BiltyField label="Freight Rate (PKR)" value={fields.freight_rate} onChange={(v) => update("freight_rate", v)} />
      </div>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button type="submit" disabled={saving} className="btn-orange text-sm py-2 w-full justify-center">
        {saving ? "Submitting..." : "Submit Bilty to Driver"}
      </button>
    </form>
  );
}

function BiltyField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input w-full mt-0.5 text-sm py-1.5"
        required
      />
    </label>
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
