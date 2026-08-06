"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowserClient";
import { useUser } from "@/lib/useUser";
import { uploadDriverDocument } from "@/lib/uploadDocument";
import { scanCnicImage } from "@/lib/cnicOcr";
import { pickedFile } from "@/lib/imageInput";
import {
  TruckIcon,
  IdCardIcon,
  LicenseIcon,
  CalendarIcon,
  UploadIcon,
  ScanIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  BuildingIcon,
} from "@/components/Icons";

const STEPS = [
  { number: 1, label: "Personal Info", icon: IdCardIcon },
  { number: 2, label: "License", icon: LicenseIcon },
  { number: 3, label: "Truck Info", icon: TruckIcon },
];

const TRUCK_MODELS = ["Hino", "Isuzu", "JAC", "Mazda", "Nissan", "Foton", "Dongfeng", "Shehzore", "Toyota", "Other"];

const EMPTY_FORM = {
  // Step 1
  cnicNo: "",
  fullName: "",
  fatherName: "",
  dateOfBirth: "",
  cnicIssueDate: "",
  cnicExpiry: "",
  presentAddress: "",
  permanentAddress: "",
  sameAsPresent: false,
  // Step 2
  licenseHolderName: "",
  licenseNo: "",
  licenseExpiry: "",
  // Step 3
  vehicleTypeId: "",
  truckModel: TRUCK_MODELS[0],
  vehicleNo: "",
  mobileNo: "",
};

