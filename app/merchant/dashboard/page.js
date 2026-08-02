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
} from "@/components/Icons";

const COMMODITIES = ["Cotton", "Wheat", "Rapeseed", "Maize", "Rice", "Sugarcane", "Other"];
const COMMODITY_ICON = { Cotton: CottonIcon, Wheat: WheatIcon, Rapeseed: WheatIcon, Maize: WheatIcon, Rice: WheatIcon, Sugarcane: WheatIcon, Other: TruckIcon };
const TABS = [
  { label: "Post a Load", icon: PlusIcon },
  { label: "Active Shipments", icon: ChartIcon },
  { label: "Verify a Vehicle", icon: ShieldCheckIcon },
  { label: "My Profile", icon: BuildingIcon },
];

export default function MerchantDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [activeTab, setActiveTab] = useState(TABS[0].label);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "merchant")) {
      router.push("/login");
    }
  }, [loading, user, profile, router]);

  if (loading || !user || profile?.role !== "merchant") return null;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-1">
        <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl">
          <TruckIcon className="w-6 h-6" />
        </span>
        <h1 className="text-3xl font-bold text-brand-navy">Merchant Dashboard</h1>
      </div>
      <p className="text-slate-500 mb-8">Post loads, track shipments, and verify vehicles before dispatch.</p>

      <div className="flex gap-2 mb-8 border-b border-slate-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(tab.label)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === tab.label
                ? "border-brand-orange text-brand-navy"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "Post a Load" && <PostLoad merchantId={user.id} />}
      {activeTab === "Active Shipments" && <ActiveShipments merchantId={user.id} />}
      {activeTab === "Verify a Vehicle" && <VehicleSearch />}
      {activeTab === "My Profile" && <MerchantProfile userId={user.id} initialProfile={profile} />}
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
    setPickupCoords(null);
    setForm({ commodity: "Cotton", quantity_value: "", quantity_unit: "Munds", pickup_location: "", dropoff_location: "", offered_rate: "", vehicle_type_needed: "" });
  }

  const CommodityIcon = COMMODITY_ICON[form.commodity] ?? CottonIcon;

  return (
    <form onSubmit={handleSubmit} className="card max-w-xl space-y-5">
      {success && (
        <p className="text-green-700 text-sm flex items-center gap-2">
          <TruckIcon className="w-4 h-4 shrink-0" /> Load posted — visible to drivers now.
        </p>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}

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
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-orange disabled:opacity-50"
          >
            <CrosshairIcon className="w-3.5 h-3.5" />
            {locating ? "Locating…" : pickupCoords ? "Location pinned ✓" : "Pin pickup on the map (uses your current location)"}
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

function ActiveShipments({ merchantId }) {
  const [loads, setLoads] = useState([]);
  const [biltyMap, setBiltyMap] = useState({});

  useEffect(() => {
    supabase
      .from("loads")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        setLoads(data ?? []);
        const ids = (data ?? []).map((l) => l.id);
        if (ids.length) {
          const { data: biltys } = await supabase.from("biltys").select("*").in("load_id", ids);
          const map = {};
          (biltys ?? []).forEach((b) => (map[b.load_id] = b));
          setBiltyMap(map);
        }
      });
  }, [merchantId]);

  return (
    <div className="space-y-3">
      {loads.length === 0 && (
        <p className="text-slate-400 text-sm flex items-center gap-2">
          <ChartIcon className="w-4 h-4" /> No loads posted yet.
        </p>
      )}
      {loads.map((l) => {
        const CommodityIcon = COMMODITY_ICON[l.commodity] ?? CottonIcon;
        return (
          <div key={l.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl">
                <CommodityIcon className="w-5 h-5" />
              </span>
              <div>
                <p className="font-semibold text-brand-navy">
                  {l.commodity} — {l.quantity_value ?? l.quantity_munds} {l.quantity_unit ?? "Munds"}
                </p>
                <p className="text-sm text-slate-500 flex items-center gap-1.5">
                  <RouteIcon className="w-3.5 h-3.5" /> {l.pickup_location} &rarr; {l.dropoff_location}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="badge-valid capitalize">{l.status.replace("_", " ")}</span>
              {biltyMap[l.id] && (
                <span className="text-xs text-slate-500">Bilty: {biltyMap[l.id].bilty_no}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
