"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Full-bleed background carousel for the hero section. Accepts a list of
 * { id, media_url, media_type, caption } slides from Supabase and cross-fades
 * between them. Falls back to nothing (transparent) if no slides exist yet,
 * so the hero still looks correct on a fresh install.
 */
export default function HeroSlider({ slides = [] }) {
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (slides.length < 2) return;
    timerRef.current = setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === active ? "opacity-100" : "opacity-0"}`}
        >
          {slide.media_type === "video" ? (
            <video
              src={slide.media_url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            // Background photo/illustration slide — plain <img> keeps this
            // component framework-agnostic and avoids needing next/image config.
            <img src={slide.media_url} alt={slide.caption ?? "Smart Goods Transport"} className="w-full h-full object-cover" />
          )}
        </div>
      ))}

      {/* dark overlay so the hero heading/subheading stay readable on any slide */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-navy/80 via-brand-navy/70 to-brand-slate" />

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActive(i)}
              aria-label={`Show slide ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === active ? "bg-brand-orange w-6" : "bg-white/50"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
