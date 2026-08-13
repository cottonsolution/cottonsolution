"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  TruckIcon,
  GridIcon,
  ShieldCheckIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  WhatsAppIcon,
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
  XIcon,
} from "./Icons";
import { supabase } from "@/lib/supabaseClient";

// Contact details + social links are managed live from
// Admin Dashboard > Contact.
const FALLBACK_CONTACT = {
  address: "Multan, Punjab, Pakistan",
  phone: "+92 300 0000000",
  whatsapp_number: "+92 300 0000000",
  email: "support@smartgoodstransport.pk",
  facebook_url: null,
  instagram_url: null,
  youtube_url: null,
  x_url: null,
};

function whatsappLink(number) {
  const digits = (number || "").replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}` : "https://wa.me/";
}

const SOCIAL_LINKS_META = [
  { key: "facebook_url", label: "Facebook", icon: FacebookIcon },
  { key: "instagram_url", label: "Instagram", icon: InstagramIcon },
  { key: "youtube_url", label: "YouTube", icon: YoutubeIcon },
  { key: "x_url", label: "X (Twitter)", icon: XIcon },
];

export default function Footer() {
  const [contact, setContact] = useState(FALLBACK_CONTACT);
  const pathname = usePathname();

  useEffect(() => {
    supabase
      .from("contact_info")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => data && setContact(data))
      .catch(() => {});
  }, []);

  // Admin/Merchant/Driver dashboards are a fixed app-shell (DashboardLayout)
  // that renders its own copyright line inside the scrollable content pane —
  // rendering anything here too would duplicate it and break the fixed layout.
  const isDashboardRoute = /^\/(admin|merchant|driver|login|reset-password)(\/|$)/.test(pathname);
  if (isDashboardRoute) return null;

  const activeSocials = SOCIAL_LINKS_META.filter((s) => contact[s.key]);

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
          <p className="text-slate-400 leading-relaxed mb-5">
            Pakistan&apos;s digital backbone for agricultural commodity logistics — cotton, wheat, and
            rapeseed, moved by verified drivers.
          </p>

          {activeSocials.length > 0 && (
            <div className="flex items-center gap-3">
              {activeSocials.map((s) => (
                <a
                  key={s.key}
                  href={contact[s.key]}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:bg-brand-orange hover:text-white transition-colors"
                >
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          )}
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
            <li>
              <a href="/contact" className="flex items-center gap-2.5 hover:text-brand-orange">
                <MailIcon className="w-4 h-4 shrink-0" /> Contact Us
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-white font-semibold mb-3">Contact</p>
          <ul className="space-y-2.5 text-slate-400">
            <li className="flex items-center gap-2.5">
              <MapPinIcon className="w-4 h-4 shrink-0" /> {contact.address}
            </li>
            <li>
              <a href={`tel:${(contact.phone || "").replace(/\s+/g, "")}`} className="flex items-center gap-2.5 hover:text-brand-orange">
                <PhoneIcon className="w-4 h-4 shrink-0" /> {contact.phone}
              </a>
            </li>
            <li>
              <a href={whatsappLink(contact.whatsapp_number)} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 hover:text-brand-orange">
                <WhatsAppIcon className="w-4 h-4 shrink-0 text-green-400" /> WhatsApp Support
              </a>
            </li>
            <li>
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2.5 hover:text-brand-orange">
                <MailIcon className="w-4 h-4 shrink-0" /> {contact.email}
              </a>
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
