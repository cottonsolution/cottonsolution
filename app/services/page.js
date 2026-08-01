import { supabase } from "@/lib/supabaseClient";

export const metadata = { title: "Our Services | Smart Goods Transport Company" };

export default async function ServicesPage() {
  const { data: services } = await supabase.from("services").select("*").order("sort_order");

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-brand-navy mb-3">Our Services</h1>
      <p className="text-slate-500 mb-12 max-w-2xl">
        From load matching to digital biltys, here is everything Smart Goods Transport Company handles
        for merchants and drivers moving cotton, wheat, and rapeseed across Pakistan.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {(services ?? []).map((s) => (
          <div key={s.id} className="card">
            <div className="w-11 h-11 rounded-lg bg-brand-orange/10 text-brand-orange flex items-center justify-center mb-4 font-bold">
              {s.title.charAt(0)}
            </div>
            <h3 className="font-semibold text-brand-navy mb-2">{s.title}</h3>
            <p className="text-sm text-slate-500">{s.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
