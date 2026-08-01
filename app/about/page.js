export const metadata = { title: "About Us | Smart Goods Transport Company" };

export default function AboutPage() {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-brand-navy mb-6">About Smart Goods Transport Company</h1>
      <p className="text-slate-600 leading-relaxed mb-4">
        Smart Goods Transport Company is Pakistan&apos;s digital network for commercial agricultural
        logistics. We connect commodity merchants trading cotton, wheat, and rapeseed with a
        verified fleet of truck drivers, replacing informal phone-and-broker dispatch with a
        transparent, document-checked marketplace.
      </p>
      <p className="text-slate-600 leading-relaxed mb-4">
        Every vehicle on our network is verified against its driver&apos;s CNIC, driving licence,
        and route permit, each tracked with an expiry date so merchants can dispatch with
        confidence and never load onto a truck with lapsed documentation.
      </p>
      <p className="text-slate-600 leading-relaxed">
        Our platform issues a digital bilty for every dispatched shipment, gives merchants live
        shipment tracking, and gives drivers a clear queue of load offers they can accept or
        counter-bid on — all from one dashboard.
      </p>
    </section>
  );
}
