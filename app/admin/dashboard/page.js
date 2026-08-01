"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import { HomeIcon, GridIcon, RouteIcon, BellIcon, ShieldCheckIcon, TruckIcon, PlusIcon, TrashIcon } from "@/components/Icons";

const TABS = [
  { label: "Home Content", icon: HomeIcon },
  { label: "Our Services", icon: GridIcon },
  { label: "How It Works", icon: RouteIcon },
  { label: "Vehicle Types", icon: TruckIcon },
  { label: "Expiry Alerts", icon: BellIcon },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [activeTab, setActiveTab] = useState(TABS[0].label);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "admin")) {
      router.push("/login");
    }
  }, [loading, user, profile, router]);

  if (loading || !user || profile?.role !== "admin") return null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-1">
        <span className="icon-badge bg-brand-orange/10 text-brand-orange w-11 h-11 rounded-xl">
          <ShieldCheckIcon className="w-6 h-6" />
        </span>
        <h1 className="text-3xl font-bold text-brand-navy">Admin Dashboard</h1>
      </div>
      <p className="text-slate-500 mb-8">Manage website content and monitor document compliance.</p>

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

      {activeTab === "Home Content" && <HomeContentManager />}
      {activeTab === "Our Services" && <ServicesManager />}
      {activeTab === "How It Works" && <StepsManager />}
      {activeTab === "Vehicle Types" && <VehicleTypesManager />}
      {activeTab === "Expiry Alerts" && <ExpiryAlerts />}
    </section>
  );
}

// ---------------------------------------------------------------------------
// TAB 1: HOME PAGE CONTENT MANAGER
// ---------------------------------------------------------------------------
function HomeContentManager() {
  const [form, setForm] = useState({ heading: "", subheading: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => data && setForm({ heading: data.heading, subheading: data.subheading }));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaved(false);
    await supabase.from("site_content").update({ heading: form.heading, subheading: form.subheading }).eq("id", 1);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSave} className="card max-w-xl space-y-5">
      <div>
        <label className="text-sm font-medium text-slate-700">Main Heading</label>
        <input
          value={form.heading}
          onChange={(e) => setForm((f) => ({ ...f, heading: e.target.value }))}
          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Sub-Heading</label>
        <textarea
          rows={3}
          value={form.subheading}
          onChange={(e) => setForm((f) => ({ ...f, subheading: e.target.value }))}
          className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange"
        />
      </div>
      <button type="submit" className="btn-orange">Save Changes</button>
      {saved && <p className="text-green-700 text-sm">Home page content updated.</p>}
    </form>
  );
}

// ---------------------------------------------------------------------------
// TAB 2: OUR SERVICES CMS (CRUD)
// ---------------------------------------------------------------------------
function ServicesManager() {
  const [services, setServices] = useState([]);
  const [draft, setDraft] = useState({ title: "", description: "" });
  const [editingId, setEditingId] = useState(null);

  async function refresh() {
    const { data } = await supabase.from("services").select("*").order("sort_order");
    setServices(data ?? []);
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    await supabase.from("services").insert({
      title: draft.title,
      description: draft.description,
      sort_order: services.length + 1,
    });
    setDraft({ title: "", description: "" });
    refresh();
  }

  async function handleUpdate(id, updates) {
    await supabase.from("services").update(updates).eq("id", id);
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id) {
    await supabase.from("services").delete().eq("id", id);
    refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleAdd} className="card grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div className="sm:col-span-1">
          <label className="text-sm font-medium text-slate-700">Service Title</label>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <input
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
        </div>
        <button type="submit" className="btn-orange h-fit">Add Service</button>
      </form>

      <div className="space-y-3">
        {services.map((s) => (
          <ServiceRow
            key={s.id}
            service={s}
            isEditing={editingId === s.id}
            onEdit={() => setEditingId(s.id)}
            onCancel={() => setEditingId(null)}
            onSave={(updates) => handleUpdate(s.id, updates)}
            onDelete={() => handleDelete(s.id)}
          />
        ))}
        {services.length === 0 && <p className="text-slate-400 text-sm">No services yet.</p>}
      </div>
    </div>
  );
}

