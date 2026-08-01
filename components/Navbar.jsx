"use client";

import Link from "next/link";
import { useState } from "react";

// A simplified stylised silhouette standing in for Pakistan's map outline —
// used as the mark next to the wordmark, echoing the "national network" brief.
function PakistanMapIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 6 L28 4 L33 9 L40 8 L46 13 L45 20 L52 24 L54 32 L48 38 L50 46 L42 50 L36 58 L30 54 L22 56 L18 48 L10 44 L12 36 L8 28 L14 22 L12 14 Z"
        fill="#f97316"
        stroke="#0f172a"
        strokeWidth="1.5"
      />
      <circle cx="32" cy="30" r="2.5" fill="#0f172a" />
    </svg>
  );
}

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Our Services" },
  { href: "/vehicle-verification", label: "Vehicle Verification" },
  { href: "/about", label: "About Us" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-brand-navy sticky top-0 z-50 shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <PakistanMapIcon className="w-8 h-8 shrink-0" />
          <span className="text-white font-display font-bold text-base sm:text-lg leading-tight">
            Smart Goods Transport Company
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-slate-200 hover:text-brand-orange text-sm font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:block">
          <Link href="/login" className="btn-orange text-sm">
            Login / Signup
          </Link>
        </div>

        <button
          className="md:hidden text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-brand-navy border-t border-white/10 px-4 pb-4 flex flex-col gap-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-slate-200 hover:text-brand-orange text-sm font-medium py-1"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="btn-orange text-sm text-center mt-1" onClick={() => setOpen(false)}>
            Login / Signup
          </Link>
        </div>
      )}
    </header>
  );
}
