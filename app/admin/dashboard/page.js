"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/lib/useUser";
import { uploadSiteMedia } from "@/lib/uploadDocument";
import {
  HomeIcon,
  GridIcon,
  RouteIcon,
  BellIcon,
  ShieldCheckIcon,
  TruckIcon,
  PlusIcon,
  TrashIcon,
  UploadIcon,
  MenuIcon,
  CloseIcon,
  LogoutIcon,
  ImageIcon,
  EyeIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  WhatsAppIcon,
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
  XIcon,
} from "@/components/Icons";

// Each tab gets its own gradient (via CSS vars) so the sidebar icon tiles
// read as distinct, "semi-realistic" colour-coded shortcuts rather than
// same-colour line icons — easier for non-reading users to tell apart.
const TABS = [
  { label: "Home Content", icon: HomeIcon, from: "#38bdf8", to: "#0369a1" },
  { label: "Our Services", icon: GridIcon, from: "#a78bfa", to: "#6d28d9" },
  { label: "How It Works", icon: RouteIcon, from: "#fb923c", to: "#c2410c" },
  { label: "Vehicle Types", icon: TruckIcon, from: "#4ade80", to: "#15803d" },
  { label: "Contact", icon: MailIcon, from: "#f472b6", to: "#be185d" },
  { label: "Expiry Alerts", icon: BellIcon, from: "#f87171", to: "#b91c1c" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, profile, loading } = useUser();
  const [activeTab, setActiveTab] = useState(TABS[0].label);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "admin")) {
      router.push("/login");
    }
  }, [loading, user, profile, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading || !user || profile?.role !== "admin") return null;

  const activeMeta = TABS.find((t) => t.label === activeTab);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <span className="icon-tile w-12 h-12" style={{ "--tile-from": "#fb923c", "--tile-to": "#c2410c" }}>
            <ShieldCheckIcon className="w-6 h-6 text-white" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy leading-tight">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm hidden sm:block">Manage website content and monitor compliance.</p>
          </div>
        </div>

        {/* mobile hamburger — opens the sidebar as a slide-in drawer */}
        <button
          className="lg:hidden w-10 h-10 rounded-xl bg-white shadow-card flex items-center justify-center text-brand-navy shrink-0"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex gap-6 items-start">
        {/* DESKTOP SIDEBAR — the single source of dashboard navigation */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white rounded-2xl shadow-card p-3 sticky top-24 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`admin-sidebar-link ${activeTab === tab.label ? "active" : ""}`}
            >
              <span className="icon-tile" style={{ "--tile-from": tab.from, "--tile-to": tab.to }}>
                <tab.icon className="w-5 h-5 text-white" />
              </span>
              {tab.label}
            </button>
          ))}
          <div className="border-t border-slate-100 mt-2 pt-2">
            <button onClick={handleLogout} className="admin-sidebar-link text-red-500 hover:bg-red-50 w-full">
              <span className="icon-tile" style={{ "--tile-from": "#94a3b8", "--tile-to": "#475569" }}>
                <LogoutIcon className="w-5 h-5 text-white" />
              </span>
              Logout
            </button>
          </div>
        </aside>

        {/* MOBILE DRAWER — slides in from the left with a dimmed overlay */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl p-4 flex flex-col gap-1 animate-[slideIn_0.25s_ease-out]">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-brand-navy">Menu</span>
                <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-400">
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>
              {TABS.map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => {
                    setActiveTab(tab.label);
                    setDrawerOpen(false);
                  }}
                  className={`admin-sidebar-link ${activeTab === tab.label ? "active" : ""}`}
                >
                  <span className="icon-tile" style={{ "--tile-from": tab.from, "--tile-to": tab.to }}>
                    <tab.icon className="w-5 h-5 text-white" />
                  </span>
                  {tab.label}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-2 pt-2">
                <button onClick={handleLogout} className="admin-sidebar-link text-red-500 w-full">
                  <span className="icon-tile" style={{ "--tile-from": "#94a3b8", "--tile-to": "#475569" }}>
                    <LogoutIcon className="w-5 h-5 text-white" />
                  </span>
                  Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* CONTENT */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-6 lg:hidden overflow-x-auto pb-1">
            <span className="icon-tile w-9 h-9" style={{ "--tile-from": activeMeta.from, "--tile-to": activeMeta.to }}>
              <activeMeta.icon className="w-4 h-4 text-white" />
            </span>
            <h2 className="font-bold text-brand-navy whitespace-nowrap">{activeTab}</h2>
          </div>

          {activeTab === "Home Content" && <HomeContentManager />}
          {activeTab === "Our Services" && <ServicesManager />}
          {activeTab === "How It Works" && <StepsManager />}
          {activeTab === "Vehicle Types" && <VehicleTypesManager />}
          {activeTab === "Contact" && <ContactManager />}
          {activeTab === "Expiry Alerts" && <ExpiryAlerts />}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// TAB 1: HOME PAGE CONTENT MANAGER — heading/subheading, logo, hero slides
// ---------------------------------------------------------------------------
function HomeContentManager() {
  const [form, setForm] = useState({ heading: "", subheading: "", logo_url: "" });
  const [saved, setSaved] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState("");

  async function refreshContent() {
    const { data } = await supabase.from("site_content").select("*").eq("id", 1).single();
    if (data) setForm({ heading: data.heading, subheading: data.subheading, logo_url: data.logo_url ?? "" });
  }
  useEffect(() => { refreshContent(); }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaved(false);
    setError("");
    await supabase.from("site_content").update({ heading: form.heading, subheading: form.subheading }).eq("id", 1);
    setSaved(true);
  }

  async function handleLogoUpload() {
    if (!logoFile) return;
    setLogoUploading(true);
    setError("");
    try {
      const url = await uploadSiteMedia(logoFile, "logo");
      await supabase.from("site_content").update({ logo_url: url }).eq("id", 1);
      setForm((f) => ({ ...f, logo_url: url }));
      setLogoFile(null);
    } catch (err) {
      setError(err.message ?? "Logo upload failed.");
    } finally {
      setLogoUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Heading / Sub-heading */}
      <form onSubmit={handleSave} className="card max-w-xl space-y-5">
        <h3 className="font-semibold text-brand-navy">Hero Text</h3>
        <div>
          <label className="field-label">Main Heading</label>
          <textarea
            rows={2}
            value={form.heading}
            onChange={(e) => setForm((f) => ({ ...f, heading: e.target.value }))}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">Sub-Heading</label>
          <textarea
            rows={3}
            value={form.subheading}
            onChange={(e) => setForm((f) => ({ ...f, subheading: e.target.value }))}
            className="field-input"
          />
        </div>
        <button type="submit" className="btn-orange">Save Changes</button>
        {saved && <p className="text-green-700 text-sm">Home page content updated.</p>}
      </form>

      {/* Logo upload */}
      <div className="card max-w-xl space-y-4">
        <h3 className="font-semibold text-brand-navy">Header Logo</h3>
        <p className="text-sm text-slate-500">
          Uploaded here, this logo replaces the default emblem in the site header automatically.
        </p>
        <div className="flex items-center gap-4">
          {form.logo_url ? (
            <img src={form.logo_url} alt="Current logo" className="w-16 h-16 rounded-full object-cover border border-slate-200" />
          ) : (
            <span className="icon-tile w-16 h-16" style={{ "--tile-from": "#94a3b8", "--tile-to": "#475569" }}>
              <ImageIcon className="w-7 h-7 text-white" />
            </span>
          )}
          <label className="flex-1 flex items-center gap-3 border border-dashed border-slate-300 rounded-xl px-3 py-3 cursor-pointer hover:border-brand-orange transition-colors">
            <span className="icon-badge bg-brand-orangeSoft text-brand-orange w-9 h-9 rounded-lg">
              <UploadIcon className="w-4 h-4" />
            </span>
            <span className="text-sm text-slate-500 truncate">{logoFile ? logoFile.name : "Choose a logo image"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
        {logoFile && (
          <button onClick={handleLogoUpload} disabled={logoUploading} className="btn-orange">
            {logoUploading ? "Uploading..." : "Upload Logo"}
          </button>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>

      <HeroSlidesManager />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero image/video slides manager (list + add + edit caption + delete)
// ---------------------------------------------------------------------------
function HeroSlidesManager() {
  const [slides, setSlides] = useState([]);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);

  async function refresh() {
    const { data } = await supabase.from("hero_slides").select("*").order("sort_order");
    setSlides(data ?? []);
  }
  useEffect(() => { refresh(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const mediaType = file.type.startsWith("video") ? "video" : "image";
      const url = await uploadSiteMedia(file, "slides");
      const { error: insertError } = await supabase.from("hero_slides").insert({
        media_url: url,
        media_type: mediaType,
        caption: caption.trim() || null,
        sort_order: slides.length + 1,
      });
      if (insertError) throw insertError;
      setFile(null);
      setCaption("");
      refresh();
    } catch (err) {
      setError(err.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCaptionSave(id, newCaption) {
    await supabase.from("hero_slides").update({ caption: newCaption }).eq("id", id);
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id) {
    await supabase.from("hero_slides").delete().eq("id", id);
    refresh();
  }

  return (
    <div className="card max-w-xl space-y-5">
      <div>
        <h3 className="font-semibold text-brand-navy">Hero Background Slides</h3>
        <p className="text-sm text-slate-500">
          Add photos or short videos to rotate behind the homepage heading — looks great on both mobile and desktop.
        </p>
      </div>

      <form onSubmit={handleAdd} className="space-y-3">
        <label className="flex items-center gap-3 border border-dashed border-slate-300 rounded-xl px-3 py-3 cursor-pointer hover:border-brand-orange transition-colors">
          <span className="icon-badge bg-brand-orangeSoft text-brand-orange w-9 h-9 rounded-lg">
            <UploadIcon className="w-4 h-4" />
          </span>
          <span className="text-sm text-slate-500 truncate">
            {file ? file.name : "Choose an image or video"}
          </span>
          <input type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption (optional)"
          className="field-input"
        />
        <button type="submit" disabled={!file || uploading} className="btn-orange w-full">
          <PlusIcon className="w-4 h-4" />
          {uploading ? "Uploading..." : "Add Slide"}
        </button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="space-y-3 pt-2 border-t border-slate-100">
        {slides.length === 0 && <p className="text-slate-400 text-sm">No slides yet — add one above.</p>}
        {slides.map((s) => (
          <SlideRow
            key={s.id}
            slide={s}
            isEditing={editingId === s.id}
            onEdit={() => setEditingId(s.id)}
            onCancel={() => setEditingId(null)}
            onSave={(c) => handleCaptionSave(s.id, c)}
            onDelete={() => handleDelete(s.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SlideRow({ slide, isEditing, onEdit, onCancel, onSave, onDelete }) {
  const [caption, setCaption] = useState(slide.caption ?? "");
  const [viewing, setViewing] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
        {slide.media_type === "video" ? (
          <video src={slide.media_url} className="w-full h-full object-cover" muted />
        ) : (
          <img src={slide.media_url} alt={slide.caption ?? "slide"} className="w-full h-full object-cover" />
        )}
      </div>
      <span className="icon-badge bg-slate-100 text-slate-500 w-7 h-7 rounded-md shrink-0">
        {slide.media_type === "video" ? <VideoIcon className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
      </span>
      {isEditing ? (
        <input value={caption} onChange={(e) => setCaption(e.target.value)} className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
      ) : (
        <p className="flex-1 text-sm text-slate-600 truncate">{slide.caption || "—"}</p>
      )}
      <div className="flex gap-1.5 shrink-0">
        {isEditing ? (
          <>
            <button onClick={() => onSave(caption)} className="btn-orange px-3 py-1.5 text-xs">Save</button>
            <button onClick={onCancel} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg">Cancel</button>
          </>
        ) : (
          <>
            <button onClick={() => setViewing(true)} className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg" aria-label="View slide">
              <EyeIcon className="w-3.5 h-3.5" />
            </button>
            <button onClick={onEdit} className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg">Edit</button>
            <button onClick={onDelete} className="px-2 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg">
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {viewing && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setViewing(false)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewing(false)}
              className="absolute -top-10 right-0 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-brand-navy"
              aria-label="Close preview"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
            <div className="rounded-2xl overflow-hidden bg-black">
              {slide.media_type === "video" ? (
                <video src={slide.media_url} className="w-full max-h-[80vh] object-contain" controls autoPlay />
              ) : (
                <img src={slide.media_url} alt={slide.caption ?? "slide"} className="w-full max-h-[80vh] object-contain" />
              )}
            </div>
            {slide.caption && <p className="text-white text-sm text-center mt-3">{slide.caption}</p>}
          </div>
        </div>
      )}
    </div>
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
// TAB 5: CONTACT INFO  (address, phone, WhatsApp, email + social links —
// feeds the Contact page and the site-wide footer)
// ---------------------------------------------------------------------------
const SOCIAL_FIELDS = [
  { key: "facebook_url", label: "Facebook", icon: FacebookIcon, placeholder: "https://facebook.com/yourpage" },
  { key: "instagram_url", label: "Instagram", icon: InstagramIcon, placeholder: "https://instagram.com/yourpage" },
  { key: "youtube_url", label: "YouTube", icon: YoutubeIcon, placeholder: "https://youtube.com/@yourchannel" },
  { key: "x_url", label: "X (Twitter)", icon: XIcon, placeholder: "https://x.com/yourhandle" },
];

function ContactManager() {
  const [form, setForm] = useState({
    address: "",
    phone: "",
    whatsapp_number: "",
    email: "",
    facebook_url: "",
    instagram_url: "",
    youtube_url: "",
    x_url: "",
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const { data, error: fetchError } = await supabase.from("contact_info").select("*").eq("id", 1).single();
    if (fetchError) setError(fetchError.message);
    if (data) {
      setForm({
        address: data.address ?? "",
        phone: data.phone ?? "",
        whatsapp_number: data.whatsapp_number ?? "",
        email: data.email ?? "",
        facebook_url: data.facebook_url ?? "",
        instagram_url: data.instagram_url ?? "",
        youtube_url: data.youtube_url ?? "",
        x_url: data.x_url ?? "",
      });
    }
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaved(false);
    setError("");
    const { error: saveError } = await supabase
      .from("contact_info")
      .update({
        address: form.address.trim(),
        phone: form.phone.trim(),
        whatsapp_number: form.whatsapp_number.trim(),
        email: form.email.trim(),
        facebook_url: form.facebook_url.trim() || null,
        instagram_url: form.instagram_url.trim() || null,
        youtube_url: form.youtube_url.trim() || null,
        x_url: form.x_url.trim() || null,
      })
      .eq("id", 1);
    if (saveError) return setError(saveError.message);
    setSaved(true);
  }

  if (loading) return <p className="text-slate-400 text-sm">Loading contact details…</p>;

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="card max-w-xl space-y-5">
        <div>
          <h3 className="font-semibold text-brand-navy">Contact Details</h3>
          <p className="text-sm text-slate-500">
            Shown on the Contact page and in the footer on every page of the site.
          </p>
        </div>

        <div>
          <label className="field-label flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 text-brand-orange" /> Address
          </label>
          <input
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="Multan, Punjab, Pakistan"
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label flex items-center gap-2">
            <PhoneIcon className="w-4 h-4 text-brand-orange" /> Phone
          </label>
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+92 300 0000000"
            className="field-input"
          />
        </div>

        <div>
          <label className="field-label flex items-center gap-2">
            <WhatsAppIcon className="w-4 h-4 text-green-500" /> WhatsApp Number
          </label>
          <input
            value={form.whatsapp_number}
            onChange={(e) => update("whatsapp_number", e.target.value)}
            placeholder="+92 300 0000000"
            className="field-input"
          />
          <p className="text-xs text-slate-400 mt-1">
            Used to build the "Chat on WhatsApp" link automatically — enter with country code, no spaces work best (e.g. 923000000000).
          </p>
        </div>

        <div>
          <label className="field-label flex items-center gap-2">
            <MailIcon className="w-4 h-4 text-brand-orange" /> Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="support@smartgoodstransport.pk"
            className="field-input"
          />
        </div>
      </div>

      <div className="card max-w-xl space-y-5">
        <div>
          <h3 className="font-semibold text-brand-navy">Social Media Links</h3>
          <p className="text-sm text-slate-500">
            Leave a field empty to hide that icon on the site. Full links only (starting with https://).
          </p>
        </div>
        {SOCIAL_FIELDS.map((s) => (
          <div key={s.key}>
            <label className="field-label flex items-center gap-2">
              <s.icon className="w-4 h-4 text-brand-orange" /> {s.label}
            </label>
            <input
              value={form[s.key]}
              onChange={(e) => update(s.key, e.target.value)}
              placeholder={s.placeholder}
              className="field-input"
            />
          </div>
        ))}
      </div>

      <div className="max-w-xl">
        <button type="submit" className="btn-orange">Save Changes</button>
        {saved && <p className="text-green-700 text-sm mt-2">Contact details updated.</p>}
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>
    </form>
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