export default function DriverOnboardingWizard() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState({ cnicFront: null, cnicBack: null, license: null });
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState("");
  const [ocr, setOcr] = useState({ side: null, progress: 0, dateSuggestions: [] });

  useEffect(() => {
    if (loading) return;
    if (!user || profile?.role !== "driver") {
      router.push("/login");
      return;
    }
    if (profile.is_profile_completed) {
      router.push("/driver/dashboard");
    }
  }, [loading, user, profile, router]);

  useEffect(() => {
    supabase.from("vehicle_types").select("*").order("sort_order").then(({ data }) => {
      setVehicleTypes(data ?? []);
      if (data?.length) setForm((f) => ({ ...f, vehicleTypeId: f.vehicleTypeId || data[0].id }));
    });
  }, []);

  // Prefill what we already know from signup, so the driver isn't retyping.
  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        fullName: f.fullName || profile.full_name || "",
        licenseHolderName: f.licenseHolderName || profile.full_name || "",
        mobileNo: f.mobileNo || profile.phone || "",
      }));
    }
  }, [profile]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleScan(side) {
    const file = files[side];
    if (!file) return;
    setError("");
    setOcr({ side, progress: 0, dateSuggestions: [] });
    try {
      const result = await scanCnicImage(file, (pct) => setOcr((o) => ({ ...o, progress: pct })));
      setOcr({ side: null, progress: 0, dateSuggestions: result.possibleDates });
      if (result.cnicNumber) {
        update("cnicNo", result.cnicNumber);
      } else {
        setError("Couldn't confidently read the CNIC number from this image — please type it in manually below.");
      }
    } catch (err) {
      setOcr({ side: null, progress: 0, dateSuggestions: [] });
      setError("Scan failed. You can still fill the fields manually.");
    }
  }

  function validateStep1() {
    const required = ["cnicNo", "fullName", "fatherName", "dateOfBirth", "cnicIssueDate", "cnicExpiry", "presentAddress"];
    if (!form.sameAsPresent && !form.permanentAddress) required.push("permanentAddress");
    for (const key of required) {
      if (!String(form[key] || "").trim()) return "Please fill in all Step 1 fields before continuing.";
    }
    if (!/^\d{5}-\d{7}-\d{1}$/.test(form.cnicNo)) {
      return "CNIC Number must be in the format 00000-0000000-0.";
    }
    return "";
  }

  function validateStep2() {
    if (!form.licenseHolderName.trim() || !form.licenseNo.trim() || !form.licenseExpiry) {
      return "Please fill in all License fields before continuing.";
    }
    return "";
  }

  function validateStep3() {
    if (!form.vehicleTypeId || !form.truckModel || !form.vehicleNo.trim() || !form.mobileNo.trim()) {
      return "Please fill in all Truck Info fields before submitting.";
    }
    return "";
  }

  function handleNext() {
    const err = step === 1 ? validateStep1() : validateStep2();
    if (err) return setError(err);
    setError("");
    setStep((s) => s + 1);
  }

  function handleBack() {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit() {
    const err = validateStep3();
    if (err) return setError(err);
    setError("");
    setSubmitting(true);

    try {
      setSubmitStage("Uploading your documents...");
      const [cnicFrontUrl, cnicBackUrl, licenseUrl] = await Promise.all([
        uploadDriverDocument(files.cnicFront, user.id, "cnic-front"),
        uploadDriverDocument(files.cnicBack, user.id, "cnic-back"),
        uploadDriverDocument(files.license, user.id, "license"),
      ]);

      const selectedType = vehicleTypes.find((t) => t.id === form.vehicleTypeId);
      const permanentAddress = form.sameAsPresent ? form.presentAddress : form.permanentAddress;

      setSubmitStage("Saving your profile...");
      const { error: insertError } = await supabase.from("vehicles").insert({
        driver_id: user.id,
        vehicle_type_id: form.vehicleTypeId || null,
        vehicle_type: selectedType?.name ?? null,
        truck_model: form.truckModel,
        vehicle_no: form.vehicleNo.trim(),
        mobile_no: form.mobileNo.trim(),
        driver_name: form.fullName.trim(),
        father_name: form.fatherName.trim(),
        date_of_birth: form.dateOfBirth,
        cnic_no: form.cnicNo.trim(),
        cnic_issue_date: form.cnicIssueDate,
        cnic_expiry: form.cnicExpiry,
        cnic_front_image_url: cnicFrontUrl,
        cnic_back_image_url: cnicBackUrl,
        cnic_image_url: cnicFrontUrl, // kept for backward compatibility with older views/reports
        present_address: form.presentAddress.trim(),
        permanent_address: permanentAddress.trim(),
        license_holder_name: form.licenseHolderName.trim(),
        license_no: form.licenseNo.trim(),
        license_expiry: form.licenseExpiry,
        license_image_url: licenseUrl,
      });
      if (insertError) throw insertError;

      setSubmitStage("Finishing up...");
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_profile_completed: true })
        .eq("id", user.id);
      if (profileError) throw profileError;

      router.push("/driver/dashboard");
    } catch (err) {
      setError(err.message ?? "Something went wrong while submitting. Please try again.");
      setSubmitting(false);
      setSubmitStage("");
    }
  }

  if (loading || !user || profile?.role !== "driver" || profile.is_profile_completed) return null;

  return (
    <section className="min-h-screen bg-brand-slate py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="icon-tile w-12 h-12" style={{ "--tile-from": "#fb923c", "--tile-to": "#c2410c" }}>
            <TruckIcon className="w-6 h-6 text-white" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Complete Your Driver Profile</h1>
            <p className="text-slate-500 text-sm">Just a few steps before you can start accepting loads.</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                    step > s.number
                      ? "bg-green-500 text-white"
                      : step === s.number
                      ? "bg-brand-orange text-white"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {step > s.number ? <CheckCircleIcon className="w-5 h-5" /> : s.number}
                </span>
                <span className={`text-xs mt-1.5 font-medium ${step === s.number ? "text-brand-navy" : "text-slate-400"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span className={`flex-1 h-0.5 mx-2 mb-5 ${step > s.number ? "bg-green-500" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        {error && <p className="mb-5 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

        <div className="card space-y-5">
          {step === 1 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ScanBox
                  label="CNIC Front"
                  file={files.cnicFront}
                  onChange={(e) => setFiles((f) => ({ ...f, cnicFront: pickedFile(e) }))}
                  onScan={() => handleScan("cnicFront")}
                  scanning={ocr.side === "cnicFront"}
                  progress={ocr.progress}
                />
                <ScanBox
                  label="CNIC Back"
                  file={files.cnicBack}
                  onChange={(e) => setFiles((f) => ({ ...f, cnicBack: pickedFile(e) }))}
                  onScan={() => handleScan("cnicBack")}
                  scanning={ocr.side === "cnicBack"}
                  progress={ocr.progress}
                />
              </div>

              {ocr.dateSuggestions.length > 0 && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2.5 text-xs text-sky-800">
                  <p className="font-semibold mb-1.5">Dates found on the scanned image — tap to use:</p>
                  <div className="flex flex-wrap gap-2">
                    {ocr.dateSuggestions.map((d, i) => (
                      <div key={i} className="flex gap-1">
                        <button type="button" onClick={() => update("dateOfBirth", toIsoDate(d))} className="px-2 py-1 bg-white border border-sky-300 rounded hover:bg-sky-100">
                          {d} → DOB
                        </button>
                        <button type="button" onClick={() => update("cnicIssueDate", toIsoDate(d))} className="px-2 py-1 bg-white border border-sky-300 rounded hover:bg-sky-100">
                          → Issue
                        </button>
                        <button type="button" onClick={() => update("cnicExpiry", toIsoDate(d))} className="px-2 py-1 bg-white border border-sky-300 rounded hover:bg-sky-100">
                          → Expiry
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Field icon={IdCardIcon} label="CNIC Number" placeholder="00000-0000000-0" value={form.cnicNo} onChange={(v) => update("cnicNo", v)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field icon={UserIcon} label="Full Name (As per CNIC)" value={form.fullName} onChange={(v) => update("fullName", v)} />
                <Field icon={UserIcon} label="Father Name" value={form.fatherName} onChange={(v) => update("fatherName", v)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field icon={CalendarIcon} type="date" label="Date of Birth" value={form.dateOfBirth} onChange={(v) => update("dateOfBirth", v)} />
                <Field icon={CalendarIcon} type="date" label="CNIC Issue Date" value={form.cnicIssueDate} onChange={(v) => update("cnicIssueDate", v)} />
                <Field icon={CalendarIcon} type="date" label="CNIC Expiry Date" value={form.cnicExpiry} onChange={(v) => update("cnicExpiry", v)} />
              </div>
              <TextArea label="Present Address" value={form.presentAddress} onChange={(v) => update("presentAddress", v)} />
              <div>
                <label className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <input type="checkbox" checked={form.sameAsPresent} onChange={(e) => update("sameAsPresent", e.target.checked)} />
                  Permanent address is the same as present address
                </label>
                {!form.sameAsPresent && (
                  <TextArea label="Permanent Address" value={form.permanentAddress} onChange={(v) => update("permanentAddress", v)} />
                )}
              </div>

              <button onClick={handleNext} className="btn-orange w-full">
                Save and Next <ArrowRightIcon className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <ScanBox
                label="Driving License Photo (optional)"
                file={files.license}
                onChange={(e) => setFiles((f) => ({ ...f, license: pickedFile(e) }))}
                wide
              />
              <Field icon={UserIcon} label="Name (On License)" value={form.licenseHolderName} onChange={(v) => update("licenseHolderName", v)} />
              <Field icon={LicenseIcon} label="Driving License No" value={form.licenseNo} onChange={(v) => update("licenseNo", v)} />
              <Field icon={CalendarIcon} type="date" label="License Expiry Date" value={form.licenseExpiry} onChange={(v) => update("licenseExpiry", v)} />

              <div className="flex gap-3">
                <button onClick={handleBack} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold flex items-center gap-2">
                  <ArrowLeftIcon className="w-4 h-4" /> Back
                </button>
                <button onClick={handleNext} className="btn-orange flex-1">
                  Save and Next <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="field-label">
                  <TruckIcon className="w-4 h-4 text-brand-orange" /> Vehicle Type
                </label>
                <select value={form.vehicleTypeId} onChange={(e) => update("vehicleTypeId", e.target.value)} className="field-input">
                  {vehicleTypes.length === 0 && <option value="">No vehicle types configured yet</option>}
                  {vehicleTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">
                  <BuildingIcon className="w-4 h-4 text-brand-orange" /> Truck Model
                </label>
                <select value={form.truckModel} onChange={(e) => update("truckModel", e.target.value)} className="field-input">
                  {TRUCK_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <Field icon={TruckIcon} label="Truck Registration Number" placeholder="e.g. ABC-123" value={form.vehicleNo} onChange={(v) => update("vehicleNo", v)} />
              <Field icon={PhoneIcon} label="Mobile No" value={form.mobileNo} onChange={(v) => update("mobileNo", v)} />

              <div className="flex gap-3">
                <button onClick={handleBack} className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold flex items-center gap-2" disabled={submitting}>
                  <ArrowLeftIcon className="w-4 h-4" /> Back
                </button>
                <button onClick={handleSubmit} disabled={submitting} className="btn-orange flex-1">
                  {submitting ? submitStage || "Submitting..." : "Save and Submit"}
                  {!submitting && <CheckCircleIcon className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function toIsoDate(ddmmyyyy) {
  const [dd, mm, yyyy] = ddmmyyyy.split("-");
  if (!dd || !mm || !yyyy) return "";
  return `${yyyy}-${mm}-${dd}`;
}

function Field({ icon: Icon, label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="field-label">
        {Icon && <Icon className="w-4 h-4 text-brand-orange" />} {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-input"
      />
    </div>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className="field-input resize-y" />
    </div>
  );
}

function ScanBox({ label, file, onChange, onScan, scanning, progress, wide }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="field-label">
        <UploadIcon className="w-4 h-4 text-brand-orange" /> {label}
      </label>
      <label className="flex items-center gap-3 border border-dashed border-slate-300 rounded-xl px-3 py-3 cursor-pointer hover:border-brand-orange transition-colors mb-2">
        <span className="icon-badge bg-brand-orangeSoft text-brand-orange w-9 h-9 rounded-lg shrink-0">
          <UploadIcon className="w-4 h-4" />
        </span>
        <span className="text-sm text-slate-500 truncate">{file ? file.name : "Tap to choose a photo"}</span>
        <input type="file" accept="image/*" className="hidden" onChange={onChange} />
      </label>
      {onScan && (
        <button
          type="button"
          onClick={onScan}
          disabled={!file || scanning}
          className="w-full text-xs font-semibold text-brand-orange border border-brand-orange/40 rounded-lg py-2 flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          <ScanIcon className="w-3.5 h-3.5" />
          {scanning ? `Scanning... ${progress}%` : "Scan with AI (auto-fill CNIC No.)"}
        </button>
      )}
    </div>
  );
}
