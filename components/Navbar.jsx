"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowserClient";
import {
  HomeIcon,
  GridIcon,
  RouteIcon,
  ShieldCheckIcon,
  InfoIcon,
  MailIcon,
  LoginIcon,
  MenuIcon,
  CloseIcon,
} from "./Icons";

// Emblem mark: a rounded seal with a crescent + star, echoing Pakistan's
// flag — used as a fallback whenever no logo has been uploaded yet.
function EmblemIcon({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#d4a527" />
      <circle cx="24" cy="24" r="18.5" fill="#0e3b2e" />
      <path d="M29 15a10 10 0 1 0 0.5 19.9A11.5 11.5 0 1 1 29 15z" fill="#ffffff" />
      <path
        d="M32 17.6l1.1 2.6 2.8.3-2.1 1.9.6 2.8-2.4-1.5-2.4 1.5.6-2.8-2.1-1.9 2.8-.3z"
        fill="#ffffff"
      />
    </svg>
  );
}

const NAV_LINKS = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/services", label: "Our Services", icon: GridIcon },
  { href: "/#how-it-works", label: "How It Works", icon: RouteIcon },
  { href: "/vehicle-verification", label: "Vehicle Verification", icon: ShieldCheckIcon },
  { href: "/about", label: "About Us", icon: InfoIcon },
  { href: "/contact", label: "Contact Us", icon: MailIcon },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    supabase
      .from("site_content")
      .select("logo_url")
      .eq("id", 1)
      .single()
      .then(({ data }) => data?.logo_url && setLogoUrl(data.logo_url))
      .catch(() => {});
  }, []);

  // Admin/Merchant/Driver dashboards render their own sticky header inside
  // DashboardLayout — showing the public marketing navbar above it too was
  // redundant (two stacked headers) and pushed the dashboard content down.
  // This check must come AFTER the hooks above (Rules of Hooks: hooks must
  // run unconditionally on every render, in the same order).
  const isDashboardRoute = /^\/(admin|merchant|driver|onboarding)(\/|$)/.test(pathname);
  if (isDashboardRoute) return null;

  return (
    <header className="bg-brand-navy sticky top-0 z-50 shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt="Smart Goods Transport Company" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <EmblemIcon className="w-9 h-9 shrink-0" />
          )}
          <span className="text-white font-display font-bold text-sm sm:text-base leading-tight hidden sm:block">
            Smart Goods Transport Company
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-5 xl:gap-6">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 text-slate-200 hover:text-brand-orange text-sm font-medium transition-colors whitespace-nowrap"
              >
                <Icon className="w-[16px] h-[16px] shrink-0" />
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden lg:block shrink-0">
          <Link href="/login" className="btn-orange text-sm py-2.5">
            <LoginIcon className="w-4 h-4" />
            Login / Signup
          </Link>
        </div>

        <button className="lg:hidden text-white shrink-0" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <CloseIcon className="w-7 h-7" /> : <MenuIcon className="w-7 h-7" />}
        </button>
      </nav>

      {open && (
        <div className="lg:hidden bg-brand-navy border-t border-white/10 px-4 pb-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 text-slate-200 hover:text-brand-orange text-sm font-medium py-2.5"
                onClick={() => setOpen(false)}
              >
                <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                {link.label}
              </Link>
            );
          })}
          <Link href="/login" className="btn-orange text-sm justify-center mt-2" onClick={() => setOpen(false)}>
            <LoginIcon className="w-4 h-4" />
            Login / Signup
          </Link>
        </div>
      )}
    </header>
  );
}
