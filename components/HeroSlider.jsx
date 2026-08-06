"use client";

import { useEffect, useRef, useState } from "react";
import { SpeakerOnIcon, SpeakerOffIcon } from "./Icons";

const IMAGE_DURATION_MS = 6000;

/**
 * Full-bleed background carousel for the hero section. Accepts a list of
 * { id, media_url, media_type, caption } slides from Supabase and cross-fades
 * between them. Falls back to nothing (transparent) if no slides exist yet,
 * so the hero still looks correct on a fresh install.
 *
 * Timing:
 *  - Image slides advance automatically after IMAGE_DURATION_MS.
 *  - Video slides are NOT time-boxed — they play to completion and only
 *    then advance to the next slide (the `loop` attribute is intentionally
 *    left off so the browser's native "ended" event fires once).
 *
 * Video slides start muted (required by browsers for autoplay) but show a
 * small speaker toggle so visitors can turn sound on for the slide that's
 * currently showing. Only the active slide's video actually plays — the
 * others stay paused in the background so sound/CPU isn't wasted on
 * slides nobody is looking at.
 */
export default function HeroSlider({ slides = [] }) {
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const videoRefs = useRef({});

  function goToNext() {
    setActive((i) => (i + 1) % slides.length);
  }

  // Advance automatically — images use a fixed timer, videos advance
  // themselves via their "ended" event (see the <video> element below).
  useEffect(() => {
    if (slides.length < 2) return;
    const slide = slides[active];
    if (slide?.media_type === "video") return; // handled by onEnded instead
    const t = setTimeout(goToNext, IMAGE_DURATION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, slides.length]);

  // Only the visible slide's video should actually play — pause every
  // other one so background videos don't quietly keep running.
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([idx, el]) => {
      if (!el) return;
      if (Number(idx) === active) {
        el.currentTime = 0;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [active]);

  if (!slides.length) return null;

  const activeSlide = slides[active];
  const showSoundToggle = activeSlide?.media_type === "video";

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    const el = videoRefs.current[active];
    if (el) {
      el.muted = next;
      // Unmuting counts as a user gesture, so this play() call is allowed
      // to include audio even though the video auto-started muted.
      if (!next) el.play().catch(() => {});
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === active ? "opacity-100" : "opacity-0"}`}
        >
          {slide.media_type === "video" ? (
            <video
              ref={(el) => { videoRefs.current[i] = el; }}
              src={slide.media_url}
              autoPlay={i === active}
              muted={muted}
              playsInline
              onEnded={() => {
                if (i === active && slides.length > 1) goToNext();
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            // Background photo/illustration slide — plain <img> keeps this
            // component framework-agnostic and avoids needing next/image config.
            <img src={slide.media_url} alt={slide.caption ?? "Smart Goods Transport"} className="w-full h-full object-cover" />
          )}
        </div>
      ))}

      {/* Light, uniform overlay — just enough to keep the white heading
          readable on any slide, without washing out the photo or video
          underneath like a heavy gradient would. */}
      <div className="absolute inset-0 bg-brand-navy/45" />

      {showSoundToggle && (
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute video" : "Mute video"}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
        >
          {muted ? <SpeakerOffIcon className="w-5 h-5" /> : <SpeakerOnIcon className="w-5 h-5" />}
        </button>
      )}

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
