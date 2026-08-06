"use client";

import { supabase } from "@/lib/supabaseBrowserClient";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    !!VAPID_PUBLIC_KEY
  );
}

/**
 * Registers the service worker with no permission prompt and no push
 * subscription — just enough for the browser to treat the page as
 * installable (PWA). Safe to call on every page that should be
 * installable, including ones that never send push (e.g. Admin, Login).
 * subscribeToPush() (below) still does its own registration too, so
 * calling both on the same page is harmless — registration is idempotent.
 */
export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.error("Service worker registration failed:", err);
  }
}

/**
 * Registers the service worker, asks for notification permission, and
 * upserts the resulting push subscription against this user's row so
 * /api/push/send can reach this exact device later. Call this once the
 * driver/merchant is logged in (e.g. on dashboard mount) — safe to call
 * repeatedly, it no-ops if already subscribed.
 *
 * @returns {Promise<"subscribed"|"denied"|"unsupported"|"error">}
 */
export async function subscribeToPush(userId) {
  if (!pushSupported() || !userId) return "unsupported";

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = subscription.toJSON();
    await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth_key: json.keys?.auth,
      },
      { onConflict: "endpoint" }
    );

    return "subscribed";
  } catch (err) {
    console.error("Push subscription failed:", err);
    return "error";
  }
}

/**
 * Fires a background push to `userId` via the server route. Best-effort —
 * failures are swallowed so a notification hiccup never blocks the actual
 * app action (accepting a load, sending a message, etc.).
 *
 * Also writes a row to `public.notifications` so the same event shows up in
 * the in-app bell icon — every existing call site already passes a `tag` of
 * `load-<id>`, so the load is linked automatically with no call-site changes.
 */
export async function triggerPush({ userId, title, body, url = "/", tag, urgent = false }) {
  if (!userId || !title) return;

  const loadId = tag && tag.startsWith("load-") ? tag.slice(5) : null;
  supabase.from("notifications").insert({ user_id: userId, load_id: loadId, title, body, url }).then(() => {});

  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, body, url, tag, urgent }),
    });
  } catch (err) {
    console.error("Push trigger failed:", err);
  }
}
