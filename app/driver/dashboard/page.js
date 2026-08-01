"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import DashboardLayout from "@/components/DashboardLayout";
import {
  TruckIcon,
  GridIcon,
  RouteIcon,
  ChartIcon,
  ShieldCheckIcon,
  WalletIcon,
  TruckCheckIcon,
} from "@/components/Icons";

const TABS = [
  { label: "Available Loads", icon: GridIcon },
  { label: "My Trips", icon: RouteIcon },
];

export default function DriverDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [activeTab, setActiveTab] = useState(TABS[0].label);
  const [myVehicle, setMyVehicle] = useState(null);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "driver")) {
      router.push("/login");
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    if (user) {
      supabase
        .from("vehicles")
        .select("*")
        .eq("driver_id", user.id)
        .maybeSingle()
        .then(({ data }) => setMyVehicle(data));
    }
  }, [user]);

  if (loading || !user || profile?.role !== "driver") return null;

  return (
    <DashboardLayout
      roleLabel="Driver"
      title="Driver Dashboard"
      subtitle="View open load offers, place bids, and manage your trips."
      titleIcon={TruckIcon}
      navItems={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {!myVehicle && (
        <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm mb-6 flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4 shrink-0" />
          You haven&apos;t registered a vehicle yet.{" "}
          <a href="/register" className="font-semibold underline">Register now</a> to start bidding on loads.
        </p>
      )}

      {activeTab === "Available Loads" && <AvailableLoads driverId={user.id} vehicle={myVehicle} />}
      {activeTab === "My Trips" && <MyTrips driverId={user.id} vehicle={myVehicle} />}
    </DashboardLayout>
  );
}

function AvailableLoads({ driverId, vehicle }) {
  const [loads, setLoads] = useState([]);
  const [bidAmounts, setBidAmounts] = useState({});
  const [message, setMessage] = useState("");

  async function refresh() {
    const { data } = await supabase.from("loads").select("*").eq("status", "open").order("created_at", { ascending: false });
    setLoads(data ?? []);
  }
  useEffect(() => { refresh(); }, []);

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
      await supabase.from("loads").update({ status: "assigned", assigned_vehicle_id: vehicle.id }).eq("id", load.id);
      setMessage(`Load accepted at PKR ${amount}. A digital bilty has been generated.`);
      refresh();
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
      {loads.map((l) => (
        <div key={l.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl">
              <TruckIcon className="w-5 h-5" />
            </span>
            <div>
              <p className="font-semibold text-brand-navy">{l.commodity} — {l.quantity_munds} munds</p>
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
      ))}
    </div>
  );
}

function MyTrips({ vehicle }) {
  const [loads, setLoads] = useState([]);

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

  async function advanceStatus(load) {
    const next = load.status === "assigned" ? "in_transit" : load.status === "in_transit" ? "delivered" : load.status;
    await supabase.from("loads").update({ status: next }).eq("id", load.id);
    refresh();
  }

  return (
    <div className="space-y-3">
      {(!vehicle || loads.length === 0) && (
        <p className="text-slate-400 text-sm flex items-center gap-2">
          <RouteIcon className="w-4 h-4" /> No active trips yet.
        </p>
      )}
      {loads.map((l) => (
        <div key={l.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl">
              <TruckIcon className="w-5 h-5" />
            </span>
            <div>
              <p className="font-semibold text-brand-navy">{l.commodity} — {l.quantity_munds} munds</p>
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <RouteIcon className="w-3.5 h-3.5" /> {l.pickup_location} &rarr; {l.dropoff_location}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge-valid capitalize">{l.status.replace("_", " ")}</span>
            {l.status !== "delivered" && (
              <button onClick={() => advanceStatus(l)} className="btn-orange px-4 py-2 text-sm">
                <TruckCheckIcon className="w-4 h-4" />
                {l.status === "assigned" ? "Start Trip" : "Mark Delivered"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