function ServiceRow({ service, isEditing, onEdit, onCancel, onSave, onDelete }) {
  const [title, setTitle] = useState(service.title);
  const [description, setDescription] = useState(service.description);

  if (isEditing) {
    return (
      <div className="card flex flex-col sm:flex-row gap-3 sm:items-center">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-2" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-2" />
        <div className="flex gap-2">
          <button onClick={() => onSave({ title, description })} className="btn-orange px-4 py-2 text-sm">Save</button>
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <p className="font-semibold text-brand-navy">{service.title}</p>
        <p className="text-sm text-slate-500">{service.description}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={onEdit} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg">Edit</button>
        <button onClick={onDelete} className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg">Delete</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 3: HOW IT WORKS CMS (CRUD)
// ---------------------------------------------------------------------------
function StepsManager() {
  const [steps, setSteps] = useState([]);
  const [draft, setDraft] = useState({ step_number: "", title: "", description: "" });
  const [editingId, setEditingId] = useState(null);

  async function refresh() {
    const { data } = await supabase.from("how_it_works_steps").select("*").order("sort_order");
    setSteps(data ?? []);
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!draft.title.trim() || !draft.step_number) return;
    await supabase.from("how_it_works_steps").insert({
      step_number: Number(draft.step_number),
      title: draft.title,
      description: draft.description,
      sort_order: steps.length + 1,
    });
    setDraft({ step_number: "", title: "", description: "" });
    refresh();
  }

  async function handleUpdate(id, updates) {
    await supabase.from("how_it_works_steps").update(updates).eq("id", id);
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id) {
    await supabase.from("how_it_works_steps").delete().eq("id", id);
    refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleAdd} className="card grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-sm font-medium text-slate-700">Step #</label>
          <input
            type="number"
            value={draft.step_number}
            onChange={(e) => setDraft((d) => ({ ...d, step_number: e.target.value }))}
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Title</label>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="text-sm font-medium text-slate-700">Description</label>
          <input
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>
        <button type="submit" className="btn-orange h-fit">Add Step</button>
      </form>

      <div className="space-y-3">
        {steps.map((s) => (
          <StepRow
            key={s.id}
            step={s}
            isEditing={editingId === s.id}
            onEdit={() => setEditingId(s.id)}
            onCancel={() => setEditingId(null)}
            onSave={(updates) => handleUpdate(s.id, updates)}
            onDelete={() => handleDelete(s.id)}
          />
        ))}
      </div>
    </div>
  );
}

function StepRow({ step, isEditing, onEdit, onCancel, onSave, onDelete }) {
  const [stepNumber, setStepNumber] = useState(step.step_number);
  const [title, setTitle] = useState(step.title);
  const [description, setDescription] = useState(step.description);

  if (isEditing) {
    return (
      <div className="card flex flex-col sm:flex-row gap-3 sm:items-center">
        <input type="number" value={stepNumber} onChange={(e) => setStepNumber(e.target.value)} className="w-20 border border-slate-300 rounded-lg px-3 py-2" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-2" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-2" />
        <div className="flex gap-2">
          <button onClick={() => onSave({ step_number: Number(stepNumber), title, description })} className="btn-orange px-4 py-2 text-sm">Save</button>
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-slate-300 rounded-lg">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <span className="w-9 h-9 rounded-full bg-brand-navy text-white flex items-center justify-center font-bold text-sm shrink-0">
          {step.step_number}
        </span>
        <div>
          <p className="font-semibold text-brand-navy">{step.title}</p>
          <p className="text-sm text-slate-500">{step.description}</p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={onEdit} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg">Edit</button>
        <button onClick={onDelete} className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg">Delete</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 4: VEHICLE TYPES CMS (CRUD) — feeds the registration form dropdown
// ---------------------------------------------------------------------------
function VehicleTypesManager() {
  const [types, setTypes] = useState([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  async function refresh() {
    const { data } = await supabase.from("vehicle_types").select("*").order("sort_order");
    setTypes(data ?? []);
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    if (!draft.trim()) return;
    const { error: insertError } = await supabase
      .from("vehicle_types")
      .insert({ name: draft.trim(), sort_order: types.length + 1 });
    if (insertError) return setError(insertError.message);
    setDraft("");
    refresh();
  }

  async function handleUpdate(id, name) {
    await supabase.from("vehicle_types").update({ name }).eq("id", id);
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id) {
    await supabase.from("vehicle_types").delete().eq("id", id);
    refresh();
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-500 -mt-2">
        These categories populate the <strong>Vehicle Type</strong> dropdown on the driver
        registration form automatically — add, rename, or remove them anytime.
      </p>

      <form onSubmit={handleAdd} className="card flex flex-col sm:flex-row gap-4 sm:items-end">
        <div className="flex-1">
          <label className="text-sm font-medium text-slate-700">New Vehicle Type</label>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. 14 Wheeler"
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
        </div>
        <button type="submit" className="btn-orange h-fit">
          <PlusIcon className="w-4 h-4" /> Add Type
        </button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {types.map((t) => (
          <VehicleTypeRow
            key={t.id}
            type={t}
            isEditing={editingId === t.id}
            onEdit={() => setEditingId(t.id)}
            onCancel={() => setEditingId(null)}
            onSave={(name) => handleUpdate(t.id, name)}
            onDelete={() => handleDelete(t.id)}
          />
        ))}
        {types.length === 0 && <p className="text-slate-400 text-sm">No vehicle types yet — add one above.</p>}
      </div>
    </div>
  );
}

function VehicleTypeRow({ type, isEditing, onEdit, onCancel, onSave, onDelete }) {
  const [name, setName] = useState(type.name);

  if (isEditing) {
    return (
      <div className="card flex items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <button onClick={() => onSave(name)} className="btn-orange px-3 py-2 text-sm">Save</button>
        <button onClick={onCancel} className="px-3 py-2 text-sm border border-slate-300 rounded-lg">Cancel</button>
      </div>
    );
  }

  return (
    <div className="card flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="icon-badge bg-brand-orange/10 text-brand-orange w-10 h-10 rounded-lg">
          <TruckIcon className="w-5 h-5" />
        </span>
        <p className="font-semibold text-brand-navy text-sm">{type.name}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={onEdit} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg">Edit</button>
        <button onClick={onDelete} className="px-2.5 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg">
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB 4: DOCUMENT EXPIRY ALERTS
// ---------------------------------------------------------------------------
function ExpiryAlerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    supabase
      .from("vehicle_verification_view")
      .select("*")
      .then(({ data }) => {
        const flagged = (data ?? []).filter(
          (v) => v.cnic_status !== "Valid" || v.license_status !== "Valid" || v.permit_status !== "Valid"
        );
        setAlerts(flagged);
      });
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 mb-4">
        Vehicles with a CNIC, licence, or route permit expiring within 30 days, or already expired.
      </p>
      {alerts.length === 0 && (
        <p className="text-slate-400 text-sm flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4" /> No documents are currently expiring or expired. All clear.
        </p>
      )}
      {alerts.map((v) => (
        <div key={v.vehicle_no} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-brand-navy">
              {v.vehicle_no} — {v.driver_name} {v.vehicle_type && <span className="text-slate-400 font-normal">({v.vehicle_type})</span>}
            </p>
            <p className="text-sm text-slate-500">Mobile: {v.mobile_no}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <DocBadge label="CNIC" status={v.cnic_status} date={v.cnic_expiry} />
            <DocBadge label="Licence" status={v.license_status} date={v.license_expiry} />
            <DocBadge label="Permit" status={v.permit_status} date={v.permit_expiry} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DocBadge({ label, status, date }) {
  const cls = status === "Expired" ? "badge-expired" : status === "Expiring Soon" ? "badge-expiring" : "badge-valid";
  return (
    <span className={cls}>
      {label}: {status} ({date})
    </span>
  );
}
