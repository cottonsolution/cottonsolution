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
  RefreshIcon,
} from "@/components/Icons";
import NotificationBell from "@/components/NotificationBell";
import LoadChatButton from "@/components/chat/LoadChatButton";
import LoadAcceptedAlert from "@/components/merchant/LoadAcceptedAlert";
import LoadBidsPanel from "@/components/merchant/LoadBidsPanel";
import CallButton from "@/components/CallButton";
import BiltyModal from "@/components/BiltyModal";
import { subscribeToPush } from "@/lib/pushClient";
import { submitBilty, approveArrival, approveWeighmentSlip, requestResubmitSlip } from "@/lib/shipmentActions";
import { getRoadDistanceKm } from "@/lib/distance";
import { estimateFare } from "@/lib/fareEstimate";

const LiveVehicleMap = dynamic(() => import("@/components/merchant/LiveVehicleMap"), { ssr: false });

const MiniMapPreview = dynamic(() => import("@/components/MiniMapPreview"), { ssr: false });

const COMMODITY_ICON = { Cotton: CottonIcon, Wheat: WheatIcon, Rapeseed: WheatIcon, Maize: WheatIcon, Rice: WheatIcon, Sugarcane: WheatIcon, Other: TruckIcon };

// The merchant's full-screen grid menu — order, emoji, Urdu label, and live
// count keys exactly as agreed. `emoji` renders as the OS's native
// "semi-realistic 3D" emoji (Apple/Android/Windows all render these the same
// visual style), which is what the reference mockup used, so no custom icon
// assets needed.
const TABS = [
  { label: "Post a Load", urdu: "نیا لوڈ پوسٹ کریں", emoji: "📦", countKey: "post", tint: "bg-sky-100" },
  { label: "Active Shipments", urdu: "جاری شپمنٹس", emoji: "🚛", countKey: "active", tint: "bg-orange-50" },
  { label: "Bids & Offers", urdu: "بولیاں اور آفرز", emoji: "🤝", countKey: "bids", tint: "bg-orange-50" },
  { label: "Shipment History", urdu: "شپمنٹ ہسٹری", emoji: "📋", tint: "bg-sky-100" },
  { label: "Verify a Vehicle", urdu: "گاڑی کی تصدیق کریں", emoji: "🛡️", tint: "bg-sky-100" },
  { label: "Billing & Payments", urdu: "بلنگ اور ادائیگیاں", emoji: "💵", tint: "bg-orange-50" },
  { label: "Terms and Conditions", urdu: "شرائط و ضوابط", emoji: "📜", tint: "bg-orange-50" },
  { label: "Company Profile", urdu: "کمپنی پروفائل", emoji: "🏢", tint: "bg-sky-100" },
  { label: "Help & Support", urdu: "مدد اور سپورٹ", emoji: "🎧", tint: "bg-orange-50" },
];

// Rendered as the 10th box — first item of the grid's 4th row — instead of
// the old separate full-width Logout button.
const LOGOUT_BOX = { label: "Log out", urdu: "لاگ آؤٹ", emoji: "🚪", tint: "bg-orange-50", isLogout: true };

