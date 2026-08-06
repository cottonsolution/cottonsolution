"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowserClient";
import { useUser } from "@/lib/useUser";
import { BuildingIcon, MapPinIcon, IdCardIcon, UserIcon, PhoneIcon, CheckCircleIcon } from "@/components/Icons";

export default function MerchantOnboardingPage() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    company_name: "",
    business_city: "",
    ntn_number: "",
    warehouse_address: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || profile?.role !== "merchant") {
      router.push("/login");
      return;
    }
    if (profile.is_profile_completed) {
      router.push("/merchant/dashboard");
      return;
    }
    setForm({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      company_name: profile.company_name ?? "",
      business_city: profile.business_city ?? "",
      ntn_number: profile.ntn_number ?? "",
      warehouse_address: profile.warehouse_address ?? "",
    });
  }, [loading, user, profile, router]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.full_name.trim() || !form.phone.trim() || !form.company_name.trim() || !form.business_city.trim() || !form.warehouse_address.trim()) {
      return setError("Please fill in all required fields before continuing.");
    }
    setSubmitting(true);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ ...form, is_profile_completed: true })
      .eq("id", user.id);
    setSubmitting(false);
    if (updateError) return setError(updateError.message);
    router.push("/merchant/dashboard");
  }

  if (loading || !user || profile?.role !== "merchant" || profile.is_profile_completed) return null;

  return (
    <section className="min-h-screen bg-brand-slate py-10 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <div className="flex items-center gap-3 mb-6">
          <span className="icon-tile w-12 h-12" style={{ "--tile-from": "#a78bfa", "--tile-to": "#6d28d9" }}>
            <BuildingIcon className="w-6 h-6 text-white" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Confirm Your Business Details</h1>
            <p className="text-slate-500 text-sm">One quick step before you can start posting loads.</p>
          </div>
        </div>

        {error && <p className="mb-5 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

        <form onSubmit={handleSubmit} className="card space-y-5">
          <div>
            <label className="field-label">
              <UserIcon className="w-4 h-4 text-brand-orange" /> Owner / Representative Name
            </label>
            <input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">
              <PhoneIcon className="w-4 h-4 text-brand-orange" /> Mobile No
            </label>
            <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">
              <BuildingIcon className="w-4 h-4 text-brand-orange" /> Merchant / Company Name
            </label>
            <input value={form.company_name} onChange={(e) => update("company_name", e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">
              <MapPinIcon className="w-4 h-4 text-brand-orange" /> Business City / Location
            </label>
            <input value={form.business_city} onChange={(e) => update("business_city", e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">
              <IdCardIcon className="w-4 h-4 text-brand-orange" /> Business / NTN Number (optional)
            </label>
            <input value={form.ntn_number} onChange={(e) => update("ntn_number", e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">
              <BuildingIcon className="w-4 h-4 text-brand-orange" /> Address / Warehouse Location
            </label>
            <textarea rows={2} value={form.warehouse_address} onChange={(e) => update("warehouse_address", e.target.value)} className="field-input resize-y" />
          </div>

          <button type="submit" disabled={submitting} className="btn-orange w-full">
            {submitting ? "Saving..." : "Confirm and Continue"}
            {!submitting && <CheckCircleIcon className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </section>
  );
}
