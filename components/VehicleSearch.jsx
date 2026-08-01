"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function StatusBadge({ status }) {
  const cls =
    status === "Valid" ? "badge-valid" : status === "Expiring Soon" ? "badge-expiring" : "badge-expired";
  return <span className={cls}>{status}</span>;
}

export default function VehicleSearch() {
  const [vehicleNo, setVehicleNo] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!vehicleNo.trim()) return;

    setLoading(true);
    const { data, error: qError } = await supabase
      .from("vehicle_verification_view")
      .select("*")
      .ilike("vehicle_no", vehicleNo.trim())
      .maybeSingle();
    setLoading(false);

    if (qError) {
      setError("Something went wrong while searching. Please try again.");
      return;
    }
    if (!data) {
      setError(`No record found for vehicle "${vehicleNo}". Check the number and try again.`);
      return;
    }
    setResult(data);
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          value={vehicleNo}
          onChange={(e) => setVehicleNo(e.target.value)}
          placeholder="Enter Vehicle No (e.g. LEA-4521)"
          className="flex-1 border border-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-orange"
        />
        <button type="submit" className="btn-orange px-8" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-6">{error}</p>}

      {result && (
        <div className="card grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Vehicle No</p>
            <p className="font-semibold text-brand-navy">{result.vehicle_no}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Mobile No</p>
            <p className="font-semibold text-brand-navy">{result.mobile_no}</p>
          </div>

          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Driver CNIC No</p>
            <p className="font-semibold text-brand-navy">{result.cnic_no}</p>
            <p className="text-xs text-slate-400 mt-1">
              Expiry: {result.cnic_expiry} &nbsp; <StatusBadge status={result.cnic_status} />
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Driving Licence No</p>
            <p className="font-semibold text-brand-navy">{result.license_no}</p>
            <p className="text-xs text-slate-400 mt-1">
              Expiry: {result.license_expiry} &nbsp; <StatusBadge status={result.license_status} />
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Route Permit No</p>
            <p className="font-semibold text-brand-navy">{result.permit_no}</p>
            <p className="text-xs text-slate-400 mt-1">
              Expiry: {result.permit_expiry} &nbsp; <StatusBadge status={result.permit_status} />
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Overall Status</p>
            <p className="font-semibold capitalize text-brand-navy">{result.status}</p>
          </div>
        </div>
      )}
    </div>
  );
}
