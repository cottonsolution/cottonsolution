"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";

const EMPTY_FORM = {
  vehicleNo: "",
  mobileNo: "",
  driverName: "",
  cnicNo: "",
  cnicExpiry: "",
  licenseNo: "",
  licenseExpiry: "",
  permitNo: "",
  permitExpiry: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const { user, profile, loading: userLoading } = useUser();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: insertError } = await supabase.from("vehicles").insert({
      driver_id: user?.id ?? null,
      vehicle_no: form.vehicleNo.trim(),
      mobile_no: form.mobileNo.trim(),
      driver_name: form.driverName.trim(),
      cnic_no: form.cnicNo.trim(),
      cnic_expiry: form.cnicExpiry,
      license_no: form.licenseNo.trim(),
      license_expiry: form.licenseExpiry,
      permit_no: form.permitNo.trim(),
      permit_expiry: form.permitExpiry,
    });

    setSubmitting(false);
    if (insertError) return setError(insertError.message);
    setSuccess(true);
    setForm(EMPTY_FORM);
  }

  if (userLoading) return null;

  if (!user) {
    return (
      <section className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-600 mb-4">Please log in as a driver before registering a vehicle.</p>
        <button className="btn-orange" onClick={() => router.push("/login")}>
          Go to Login
        </button>
      </section>
    );
  }

  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-brand-navy mb-2">Driver &amp; Vehicle Registration</h1>
      <p className="text-slate-500 mb-8">
        Complete all fields, including document expiry dates, so your vehicle appears correctly in
        the Vehicle Verification portal and receives automated expiry alerts.
      </p>

      {success && (
        <p className="mb-6 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
          Registration submitted successfully. Your vehicle is now searchable in Vehicle Verification.
        </p>
      )}
      {error && <p className="mb-6 text-red-600 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Vehicle No" value={form.vehicleNo} onChange={(v) => update("vehicleNo", v)} required />
          <Field label="Mobile No" value={form.mobileNo} onChange={(v) => update("mobileNo", v)} required />
          <Field label="Driver Name" value={form.driverName} onChange={(v) => update("driverName", v)} required />
        </div>

        <div className="border-t border-slate-100 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Driver CNIC No" value={form.cnicNo} onChange={(v) => update("cnicNo", v)} required />
          <Field
            label="CNIC Expiry Date"
            type="date"
            value={form.cnicExpiry}
            onChange={(v) => update("cnicExpiry", v)}
            required
          />

          <Field label="Driving Licence No" value={form.licenseNo} onChange={(v) => update("licenseNo", v)} required />
          <Field
            label="Licence Expiry Date"
            type="date"
            value={form.licenseExpiry}
            onChange={(v) => update("licenseExpiry", v)}
            required
          />

          <Field label="Route Permit No" value={form.permitNo} onChange={(v) => update("permitNo", v)} required />
          <Field
            label="Route Permit Expiry Date"
            type="date"
            value={form.permitExpiry}
            onChange={(v) => update("permitExpiry", v)}
            required
          />
        </div>

        <button type="submit" className="btn-orange w-full" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Registration"}
        </button>
      </form>
    </section>
  );
}

function Field({ label, value, onChange, type = "text", required }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange"
      />
    </div>
  );
}
