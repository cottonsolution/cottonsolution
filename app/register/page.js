"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import {
  TruckIcon,
  PhoneIcon,
  UserIcon,
  IdCardIcon,
  LicenseIcon,
  PermitIcon,
  CalendarIcon,
} from "@/components/Icons";

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
        <span className="icon-badge bg-brand-orange/10 text-brand-orange mx-auto mb-4">
          <TruckIcon className="w-7 h-7" />
        </span>
        <p className="text-slate-600 mb-4">Please log in as a driver before registering a vehicle.</p>
        <button className="btn-orange mx-auto" onClick={() => router.push("/login")}>
          Go to Login
        </button>
      </section>
    );
  }

  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <span className="section-eyebrow">
        <TruckIcon className="w-3.5 h-3.5" /> For Drivers
      </span>
      <h1 className="text-3xl font-bold text-brand-navy mb-2">Driver &amp; Vehicle Registration</h1>
      <p className="text-slate-500 mb-8">
        Complete all fields, including document expiry dates, so your vehicle appears correctly in
        the Vehicle Verification portal and receives automated expiry alerts.
      </p>

      {success && (
        <p className="mb-6 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <TruckIcon className="w-4 h-4 shrink-0" />
          Registration submitted successfully. Your vehicle is now searchable in Vehicle Verification.
        </p>
      )}
      {error && <p className="mb-6 text-red-600 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field icon={TruckIcon} label="Vehicle No" value={form.vehicleNo} onChange={(v) => update("vehicleNo", v)} required />
          <Field icon={PhoneIcon} label="Mobile No" value={form.mobileNo} onChange={(v) => update("mobileNo", v)} required />
          <Field icon={UserIcon} label="Driver Name" value={form.driverName} onChange={(v) => update("driverName", v)} required />
        </div>

        <div className="border-t border-slate-100 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field icon={IdCardIcon} label="Driver CNIC No" value={form.cnicNo} onChange={(v) => update("cnicNo", v)} required />
          <Field
            icon={CalendarIcon}
            label="CNIC Expiry Date"
            type="date"
            value={form.cnicExpiry}
            onChange={(v) => update("cnicExpiry", v)}
            required
          />

          <Field icon={LicenseIcon} label="Driving Licence No" value={form.licenseNo} onChange={(v) => update("licenseNo", v)} required />
          <Field
            icon={CalendarIcon}
            label="Licence Expiry Date"
            type="date"
            value={form.licenseExpiry}
            onChange={(v) => update("licenseExpiry", v)}
            required
          />

          <Field icon={PermitIcon} label="Route Permit No" value={form.permitNo} onChange={(v) => update("permitNo", v)} required />
          <Field
            icon={CalendarIcon}
            label="Route Permit Expiry Date"
            type="date"
            value={form.permitExpiry}
            onChange={(v) => update("permitExpiry", v)}
            required
          />
        </div>

        <button type="submit" className="btn-orange w-full" disabled={submitting}>
          <TruckIcon className="w-4 h-4" />
          {submitting ? "Submitting..." : "Submit Registration"}
        </button>
      </form>
    </section>
  );
}

function Field({ icon: Icon, label, value, onChange, type = "text", required }) {
  return (
    <div>
      <label className="field-label">
        {Icon && <Icon className="w-4 h-4 text-brand-orange" />} {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
    </div>
  );
}
