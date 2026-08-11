import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getServiceIcon } from "@/lib/serviceIcons";
import HeroSlider from "@/components/HeroSlider";
import {
  TruckIcon,
  TruckCheckIcon,
  ShieldCheckIcon,
  ClockIcon,
  WalletIcon,
  StarIcon,
  ArrowRightIcon,
  PostLoadIllustration,
  DriverAcceptIllustration,
  DeliveryIllustration,
} from "@/components/Icons";

// Home page content (heading, services, steps, hero slides) is managed live
// from the Admin Dashboard. Without this, Next.js caches the page at build
// time and new/edited/deleted content (e.g. hero slides) never appears on
// the live site until a full rebuild — this forces a fresh fetch on every
// request so admin changes show up immediately.
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getHomeData() {
  try {
    const [{ data: content }, { data: services }, { data: steps }, { data: slides }] = await Promise.all([
      supabase.from("site_content").select("*").eq("id", 1).single(),
      supabase.from("services").select("*").order("sort_order"),
      supabase.from("how_it_works_steps").select("*").order("sort_order"),
      supabase.from("hero_slides").select("*").eq("section", "home").order("sort_order"),
    ]);
    return { content, services: services ?? [], steps: steps ?? [], slides: slides ?? [] };
  } catch (e) {
    // Supabase not configured yet (no .env.local) — homepage still renders fully below.
    return { content: null, services: [], steps: [], slides: [] };
  }
}

// Shown exactly as on the reference design whenever the Admin Dashboard
// hasn't published services/steps yet (or Supabase isn't connected), so the
// homepage never looks empty.
const FALLBACK_SERVICES = [
  {
    id: "fallback-1",
    title: "Automatic Load & Trucks Connection",
    description:
      "Instant, intelligent matching of available loads with the best verified trucks in your area. Reduce wait times and empty runs.",
  },
  {
    id: "fallback-2",
    title: "Kanda & Weight Lock",
    description: "Tamper-proof Kanda weight lock system ensures absolute honesty and rate transparency.",
  },
  {
    id: "fallback-3",
    title: "Digital Biltys",
    description: "Auto-generated, secure, and tamper-proof digital bilty generation on weight release.",
  },
];

const FALLBACK_STEPS = [
  {
    id: "fallback-1",
    step_number: 1,
    title: "Post Load",
    description: "Merchant details load, quantity, and route.",
  },
  {
    id: "fallback-2",
    step_number: 2,
    title: "Driver Accepted",
    description: "Driver confirms load and moves for loading.",
  },
  {
    id: "fallback-3",
    step_number: 3,
    title: "Transport & Completed",
    description: "Goods delivered, bilty generated, payment released.",
  },
];

const STEP_ILLUSTRATIONS = [PostLoadIllustration, DriverAcceptIllustration, DeliveryIllustration];
const STEP_BG = ["bg-sky-50", "bg-orange-50", "bg-emerald-50"];

const TRUST_POINTS = [
  { icon: ShieldCheckIcon, title: "Verified Drivers", desc: "CNIC, licence & permit checked" },
  { icon: ClockIcon, title: "Live Status Alerts", desc: "Expiry reminders before it's late" },
  { icon: WalletIcon, title: "Transparent Payments", desc: "No hidden broker charges" },
  { icon: StarIcon, title: "Trusted Network", desc: "Growing across Punjab & Sindh" },
];

export default async function HomePage() {
  const { content, services: dbServices, steps: dbSteps, slides } = await getHomeData();
  const services = dbServices.length ? dbServices : FALLBACK_SERVICES;
  const steps = dbSteps.length ? dbSteps : FALLBACK_STEPS;

  const heading = content?.heading ?? "Pakistan's Smartest Agricultural & Commercial Goods Transport Network";
  const subheading =
    content?.subheading ??
    "Connecting verified truck drivers with commodity loads for seamless, transparent transport across the nation.";

  return (
    <>
      {/* HERO — fixed min-height per breakpoint so background slides always
          crop to a predictable, consistent ratio (not driven by how long
          the admin's heading/subheading text happens to be) */}
      <section className="relative bg-brand-navy overflow-hidden min-h-[560px] sm:min-h-[620px] lg:min-h-[680px] flex items-center">
        <HeroSlider slides={slides} />
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center w-full">
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-6 text-white">{heading}</h1>
          <p className="text-slate-200 text-base sm:text-lg max-w-2xl mx-auto">{subheading}</p>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {TRUST_POINTS.map((t) => (
            <div key={t.title} className="flex items-center gap-3">
              <span className="icon-badge bg-brand-orangeSoft text-brand-orange rounded-xl w-12 h-12">
                <t.icon className="w-6 h-6" />
              </span>
              <div>
                <p className="font-semibold text-brand-navy text-sm leading-tight">{t.title}</p>
                <p className="text-xs text-slate-400 leading-tight">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* OUR SERVICES */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <span className="section-eyebrow">
            <ShieldCheckIcon className="w-3.5 h-3.5" /> Our Services
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy mb-3">Built for the Road</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Everything a merchant or driver needs to move agricultural commodities with confidence —
            explained in pictures, not paperwork.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s) => {
            const Icon = getServiceIcon(s.title);
            return (
              <div key={s.id} className="card hover:shadow-pop transition-shadow">
                <div className="icon-badge bg-brand-orange/10 text-brand-orange mb-4">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="font-semibold text-brand-navy mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500">{s.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-white border-t border-slate-100 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <span className="section-eyebrow">
              <ArrowRightIcon className="w-3.5 h-3.5" /> How It Works
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy">Three Simple Steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {steps.map((step, i) => {
              const Illustration = STEP_ILLUSTRATIONS[i % STEP_ILLUSTRATIONS.length];
              const bg = STEP_BG[i % STEP_BG.length];
              return (
                <div key={step.id} className="text-center relative">
                  <div className={`w-32 h-32 rounded-full mx-auto ${bg} mb-5 relative shadow-pop flex items-center justify-center`}>
                    <Illustration className="w-24 h-24" />
                    <span className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-brand-orange text-white text-sm font-bold flex items-center justify-center border-2 border-white shadow-sm">
                      {step.step_number}
                    </span>
                  </div>
                  <h3 className="font-semibold text-brand-navy mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 max-w-[220px] mx-auto">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="bg-brand-navy">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <TruckIcon className="w-10 h-10 text-brand-orange mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to move your goods?</h2>
          <p className="text-slate-300 max-w-xl mx-auto mb-8">
            Post your first load in minutes, or register your truck to start receiving offers today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/merchant/dashboard" className="btn-orange px-8 py-3.5">
              <TruckIcon className="w-5 h-5" /> Post a Load
            </Link>
            <Link href="/register" className="btn-outline-light px-8 py-3.5">
              <TruckCheckIcon className="w-5 h-5" /> Register as Driver
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
