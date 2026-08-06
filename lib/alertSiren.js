"use client";

/**
 * Generates a loud, attention-grabbing "new order" ring using the Web Audio
 * API — no MP3/asset file to host or keep in sync. Alternates two tones like
 * a ringtone so it's unmistakable even for a driver who can't read the popup
 * text, and loops until stop() is called (order accepted/dismissed).
 *
 * Browsers block audio with sound until the user has interacted with the
 * page at least once — start() returns false if it was blocked so the UI
 * can show a "Tap to enable alert sound" prompt.
 */
export function createAlertSiren() {
  let ctx = null;
  let timer = null;
  let ringing = false;

  function beep(freq, startTime, duration) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  function ringCycle() {
    if (!ringing || !ctx) return;
    const now = ctx.currentTime;
    beep(880, now, 0.28);
    beep(660, now + 0.32, 0.28);
    timer = setTimeout(ringCycle, 900);
  }

  return {
    start() {
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
        ringing = true;
        ringCycle();
        return true;
      } catch (e) {
        return false;
      }
    },
    stop() {
      ringing = false;
      if (timer) clearTimeout(timer);
    },
  };
}
