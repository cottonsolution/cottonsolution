import { InfoIcon, ShieldCheckIcon, DocumentCheckIcon, TruckIcon, CottonIcon, WheatIcon } from "@/components/Icons";

export const metadata = { title: "About Us | Smart Goods Transport Company" };

const HIGHLIGHTS = [
  {
    icon: ShieldCheckIcon,
    title: "Verified Fleet",
    desc: "Every vehicle is checked against its driver's CNIC, driving licence, and route permit — each tracked with an expiry date.",
  },
  {
    icon: DocumentCheckIcon,
    title: "Digital Bilty",
    desc: "A tamper-proof digital bilty is issued for every dispatched shipment — no paperwork lost, no disputes.",
  },
  {
    icon: TruckIcon,
    title: "Live Dispatch Queue",
    desc: "Drivers get a clear queue of load offers they can accept from their dashboard, no broker phone calls needed.",
  },
];

export default function AboutPage() {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <span className="section-eyebrow">
        <InfoIcon className="w-3.5 h-3.5" /> About Us
      </span>
      <h1 className="text-3xl font-bold text-brand-navy mb-6">About Smart Goods Transport Company</h1>

      <p className="text-slate-600 leading-relaxed mb-4">
        Smart Goods Transport Company is Pakistan&apos;s digital network for commercial agricultural
        logistics. We connect commodity merchants trading cotton, wheat, and rapeseed with a
        verified fleet of truck drivers, replacing informal phone-and-broker dispatch with a
        transparent, document-checked marketplace.
      </p>

      <div className="flex items-center gap-4 my-8 text-brand-orange">
        <CottonIcon className="w-8 h-8" />
        <WheatIcon className="w-8 h-8" />
        <TruckIcon className="w-8 h-8" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {HIGHLIGHTS.map((h) => (
          <div key={h.title} className="card">
            <div className="icon-badge bg-brand-orange/10 text-brand-orange mb-4">
              <h.icon className="w-7 h-7" />
            </div>
            <h3 className="font-semibold text-brand-navy mb-2">{h.title}</h3>
            <p className="text-sm text-slate-500">{h.desc}</p>
          </div>
        ))}
      </div>

      <p className="text-slate-600 leading-relaxed">
        Our platform issues a digital bilty for every dispatched shipment, gives merchants live
        shipment tracking, and gives drivers a clear queue of load offers they can accept or
        counter-bid on — all from one dashboard.
      </p>
    </section>
  );
}