export default function MerchantDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [activeTab, setActiveTab] = useState(TABS[0].label);
  const [acceptedAlert, setAcceptedAlert] = useState(null); // { load, vehicle }
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [counts, setCounts] = useState({ post: 0, bids: 0, active: 0 });
  // Set by the notification bell: { loadId, nonce } — ActiveShipments watches
  // this and auto-selects that vehicle + opens its chat. `nonce` changes on
  // every click so re-tapping the same notification still re-triggers it.
  const [jumpTarget, setJumpTarget] = useState(null);

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

  // Live counts for the "Post a Load (17)" / "Bids & Offers (21)" /
  // "Active Shipments (36)" drawer badges — a load is counted under
  // "Post a Load" until it gets its first bid, then moves to "Bids &
  // Offers"; once accepted (directly or via a bid) it counts under
  // "Active Shipments" instead. This mirrors exactly where each load's card
  // shows up in the tabs below, it just also totals them for the badge.
  useEffect(() => {
    if (!user) return undefined;
    async function refreshCounts() {
      const { data: loadRows } = await supabase
        .from("loads")
        .select("id, status, trip_stage")
        .eq("merchant_id", user.id)
        .neq("status", "cancelled");
      const rows = loadRows ?? [];
      const openIds = rows.filter((l) => l.status === "open").map((l) => l.id);
      let bidLoadIds = new Set();
      if (openIds.length) {
        const { data: bidRows } = await supabase.from("bids").select("load_id").in("load_id", openIds).eq("status", "pending");
        bidLoadIds = new Set((bidRows ?? []).map((b) => b.load_id));
      }
      const post = openIds.filter((id) => !bidLoadIds.has(id)).length;
      const bids = bidLoadIds.size;
      const active = rows.filter((l) => {
        const stage = effectiveStage(l);
        return stage >= 1 && stage <= 4;
      }).length;
      setCounts({ post, bids, active });
    }
    refreshCounts();
    const channel = supabase
      .channel(`merchant-counts-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "loads", filter: `merchant_id=eq.${user.id}` }, refreshCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, refreshCounts)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleOpenLoadFromNotification(loadId) {
    setActiveTab("Active Shipments");
    setJumpTarget({ loadId, nonce: Date.now() });
    setDrawerOpen(false);
  }

  if (loading || !user || profile?.role !== "merchant") return null;

  return (
    <section className="app-scroll max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-12">
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
            <p className="text-slate-500 text-sm hidden sm:block truncate">Smart Goods Transport Company — Merchant Dashboard</p>
          </div>
        </div>

        <div className="shrink-0">
          <NotificationBell userId={user.id} onOpenLoad={handleOpenLoadFromNotification} />
        </div>
      </div>

      <MerchantGridMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        counts={counts}
        onSelect={(label) => {
          setActiveTab(label);
          setDrawerOpen(false);
        }}
        onLogout={handleLogout}
      />

      <div>
        {activeTab === "Post a Load" && <PostLoad merchantId={user.id} />}
        {activeTab === "Active Shipments" && <ActiveShipments merchantId={user.id} jumpTarget={jumpTarget} />}
        {activeTab === "Bids & Offers" && <BidsOffersList merchantId={user.id} />}
        {activeTab === "Shipment History" && <ShipmentHistory merchantId={user.id} />}
        {activeTab === "Verify a Vehicle" && <VehicleSearch />}
        {activeTab === "Billing & Payments" && <BillingPayments />}
        {activeTab === "Terms and Conditions" && <TermsConditions />}
        {activeTab === "Company Profile" && <MerchantProfile userId={user.id} initialProfile={profile} />}
        {activeTab === "Help & Support" && <HelpSupport />}
      </div>
    </section>
  );
}

/**
 * Full-screen grid navigation — replaces the old dark slide-in drawer.
 * Opens as a full-screen overlay from the hamburger button (same trigger,
 * same z-index layer), light blue/cream 3-column grid of tappable boxes
 * with a semi-realistic 3D emoji + English label + Urdu label each, matching
 * the agreed reference mockup. Logout is the 10th box (first item of row 4)
 * instead of a separate full-width button. Tapping any box closes the grid
 * and switches to that section — the header's hamburger button stays
 * visible on every section afterwards, so it doubles as the "back to menu"
 * control the same way it always reopened the old drawer.
 *
 * Stays mounted at all times (instead of unmounting when closed) purely so
 * it can fade + scale in/out smoothly like a native app sheet rather than
 * popping instantly on/off screen.
 */
function MerchantGridMenu({ open, onClose, activeTab, counts, onSelect, onLogout }) {
  const boxes = [...TABS, LOGOUT_BOX];

  return (
    <div
      className={`fixed inset-0 z-[70] app-scroll overflow-y-auto bg-gradient-to-b from-sky-50 via-white to-orange-50 transition-all duration-300 ease-out ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div className={`max-w-md mx-auto px-4 pt-6 pb-10 transition-all duration-300 ease-out ${open ? "translate-y-0 scale-100" : "translate-y-2 scale-[0.98]"}`}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm font-bold tracking-wide text-brand-navy">Merchant Menu</p>
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
            const count = box.countKey ? counts[box.countKey] : null;
            return (
              <button
                key={box.label}
                onClick={() => (box.isLogout ? onLogout() : onSelect(box.label))}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl px-2 py-4 text-center overflow-hidden border border-white/70 shadow-[0_3px_10px_rgba(15,30,60,0.10)] transition-all duration-150 ease-out touch-manipulation select-none active:-translate-y-1 active:scale-[1.02] active:shadow-[0_12px_26px_rgba(15,30,60,0.20)] ${box.tint} ${
                  isActive ? "ring-2 ring-brand-orange" : ""
                }`}
              >
                {/* Glossy top highlight — gives each box a soft glass/premium sheen */}
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/70 to-transparent" />

                {count != null && count > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                    {count}
                  </span>
                )}
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
  const [bidCounts, setBidCounts] = useState({}); // load_id -> pending bid count

  async function refresh() {
    const { data } = await supabase
      .from("loads")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("status", "open")
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    setLoading(false);

    // A load only lives here while it has zero bids — the moment a driver
    // bids on it, it should show up under "Bids & Offers" instead, not here.
    const loadIds = rows.map((l) => l.id);
    if (loadIds.length) {
      const { data: bidRows } = await supabase.from("bids").select("load_id, status").in("load_id", loadIds).eq("status", "pending");
      const counts = {};
      (bidRows ?? []).forEach((b) => {
        counts[b.load_id] = (counts[b.load_id] || 0) + 1;
      });
      setBidCounts(counts);
      setLoads(rows.filter((l) => !counts[l.id]));
    } else {
      setBidCounts({});
      setLoads(rows);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId, refreshKey]);

  // Realtime: any INSERT/UPDATE/DELETE on this merchant's loads re-syncs the
  // list, so a card vanishes the moment `status` flips away from "open"
  // (i.e. a driver accepted it), or the moment a bid arrives (moves to the
  // Bids & Offers tab instead).
  useEffect(() => {
    const channel = supabase
      .channel(`merchant-open-loads-${merchantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loads", filter: `merchant_id=eq.${merchantId}` },
        () => refresh()
      )
      .subscribe();
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
          <ChartIcon className="w-4 h-4" /> No posted loads waiting for offers right now. Once you post one above, it&apos;ll show up here until a driver bids or accepts it.
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
            </div>
          );
        })}
      </div>

      {viewLoad && <ViewLoadModal load={viewLoad} onClose={() => setViewLoad(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BIDS & OFFERS — every posted load that has at least one pending bid. Moves
// out to Active Shipments the instant a bid is accepted (status leaves
// "open"). Reuses the exact same LoadBidsPanel (accept/reject/call/chat)
// that already worked before — only where it's surfaced from has changed.
// ---------------------------------------------------------------------------
function BidsOffersList({ merchantId }) {
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidsLoad, setBidsLoad] = useState(null);
  const [bidCounts, setBidCounts] = useState({});

  async function refresh() {
    const { data } = await supabase
      .from("loads")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("status", "open")
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    setLoading(false);

    const loadIds = rows.map((l) => l.id);
    if (!loadIds.length) {
      setLoads([]);
      setBidCounts({});
      return;
    }
    const { data: bidRows } = await supabase.from("bids").select("load_id, status").in("load_id", loadIds).eq("status", "pending");
    const counts = {};
    (bidRows ?? []).forEach((b) => {
      counts[b.load_id] = (counts[b.load_id] || 0) + 1;
    });
    setBidCounts(counts);
    setLoads(rows.filter((l) => counts[l.id]));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  useEffect(() => {
    const loadsChannel = supabase
      .channel(`merchant-bids-tab-loads-${merchantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "loads", filter: `merchant_id=eq.${merchantId}` }, () => refresh())
      .subscribe();
    const bidsChannel = supabase
      .channel(`merchant-bids-tab-bids-${merchantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(loadsChannel);
      supabase.removeChannel(bidsChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  return (
    <div>
      <h3 className="font-semibold text-brand-navy mb-3">Bids & Offers</h3>
      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!loading && loads.length === 0 && (
        <p className="text-slate-400 text-sm flex items-center gap-2">
          <GavelIcon className="w-4 h-4" /> No offers yet. As soon as a driver bids on one of your posted loads, it&apos;ll show up here.
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

              <button
                onClick={() => setBidsLoad(l)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] text-xs font-bold rounded-lg bg-brand-orange text-white"
              >
                <GavelIcon className="w-3.5 h-3.5" /> View Bids ({bidCounts[l.id]})
              </button>
            </div>
          );
        })}
      </div>

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
// ---------------------------------------------------------------------------
// ACTIVE SHIPMENTS — a top dropdown lists every vehicle currently carrying
// one of this merchant's loads; selecting one shows that single shipment's
// full journey as a vertical, one-by-one timeline (Documentation -> On the
// Way -> Reached Destination -> Rent Received), each step's actions living
// right where "Load Accepted" it, exactly like before — only the container
// changed from step-tabs to a dropdown + timeline.
// ---------------------------------------------------------------------------
function ActiveShipments({ merchantId, jumpTarget }) {
  const [loads, setLoads] = useState([]);
  const [biltyMap, setBiltyMap] = useState({});
  const [vehicleMap, setVehicleMap] = useState({});
  const [selectedLoadId, setSelectedLoadId] = useState(null);
  const [openChatForLoadId, setOpenChatForLoadId] = useState(null);

  async function refresh() {
    const { data } = await supabase
      .from("loads")
      .select("*")
      .eq("merchant_id", merchantId)
      .in("status", ["assigned", "in_transit"])
      .order("created_at", { ascending: false });
    const loadRows = data ?? [];
    setLoads(loadRows);
    setSelectedLoadId((prev) => (prev && loadRows.some((l) => l.id === prev) ? prev : loadRows[0]?.id ?? null));

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

  // Notification bell deep-link: jump to this load's vehicle and open chat.
  useEffect(() => {
    if (jumpTarget?.loadId) {
      setSelectedLoadId(jumpTarget.loadId);
      setOpenChatForLoadId(jumpTarget.loadId);
    }
  }, [jumpTarget]);

  const selectedLoad = loads.find((l) => l.id === selectedLoadId) ?? null;

  return (
    <div>
      <div className="card mb-6">
        <label className="field-label">🚛 Select Vehicle</label>
        <select
          value={selectedLoadId ?? ""}
          onChange={(e) => setSelectedLoadId(e.target.value)}
          className="field-input"
          disabled={loads.length === 0}
        >
          {loads.length === 0 && <option value="">No active shipments</option>}
          {loads.map((l) => {
            const v = l.assigned_vehicle_id ? vehicleMap[l.assigned_vehicle_id] : null;
            return (
              <option key={l.id} value={l.id}>
                {v?.vehicle_no ?? "Vehicle assigning…"} — {l.commodity} ({l.pickup_location} → {l.dropoff_location})
              </option>
            );
          })}
        </select>
      </div>

      {loads.length === 0 && (
        <p className="text-slate-400 text-sm flex items-center gap-2">
          <ChartIcon className="w-4 h-4" /> No active shipments right now. Once a load is accepted, select its vehicle here to track it.
        </p>
      )}

      {selectedLoad && (
        <ShipmentTimeline
          load={selectedLoad}
          vehicle={selectedLoad.assigned_vehicle_id ? vehicleMap[selectedLoad.assigned_vehicle_id] : null}
          bilty={biltyMap[selectedLoad.id]}
          merchantId={merchantId}
          onChanged={refresh}
          autoOpenChat={openChatForLoadId === selectedLoad.id}
          onChatOpened={() => setOpenChatForLoadId(null)}
        />
      )}
    </div>
  );
}

function ShipmentTimeline({ load, vehicle, bilty, merchantId, onChanged, autoOpenChat, onChatOpened }) {
  const CommodityIcon = COMMODITY_ICON[load.commodity] ?? CottonIcon;
  const stage = effectiveStage(load);
  const [showBilty, setShowBilty] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (autoOpenChat) {
      setChatOpen(true);
      onChatOpened?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenChat]);

  const steps = TRIP_STAGES.filter((s) => s.value >= 1); // vehicle already assigned here, so start from "Load Accepted"

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
            Step {stage}/{MAX_STAGE} — {stageMeta(stage).label}
          </span>
          {vehicle && (
            <>
              <CallButton
                phone={vehicle.mobile_no}
                label=""
                className="w-9 h-9 flex items-center justify-center rounded-full text-green-600 bg-green-500/10"
              />
              <button
                onClick={() => setChatOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-brand-orange bg-brand-orange/10"
                aria-label="Chat"
              >
                <ChatIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

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

      {/* ---- Vertical, one-by-one process history: completed steps stay
          checked off above; the current step's full controls sit right
          below it; steps that haven't started yet stay greyed out below. ---- */}
      <div className="border-t border-slate-100 pt-4">
        {steps.map((s, i) => {
          const isDone = s.value < stage;
          const isCurrent = s.value === stage;
          const isLast = i === steps.length - 1;
          return (
            <div key={s.value} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isDone ? "bg-green-500 text-white" : isCurrent ? "bg-brand-orange text-white" : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {isDone ? "✓" : s.value}
                </span>
                {!isLast && <span className={`w-0.5 flex-1 my-0.5 ${isDone ? "bg-green-400" : "bg-slate-200"}`} style={{ minHeight: 20 }} />}
              </div>
              <div className={`flex-1 min-w-0 ${isLast ? "pb-1" : "pb-5"}`}>
                <p className={`text-sm font-semibold ${isDone ? "text-green-700" : isCurrent ? "text-brand-navy" : "text-slate-400"}`}>
                  {s.label} {isDone && <span className="text-xs font-normal text-green-600">— Completed</span>}
                </p>

                {isCurrent && (
                  <div className="mt-2 space-y-3">
                    {/* ---- Step 1: Load Accepted ---- */}
                    {s.value === 1 && (
                      <p className="text-xs text-slate-500">Driver has accepted this load and is preparing for documentation.</p>
                    )}

                    {/* ---- Step 2: Documentation — review weighment slip + fill/submit Bilty ---- */}
                    {s.value === 2 && (
                      <>
                        {!load.weighment_slip_url ? (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Waiting for the driver to upload the weighment slip...
                          </p>
                        ) : (
                          <>
                            <a href={load.weighment_slip_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-brand-orange">
                              <EyeIcon className="w-4 h-4" /> View driver&apos;s weighment slip
                            </a>

                            {(!load.weighment_slip_status || load.weighment_slip_status === "pending") && (
                              <SlipReviewActions load={load} vehicle={vehicle} onDone={onChanged} />
                            )}

                            {load.weighment_slip_status === "resubmit_requested" && (
                              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                You asked the driver to re-upload the slip
                                {load.weighment_slip_note ? <>: &ldquo;{load.weighment_slip_note}&rdquo;</> : "."} Waiting for the new photo...
                              </p>
                            )}
                          </>
                        )}

                        {load.weighment_slip_status === "approved" && bilty && bilty.status !== "submitted" && (
                          <BiltyForm load={load} bilty={bilty} vehicle={vehicle} onSubmitted={onChanged} />
                        )}
                        {bilty?.status === "submitted" && (
                          <button onClick={() => setShowBilty(true)} className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-600">
                            <DocumentCheckIcon className="w-4 h-4" /> View Submitted Bilty
                          </button>
                        )}
                      </>
                    )}

                    {/* ---- Step 3: On the Way — live GPS tracking ---- */}
                    {s.value === 3 && vehicle && (
                      <>
                        <p className="text-xs font-semibold text-brand-navy mb-2 flex items-center gap-1.5">
                          <RadarIcon className="w-3.5 h-3.5 text-blue-600" /> Live truck location
                        </p>
                        <LiveTrackingWidget load={load} vehicle={vehicle} />
                      </>
                    )}

                    {/* ---- Step 4: Reached Destination — review arrival photo + approve ---- */}
                    {s.value === 4 && (
                      <>
                        {load.delivery_proof_url && (
                          <a href={load.delivery_proof_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-brand-orange">
                            <EyeIcon className="w-4 h-4" /> View arrival photo
                          </a>
                        )}
                        {!load.merchant_approved_at ? (
                          <ApproveDeliveryButton load={load} vehicle={vehicle} onDone={onChanged} />
                        ) : (
                          <p className="text-xs text-green-700 flex items-center gap-1.5">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> Approved — waiting for the driver to close the trip.
                          </p>
                        )}
                      </>
                    )}

                    {/* ---- Step 5: Rent Received — trip complete (moves to Shipment History) ---- */}
                    {s.value === 5 && bilty && (
                      <button onClick={() => setShowBilty(true)} className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-2 font-semibold text-slate-600">
                        <DocumentCheckIcon className="w-4 h-4" /> View Bilty
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showBilty && bilty && <BiltyModal bilty={bilty} load={load} onClose={() => setShowBilty(false)} />}
      {chatOpen && (
        <ChatModal
          title={`Chat with ${vehicle?.driver_name || "Driver"}`}
          subtitle="Messages about this shipment"
          loadId={load.id}
          phone={vehicle?.mobile_no}
          currentUserId={merchantId}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SHIPMENT HISTORY — every completed ("delivered") load for this merchant,
// searchable by vehicle number, expandable into its full saved trip record
// (post -> documentation -> on the way -> reached -> rent received). No new
// data model — this simply surfaces the same loads/biltys rows that were
// already being written throughout the trip, once it's finished.
// ---------------------------------------------------------------------------
function ShipmentHistory({ merchantId }) {
  const [loads, setLoads] = useState([]);
  const [vehicleMap, setVehicleMap] = useState({});
  const [biltyMap, setBiltyMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  async function refresh() {
    const { data } = await supabase
      .from("loads")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("status", "delivered")
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    setLoads(rows);
    setLoading(false);

    const loadIds = rows.map((l) => l.id);
    if (loadIds.length) {
      const { data: biltys } = await supabase.from("biltys").select("*").in("load_id", loadIds);
      const bMap = {};
      (biltys ?? []).forEach((b) => (bMap[b.load_id] = b));
      setBiltyMap(bMap);
    }
    const vehicleIds = [...new Set(rows.map((l) => l.assigned_vehicle_id).filter(Boolean))];
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

  const filtered = loads.filter((l) => {
    if (!search.trim()) return true;
    const vehicle = l.assigned_vehicle_id ? vehicleMap[l.assigned_vehicle_id] : null;
    return (vehicle?.vehicle_no || "").toLowerCase().includes(search.trim().toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="card">
        <label className="field-label">
          <EyeIcon className="w-4 h-4 text-brand-orange" /> Search by Vehicle No
        </label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g. BMC 226"
          className="field-input"
        />
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-slate-400 text-sm flex items-center gap-2">
          <DocumentCheckIcon className="w-4 h-4" /> {loads.length === 0 ? "No completed shipments yet." : "No completed shipments match that vehicle number."}
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((l) => {
          const vehicle = l.assigned_vehicle_id ? vehicleMap[l.assigned_vehicle_id] : null;
          const bilty = biltyMap[l.id];
          const isOpen = expandedId === l.id;
          const CommodityIcon = COMMODITY_ICON[l.commodity] ?? CottonIcon;
          return (
            <div key={l.id} className="card space-y-3">
              <button onClick={() => setExpandedId(isOpen ? null : l.id)} className="w-full flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="icon-badge bg-green-500/10 text-green-600 w-11 h-11 rounded-xl shrink-0">
                    <CommodityIcon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-navy truncate">
                      {l.commodity} — {l.quantity_value ?? l.quantity_munds} {l.quantity_unit ?? "Munds"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {vehicle?.vehicle_no ?? "—"} · {l.pickup_location} &rarr; {l.dropoff_location}
                    </p>
                  </div>
                </div>
                <span className="badge-valid shrink-0">Completed</span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
                  <DetailRow icon={TruckIcon} label="Vehicle" value={vehicle ? `${vehicle.vehicle_no} — ${vehicle.driver_name}` : "—"} />
                  <DetailRow icon={PhoneIcon} label="Driver Mobile" value={vehicle?.mobile_no} />
                  <DetailRow icon={WalletIcon} label="Freight Rate" value={l.offered_rate ? `PKR ${l.offered_rate}` : "—"} />
                  <DetailRow icon={ClockIcon} label="Posted" value={new Date(l.created_at).toLocaleString()} />
                  {l.merchant_approved_at && (
                    <DetailRow icon={CheckCircleIcon} label="Delivery Approved" value={new Date(l.merchant_approved_at).toLocaleString()} />
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {l.weighment_slip_url && (
                      <a href={l.weighment_slip_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 text-slate-600">
                        <EyeIcon className="w-3.5 h-3.5" /> Weighment Slip
                      </a>
                    )}
                    {l.delivery_proof_url && (
                      <a href={l.delivery_proof_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 text-slate-600">
                        <EyeIcon className="w-3.5 h-3.5" /> Arrival Photo
                      </a>
                    )}
                    {bilty && (
                      <BiltyHistoryButton bilty={bilty} load={l} />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BiltyHistoryButton({ bilty, load }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <button onClick={() => setShow(true)} className="flex items-center gap-1.5 text-xs font-semibold border border-slate-300 rounded-lg px-3 py-2 text-slate-600">
        <DocumentCheckIcon className="w-3.5 h-3.5" /> View Bilty
      </button>
      {show && <BiltyModal bilty={bilty} load={load} onClose={() => setShow(false)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// BILLING & PAYMENTS — placeholder, bilingual notice (Urdu + English) that
// the service is currently free for merchants.
// ---------------------------------------------------------------------------
function BillingPayments() {
  return (
    <div className="card max-w-xl space-y-5 text-center py-10">
      <span className="icon-badge bg-green-500/10 text-green-600 w-14 h-14 rounded-2xl mx-auto">
        <WalletIcon className="w-7 h-7" />
      </span>
      <div>
        <p className="text-lg font-bold text-brand-navy" dir="rtl" lang="ur">
          یہ سروس فی الحال تمام مرچنٹس کے لیے مکمل طور پر مفت ہے۔
        </p>
        <p className="text-sm text-slate-500 mt-1" dir="rtl" lang="ur">
          کوئی فیس یا کمیشن نہیں لیا جاتا — جیسے ہی بلنگ شروع ہوگی، آپ کو پیشگی اطلاع دی جائے گی۔
        </p>
      </div>
      <div className="border-t border-slate-100 pt-5">
        <p className="text-base font-semibold text-brand-navy">
          This service is currently completely free for all merchants.
        </p>
        <p className="text-sm text-slate-500 mt-1">
          No fees or commission are charged at this time — you&apos;ll be notified in advance before any billing begins.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TERMS AND CONDITIONS — placeholder. Content will be managed from the
// Admin Panel in a future update.
// ---------------------------------------------------------------------------
function TermsConditions() {
  return (
    <div className="card max-w-xl text-center py-14 space-y-3">
      <span className="icon-badge bg-slate-100 text-slate-400 w-14 h-14 rounded-2xl mx-auto">
        <DocumentCheckIcon className="w-7 h-7" />
      </span>
      <p className="font-semibold text-brand-navy">Terms & Conditions</p>
      <p className="text-sm text-slate-400 max-w-sm mx-auto">
        This page is coming soon. Terms & Conditions will be set and published here from the Admin Panel.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HELP & SUPPORT — same contact details already managed in Admin > Contact
// and shown on the public Contact Us page, surfaced here for merchants too.
// ---------------------------------------------------------------------------
function HelpSupport() {
  const [contact, setContact] = useState(null);

  useEffect(() => {
    supabase.from("contact_info").select("*").eq("id", 1).maybeSingle().then(({ data }) => setContact(data));
  }, []);

  function whatsappLink(number) {
    const digits = (number || "").replace(/[^0-9]/g, "");
    return digits ? `https://wa.me/${digits}` : null;
  }

  const points = contact
    ? [
        { label: "Office Address", value: contact.address, icon: MapPinIcon },
        { label: "Phone", value: contact.phone, href: contact.phone ? `tel:${contact.phone.replace(/\s+/g, "")}` : null, icon: PhoneIcon },
        { label: "WhatsApp Support", value: contact.whatsapp_number, href: whatsappLink(contact.whatsapp_number), icon: PhoneIcon },
        { label: "Email", value: contact.email, href: contact.email ? `mailto:${contact.email}` : null, icon: ChatIcon },
      ].filter((p) => p.value)
    : [];

  return (
    <div className="space-y-4 max-w-xl">
      <div className="card">
        <h3 className="font-semibold text-brand-navy mb-1">Need help?</h3>
        <p className="text-sm text-slate-500">Reach our support team directly — same contact details as the website.</p>
      </div>
      {!contact && <p className="text-slate-400 text-sm">Loading…</p>}
      {points.map((p) => {
        const content = (
          <div className="card flex items-center gap-4">
            <span className="icon-badge bg-brand-orange/10 text-brand-orange w-12 h-12 rounded-xl shrink-0">
              <p.icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 uppercase tracking-wide">{p.label}</p>
              <p className="font-semibold text-brand-navy truncate">{p.value}</p>
            </div>
          </div>
        );
        return p.href ? (
          <a key={p.label} href={p.href} target={p.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
            {content}
          </a>
        ) : (
          <div key={p.label}>{content}</div>
        );
      })}
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

function SlipReviewActions({ load, vehicle, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showNoteBox, setShowNoteBox] = useState(false);
  const [note, setNote] = useState("");

  async function handleApprove() {
    setBusy(true);
    setError("");
    try {
      await approveWeighmentSlip({ load, driverId: vehicle?.driver_id });
      await onDone?.();
    } catch (err) {
      setError(err.message || "Could not approve the slip.");
    }
    setBusy(false);
  }

  async function handleRequestResubmit() {
    setBusy(true);
    setError("");
    try {
      await requestResubmitSlip({ load, driverId: vehicle?.driver_id, note: note.trim() });
      setShowNoteBox(false);
      setNote("");
      await onDone?.();
    } catch (err) {
      setError(err.message || "Could not send the resubmit request.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button onClick={handleApprove} disabled={busy} className="btn-orange text-sm py-2">
          <CheckCircleIcon className="w-4 h-4" /> {busy ? "Please wait..." : "Approve Slip"}
        </button>
        <button
          onClick={() => setShowNoteBox((v) => !v)}
          disabled={busy}
          className="flex items-center gap-1.5 text-sm border border-red-200 text-red-600 rounded-lg px-3 py-2 font-semibold"
        >
          <RefreshIcon className="w-4 h-4" /> Request Resubmit
        </button>
      </div>
      {showNoteBox && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason (e.g. photo is blurry) — optional"
            className="field-input flex-1"
          />
          <button onClick={handleRequestResubmit} disabled={busy} className="text-sm font-semibold text-red-600 border border-red-200 rounded-lg px-4 py-2 shrink-0">
            {busy ? "Sending..." : "Send"}
          </button>
        </div>
      )}
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}

function ApproveDeliveryButton({ load, vehicle, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleApprove() {
    setBusy(true);
    setError("");
    try {
      await approveArrival({ load, driverId: vehicle?.driver_id });
      await onDone?.();
    } catch (err) {
      setError(err.message || "Could not approve the delivery.");
    }
    setBusy(false);
  }

  return (
    <div>
      <button onClick={handleApprove} disabled={busy} className="btn-orange text-sm py-2">
        <CheckCircleIcon className="w-4 h-4" /> {busy ? "Please wait..." : "Approve Delivery"}
      </button>
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
    </div>
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
