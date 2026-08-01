"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import VehicleSearch from "@/components/VehicleSearch";

const COMMODITIES = ["Cotton", "Wheat", "Rapeseed"];
const TABS = ["Post a Load", "Active Shipments", "Verify a Vehicle"];

export default function MerchantDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [activeTab, setActiveTab] = useState(TABS[0]);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "merchant")) {
      router.push("/login");
    }
  }, [loading, user, profile, router]);

  if (loading || !user || profile?.role !== "merchant") return null;

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-brand-navy mb-1">Merchant Dashboard</h1>
      <p className="text-slate-500 mb-8">Post loads, track shipments, and verify vehicles before dispatch.</p>

      <div className="flex gap-2 mb-8 border-b border-slate-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-brand-orange text-brand-navy"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Post a Load" && <PostLoad merchantId={user.id} />}
      {activeTab === "Active Shipments" && <ActiveShipments merchantId={user.id} />}
      {activeTab === "Verify a Vehicle" && <VehicleSearch />}
    </section>
  );
}

function PostLoad({ merchantId }) {
  const [form, setForm] = useState({
    commodity: "Cotton",
    quantity_munds: "",
    pickup_location: "",
    dropoff_location: "",
    offered_rate: "",
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const { error: insertError } = await supabase.from("loads").insert({
      merchant_id: merchantId,
      commodity: form.commodity,
      quantity_munds: Number(form.quantity_munds),
      pickup_location: form.pickup_location,
      dropoff_location: form.dropoff_location,
      offered_rate: form.offered_rate ? Number(form.offered_rate) : null,
    });
    if (insertError) return setError(insertError.message);
    setSuccess(true);
    setForm({ commodity: "Cotton", quantity_munds: "", pickup_location: "", dropoff_location: "", offered_rate: "" });
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-xl space-y-5">
      {success && <p className="text-green-700 text-sm">Load posted — visible to drivers now.</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div>
        <label className="text-sm font-medium text-slate-700">Commodity</label>
        <select
          value={form.commodity}
          onChange={(e) => setForm((f) => ({ ...f, commodity: e.target.value }))}
          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
        >
          {COMMODITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Quantity (Munds)</label>
        <input
          type="number"
          required
          value={form.quantity_munds}
          onChange={(e) => setForm((f) => ({ ...f, quantity_munds: e.target.value }))}
          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Pickup Location</label>
          <input
            required
            value={form.pickup_location}
            onChange={(e) => setForm((f) => ({ ...f, pickup_location: e.target.value }))}
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Drop-off Location</label>
          <input
            required
            value={form.dropoff_location}
            onChange={(e) => setForm((f) => ({ ...f, dropoff_location: e.target.value }))}
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Offered Rate (PKR, optional)</label>
        <input
          type="number"
          value={form.offered_rate}
          onChange={(e) => setForm((f) => ({ ...f, offered_rate: e.target.value }))}
          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
        />
      </div>
      <button type="submit" className="btn-orange w-full">Post Load</button>
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
      {loads.length === 0 && <p className="text-slate-400 text-sm">No loads posted yet.</p>}
      {loads.map((l) => (
        <div key={l.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-brand-navy">
              {l.commodity} — {l.quantity_munds} munds
            </p>
            <p className="text-sm text-slate-500">{l.pickup_location} &rarr; {l.dropoff_location}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge-valid capitalize">{l.status.replace("_", " ")}</span>
            {biltyMap[l.id] && (
              <span className="text-xs text-slate-500">Bilty: {biltyMap[l.id].bilty_no}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
