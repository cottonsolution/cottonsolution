import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getServiceIcon } from "@/lib/serviceIcons";
import {
  TruckIcon,
  TruckCheckIcon,
  ComputerUserIcon,
  PhoneCheckIcon,
  ShieldCheckIcon,
  ClockIcon,
  WalletIcon,
  StarIcon,
  ArrowRightIcon,
} from "@/components/Icons";

async function getHomeData() {
  const [{ data: content }, { data: services }, { data: steps }] = await Promise.all([
    supabase.from("site_content").select("*").eq("id", 1).single(),
    supabase.from("services").select("*").order("sort_order"),
    supabase.from("how_it_works_steps").select("*").order("sort_order"),
  ]);
  return { content, services: services ?? [], steps: steps ?? [] };
}

const STEP_ICONS = [ComputerUserIcon, PhoneCheckIcon, TruckCheckIcon];

const TRUST_POINTS = [
  { icon: ShieldCheckIcon, title: "Verified Drivers", desc: "CNIC, licence & permit checked" },
  { icon: ClockIcon, title: "Live Status Alerts", desc: "Expiry reminders before it's late" },
  { icon: WalletIcon, title: "Transparent Payments", desc: "No hidden broker charges" },
  { icon: StarIcon, title: "Trusted Network", desc: "Growing across Punjab & Sindh" },
];

export default async function HomePage() {
  const { content, services, steps } = await getHomeData();

  const heading = content?.heading ?? "Pakistan's Smartest Agricultural & Commercial Goods Transport Network";
  const subheading =
    content?.subheading ??
    "Connecting verified truck drivers with commodity loads for seamless, transparent transport across the nation.";

  return (
    <>
      {/* HERO */}
      <section className="bg-brand-slate">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 text-center">
          <span className="section-eyebrow">
            <TruckIcon className="w-3.5 h-3.5" /> Pakistan&apos;s National Load Network
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-6 text-brand-navy">{heading}</h1>
          <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto mb-10">{subheading}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/merchant/dashboard" className="btn-orange text-base px-8 py-3.5">
              <TruckIcon className="w-5 h-5" /> Post a Load (For Merchants)
            </Link>
            <Link href="/register" className="btn-outline text-base px-8 py-3.5">
              <TruckCheckIcon className="w-5 h-5" /> Join as Verified Driver
            </Link>
          </div>
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
          {services.length === 0 && (
            <p className="text-slate-400 col-span-full text-center">
              No services published yet — add some from the Admin Dashboard.
            </p>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <span className="section-eyebrow">
              <ArrowRightIcon className="w-3.5 h-3.5" /> How It Works
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy">Three Simple Steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i % STEP_ICONS.length];
              return (
                <div key={step.id} className="text-center relative">
                  <div className="icon-badge-round mx-auto bg-brand-navy text-white mb-5 relative shadow-pop">
                    <Icon className="w-9 h-9" />
                    <span className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center border-2 border-white">
                      {step.step_number}
                    </span>
                  </div>
                  <h3 className="font-semibold text-brand-navy mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 max-w-[220px] mx-auto">{step.description}</p>
                </div>
              );
            })}
            {steps.length === 0 && (
              <p className="text-slate-400 col-span-full text-center">
                No steps published yet — add some from the Admin Dashboard.
              </p>
            )}
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
