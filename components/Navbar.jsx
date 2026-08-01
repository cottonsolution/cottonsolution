"use client";

import Link from "next/link";
import { useState } from "react";
import { HomeIcon, GridIcon, TruckIcon, InfoIcon, LoginIcon, MenuIcon, CloseIcon } from "./Icons";

// Emblem mark: a rounded seal with a crescent + star, echoing Pakistan's
// flag — reinforces "national network" without needing any reading.
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
  { href: "/register", label: "For Drivers", icon: TruckIcon },
  { href: "/about", label: "About Us", icon: InfoIcon },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-brand-navy sticky top-0 z-50 shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <EmblemIcon className="w-9 h-9 shrink-0" />
          <span className="text-white font-display font-bold text-sm sm:text-lg leading-tight">
            Smart Goods Transport Company
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 text-slate-200 hover:text-brand-orange text-sm font-medium transition-colors"
              >
                <Icon className="w-[18px] h-[18px]" />
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:block">
          <Link href="/login" className="btn-orange text-sm py-2.5">
            <LoginIcon className="w-4 h-4" />
            Login / Signup
          </Link>
        </div>

        <button className="md:hidden text-white" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <CloseIcon className="w-7 h-7" /> : <MenuIcon className="w-7 h-7" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-brand-navy border-t border-white/10 px-4 pb-4 flex flex-col gap-1">
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
