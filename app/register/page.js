"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import { uploadDriverDocument } from "@/lib/uploadDocument";
import {
  TruckIcon,
  PhoneIcon,
  UserIcon,
  IdCardIcon,
  LicenseIcon,
  PermitIcon,
  CalendarIcon,
  UploadIcon,
} from "@/components/Icons";

const EMPTY_FORM = {
  vehicleTypeId: "",
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
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState({ cnic: null, license: null, permit: null });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStage, setUploadStage] = useState("");

  useEffect(() => {
    supabase
      .from("vehicle_types")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        setVehicleTypes(data ?? []);
        if (data?.length) setForm((f) => ({ ...f, vehicleTypeId: f.vehicleTypeId || data[0].id }));
      });
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateFile(field, fileList) {
    setFiles((f) => ({ ...f, [field]: fileList?.[0] ?? null }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      setUploadStage("Uploading documents...");
      const [cnicUrl, licenseUrl, permitUrl] = await Promise.all([
        uploadDriverDocument(files.cnic, user.id, "cnic"),
        uploadDriverDocument(files.license, user.id, "license"),
        uploadDriverDocument(files.permit, user.id, "permit"),
      ]);

      const selectedType = vehicleTypes.find((t) => t.id === form.vehicleTypeId);

      setUploadStage("Saving registration...");
      const { error: insertError } = await supabase.from("vehicles").insert({
        driver_id: user?.id ?? null,
        vehicle_type_id: form.vehicleTypeId || null,
        vehicle_type: selectedType?.name ?? null,
        vehicle_no: form.vehicleNo.trim(),
        mobile_no: form.mobileNo.trim(),
        driver_name: form.driverName.trim(),
        cnic_no: form.cnicNo.trim(),
        cnic_expiry: form.cnicExpiry,
        cnic_image_url: cnicUrl,
        license_no: form.licenseNo.trim(),
        license_expiry: form.licenseExpiry,
        license_image_url: licenseUrl,
        permit_no: form.permitNo.trim(),
        permit_expiry: form.permitExpiry,
        permit_image_url: permitUrl,
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setForm((f) => ({ ...EMPTY_FORM, vehicleTypeId: f.vehicleTypeId }));
      setFiles({ cnic: null, license: null, permit: null });
    } catch (err) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setUploadStage("");
    }
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
        Complete all fields, including document expiry dates and photos, so your vehicle appears
        correctly in the Vehicle Verification portal and receives automated expiry alerts.
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
          <div>
            <label className="field-label">
              <TruckIcon className="w-4 h-4 text-brand-orange" /> Vehicle Type
            </label>
            <select
              required
              value={form.vehicleTypeId}
              onChange={(e) => update("vehicleTypeId", e.target.value)}
              className="field-input"
            >
              {vehicleTypes.length === 0 && <option value="">No vehicle types configured yet</option>}
              {vehicleTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
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
          <FileField label="CNIC Photo" file={files.cnic} onChange={(fl) => updateFile("cnic", fl)} />

          <Field icon={LicenseIcon} label="Driving Licence No" value={form.licenseNo} onChange={(v) => update("licenseNo", v)} required />
          <Field
            icon={CalendarIcon}
            label="Licence Expiry Date"
            type="date"
            value={form.licenseExpiry}
            onChange={(v) => update("licenseExpiry", v)}
            required
          />
          <FileField label="Licence Photo" file={files.license} onChange={(fl) => updateFile("license", fl)} />

          <Field icon={PermitIcon} label="Route Permit No" value={form.permitNo} onChange={(v) => update("permitNo", v)} required />
          <Field
            icon={CalendarIcon}
            label="Route Permit Expiry Date"
            type="date"
            value={form.permitExpiry}
            onChange={(v) => update("permitExpiry", v)}
            required
          />
          <FileField label="Route Permit Photo" file={files.permit} onChange={(fl) => updateFile("permit", fl)} />
        </div>

        <button type="submit" className="btn-orange w-full" disabled={submitting}>
          <TruckIcon className="w-4 h-4" />
          {submitting ? uploadStage || "Submitting..." : "Submit Registration"}
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

function FileField({ label, file, onChange }) {
  return (
    <div className="sm:col-span-2">
      <label className="field-label">
        <UploadIcon className="w-4 h-4 text-brand-orange" /> {label} (optional)
      </label>
      <label className="flex items-center gap-3 border border-dashed border-slate-300 rounded-xl px-3 py-3 cursor-pointer hover:border-brand-orange transition-colors">
        <span className="icon-badge bg-brand-orangeSoft text-brand-orange w-9 h-9 rounded-lg">
          <UploadIcon className="w-4 h-4" />
        </span>
        <span className="text-sm text-slate-500 truncate">
          {file ? file.name : "Tap to upload a photo of the document"}
        </span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files)} />
      </label>
    </div>
  );
}
