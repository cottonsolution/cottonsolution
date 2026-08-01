import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

async function getHomeData() {
  const [{ data: content }, { data: services }, { data: steps }] = await Promise.all([
    supabase.from("site_content").select("*").eq("id", 1).single(),
    supabase.from("services").select("*").order("sort_order"),
    supabase.from("how_it_works_steps").select("*").order("sort_order"),
  ]);
  return { content, services: services ?? [], steps: steps ?? [] };
}

export default async function HomePage() {
  const { content, services, steps } = await getHomeData();

  const heading =
    content?.heading ?? "Pakistan's Smartest Commercial Goods Transport Network";
  const subheading =
    content?.subheading ??
    "Connecting verified truck drivers with commodity loads for seamless, transparent, and efficient transport across the nation.";

  return (
    <>
      {/* HERO */}
      <section className="bg-brand-navy text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-6">{heading}</h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-10">{subheading}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/merchant/dashboard" className="btn-orange text-base px-8 py-3">
              Post a Load (For Merchants)
            </Link>
            <Link href="/vehicle-verification" className="btn-outline text-base px-8 py-3">
              Verify a Vehicle
            </Link>
          </div>
        </div>
      </section>

      {/* OUR SERVICES */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy text-center mb-3">Our Services</h2>
        <p className="text-slate-500 text-center max-w-xl mx-auto mb-12">
          Everything a merchant or driver needs to move agricultural commodities with confidence.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s) => (
            <div key={s.id} className="card">
              <div className="w-11 h-11 rounded-lg bg-brand-orange/10 text-brand-orange flex items-center justify-center mb-4 font-bold">
                {s.title.charAt(0)}
              </div>
              <h3 className="font-semibold text-brand-navy mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500">{s.description}</p>
            </div>
          ))}
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
          <h2 className="text-2xl sm:text-3xl font-bold text-brand-navy text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.id} className="text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-brand-navy text-white flex items-center justify-center font-display font-bold text-lg mb-5">
                  {step.step_number}
                </div>
                <h3 className="font-semibold text-brand-navy mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500">{step.description}</p>
              </div>
            ))}
            {steps.length === 0 && (
              <p className="text-slate-400 col-span-full text-center">
                No steps published yet — add some from the Admin Dashboard.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
