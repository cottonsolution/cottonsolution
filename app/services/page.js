import { supabase } from "@/lib/supabaseClient";
import { getServiceIcon } from "@/lib/serviceIcons";
import { GridIcon } from "@/components/Icons";

export const metadata = { title: "Our Services | Smart Goods Transport Company" };

export default async function ServicesPage() {
  const { data: services } = await supabase.from("services").select("*").order("sort_order");

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <span className="section-eyebrow">
        <GridIcon className="w-3.5 h-3.5" /> What We Offer
      </span>
      <h1 className="text-3xl font-bold text-brand-navy mb-3">Our Services</h1>
      <p className="text-slate-500 mb-12 max-w-2xl">
        From load matching to digital biltys, here is everything Smart Goods Transport Company handles
        for merchants and drivers moving cotton, wheat, and rapeseed across Pakistan.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {(services ?? []).map((s) => {
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
        {(!services || services.length === 0) && (
          <p className="text-slate-400 col-span-full text-center">
            No services published yet — add some from the Admin Dashboard.
          </p>
        )}
      </div>
    </section>
  );
}
