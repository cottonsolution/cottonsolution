import { TruckIcon, GridIcon, ShieldCheckIcon, PhoneIcon, MailIcon, MapPinIcon, WhatsAppIcon } from "./Icons";

export default function Footer() {
  return (
    <footer className="bg-brand-navy text-slate-300 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-10 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <TruckIcon className="w-5 h-5 text-brand-orange" />
            </span>
            <p className="text-white font-display font-bold">Smart Goods Transport Company</p>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Pakistan&apos;s digital backbone for agricultural commodity logistics — cotton, wheat, and
            rapeseed, moved by verified drivers.
          </p>
        </div>

        <div>
          <p className="text-white font-semibold mb-3">Quick Links</p>
          <ul className="space-y-2.5 text-slate-400">
            <li>
              <a href="/services" className="flex items-center gap-2.5 hover:text-brand-orange">
                <GridIcon className="w-4 h-4 shrink-0" /> Our Services
              </a>
            </li>
            <li>
              <a href="/vehicle-verification" className="flex items-center gap-2.5 hover:text-brand-orange">
                <ShieldCheckIcon className="w-4 h-4 shrink-0" /> Vehicle Verification
              </a>
            </li>
            <li>
              <a href="/register" className="flex items-center gap-2.5 hover:text-brand-orange">
                <TruckIcon className="w-4 h-4 shrink-0" /> Driver Registration
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-white font-semibold mb-3">Contact</p>
          <ul className="space-y-2.5 text-slate-400">
            <li className="flex items-center gap-2.5">
              <MapPinIcon className="w-4 h-4 shrink-0" /> Multan, Punjab, Pakistan
            </li>
            <li className="flex items-center gap-2.5">
              <PhoneIcon className="w-4 h-4 shrink-0" /> +92 300 0000000
            </li>
            <li className="flex items-center gap-2.5">
              <WhatsAppIcon className="w-4 h-4 shrink-0 text-green-400" /> WhatsApp Support
            </li>
            <li className="flex items-center gap-2.5">
              <MailIcon className="w-4 h-4 shrink-0" /> support@smartgoodstransport.pk
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-xs text-slate-500 py-4">
        &copy; {new Date().getFullYear()} Smart Goods Transport Company. All rights reserved.
      </div>
    </footer>
  );
}
