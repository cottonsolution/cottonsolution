export default function Footer() {
  return (
    <footer className="bg-brand-navy text-slate-300 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
        <div>
          <p className="text-white font-display font-bold mb-2">Smart Goods Transport Company</p>
          <p className="text-slate-400">
            Pakistan&apos;s digital backbone for agricultural commodity logistics — cotton, wheat, and rapeseed,
            moved by verified drivers.
          </p>
        </div>
        <div>
          <p className="text-white font-semibold mb-2">Quick Links</p>
          <ul className="space-y-1 text-slate-400">
            <li><a href="/services" className="hover:text-brand-orange">Our Services</a></li>
            <li><a href="/vehicle-verification" className="hover:text-brand-orange">Vehicle Verification</a></li>
            <li><a href="/register" className="hover:text-brand-orange">Driver Registration</a></li>
          </ul>
        </div>
        <div>
          <p className="text-white font-semibold mb-2">Contact</p>
          <p className="text-slate-400">Multan, Punjab, Pakistan</p>
          <p className="text-slate-400">support@smartgoodstransport.pk</p>
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-xs text-slate-500 py-4">
        &copy; {new Date().getFullYear()} Smart Goods Transport Company. All rights reserved.
      </div>
    </footer>
  );
}
