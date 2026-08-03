"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowserClient";
import { MenuIcon, CloseIcon, LogoutIcon, UserIcon } from "./Icons";

/**
 * Shared sidebar dashboard shell for Admin / Merchant / Driver.
 *
 * - Desktop (md and up): fixed left sidebar, always visible.
 * - Mobile: sidebar becomes a slide-in drawer behind a hamburger button,
 *   with a dark overlay to close it — standard mobile dashboard pattern.
 *
 * Usage:
 *   <DashboardLayout
 *     roleLabel="Admin"
 *     title="Admin Dashboard"
 *     subtitle="Manage website content and monitor document compliance."
 *     titleIcon={ShieldCheckIcon}
 *     navItems={TABS}                // [{ label, icon }]
 *     activeTab={activeTab}
 *     onTabChange={setActiveTab}
 *   >
 *     {activeTab === "..." && <SomeTabContent />}
 *   </DashboardLayout>
 */
export default function DashboardLayout({
  roleLabel,
  title,
  subtitle,
  titleIcon: TitleIcon,
  navItems,
  activeTab,
  onTabChange,
  children,
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function selectTab(label) {
    onTabChange(label);
    setDrawerOpen(false);
  }

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <span className="w-9 h-9 rounded-full bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange font-bold text-sm shrink-0">
          SG
        </span>
        <div className="min-w-0">
          <p className="text-white font-display font-bold text-sm leading-tight truncate">
            Smart Goods
          </p>
          <p className="text-slate-300 text-xs leading-tight">Transport Co.</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.label;
          return (
            <button
              key={item.label}
              onClick={() => selectTab(item.label)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                active
                  ? "bg-brand-orange text-white shadow-sm"
                  : "text-slate-200 hover:bg-white/10"
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-200 hover:bg-white/10 transition-colors"
        >
          <LogoutIcon className="w-[18px] h-[18px] shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-brand-slate">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 bg-brand-navy shrink-0">
        {SidebarContent}
      </aside>

      {/* Mobile drawer + overlay */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-50 w-72 max-w-[80vw] bg-brand-navy flex flex-col animate-slide-in">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white"
              aria-label="Close menu"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="md:hidden text-brand-navy shrink-0"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                <MenuIcon className="w-6 h-6" />
              </button>
              {TitleIcon && (
                <span className="hidden sm:flex icon-badge bg-brand-orange/10 text-brand-orange w-10 h-10 rounded-xl shrink-0">
                  <TitleIcon className="w-5 h-5" />
                </span>
              )}
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-brand-navy truncate">{title}</h1>
                {subtitle && (
                  <p className="hidden sm:block text-slate-500 text-sm truncate">{subtitle}</p>
                )}
              </div>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 bg-brand-orangeSoft text-brand-navy text-xs font-semibold px-3 py-1.5 rounded-full shrink-0">
              <UserIcon className="w-3.5 h-3.5" />
              {roleLabel}
            </span>
          </div>

          {/* Mobile: horizontally scrollable tab pills, since sidebar is hidden */}
          <div className="md:hidden flex gap-2 px-4 pb-3 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => selectTab(item.label)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                    active
                      ? "bg-brand-orange text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
