"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseBrowserClient";
import {
  SearchIcon,
  TruckIcon,
  PhoneIcon,
  IdCardIcon,
  LicenseIcon,
  PermitIcon,
  ShieldCheckIcon,
} from "./Icons";

function StatusBadge({ status }) {
  const cls =
    status === "Valid" ? "badge-valid" : status === "Expiring Soon" ? "badge-expiring" : "badge-expired";
  return <span className={cls}>{status}</span>;
}

const RESULT_FIELDS = [
  { key: "vehicle_no", label: "Vehicle No", icon: TruckIcon },
  { key: "vehicle_type", label: "Vehicle Type", icon: TruckIcon },
  { key: "mobile_no", label: "Mobile No", icon: PhoneIcon },
];

const DOC_FIELDS = [
  { numberKey: "cnic_no", expiryKey: "cnic_expiry", statusKey: "cnic_status", label: "Driver CNIC No", icon: IdCardIcon },
  { numberKey: "license_no", expiryKey: "license_expiry", statusKey: "license_status", label: "Driving Licence No", icon: LicenseIcon },
  { numberKey: "permit_no", expiryKey: "permit_expiry", statusKey: "permit_status", label: "Route Permit No", icon: PermitIcon },
];

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
        <div className="relative flex-1">
          <TruckIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={vehicleNo}
            onChange={(e) => setVehicleNo(e.target.value)}
            placeholder="Enter Vehicle No (e.g. LEA-4521)"
            className="field-input pl-11"
          />
        </div>
        <button type="submit" className="btn-orange px-8" disabled={loading}>
          <SearchIcon className="w-4 h-4" />
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-6">{error}</p>}

      {result && (
        <div className="card grid grid-cols-1 sm:grid-cols-2 gap-6">
          {RESULT_FIELDS.map((f) => (
            <div key={f.key}>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <f.icon className="w-3.5 h-3.5" /> {f.label}
              </p>
              <p className="font-semibold text-brand-navy">{result[f.key] || "—"}</p>
            </div>
          ))}

          {DOC_FIELDS.map((f) => (
            <div key={f.numberKey}>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <f.icon className="w-3.5 h-3.5" /> {f.label}
              </p>
              <p className="font-semibold text-brand-navy">{result[f.numberKey]}</p>
              <p className="text-xs text-slate-400 mt-1">
                Expiry: {result[f.expiryKey]} &nbsp; <StatusBadge status={result[f.statusKey]} />
              </p>
            </div>
          ))}

          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <ShieldCheckIcon className="w-3.5 h-3.5" /> Overall Status
            </p>
            <p className="font-semibold capitalize text-brand-navy">{result.status}</p>
          </div>
        </div>
      )}
    </div>
  );
}
