"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowserClient";
import HeroSlider from "@/components/HeroSlider";

/**
 * Renders nothing if the admin hasn't configured any slides for this
 * section yet — so dashboards that haven't been set up don't show an empty
 * black box. Strictly maintains a 16:9 aspect ratio at any width via
 * Tailwind's `aspect-video`, and sits above the dashboard's own sticky
 * Back/Home bar (not sticky itself, so it scrolls away naturally).
 */
export default function DashboardVideoDeck({ section }) {
  const [slides, setSlides] = useState(null); // null = loading, [] = none configured

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("hero_slides")
      .select("*")
      .eq("section", section)
      .order("sort_order")
      .then(({ data }) => {
        if (!cancelled) setSlides(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  if (!slides || slides.length === 0) return null;

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-card mb-4 sm:mb-6">
      <HeroSlider slides={slides} />
    </div>
  );
}
