import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/push/send
 * Body: { userId: string, title: string, body: string, url?: string, tag?: string, urgent?: boolean }
 *
 * Sends a Web Push notification to every device `userId` has subscribed
 * from (public.push_subscriptions), so alerts (new load nearby, load
 * accepted, new chat message, documentation ready, arrival, etc.) reach the
 * driver/merchant even with the tab closed or the phone locked — the
 * background equivalent of the in-app "call style" ring overlay.
 *
 * This is the one server-side piece of an otherwise client-direct-to-
 * Supabase app: sending a push requires the VAPID private key, which must
 * never reach the browser, and reading push_subscriptions for an arbitrary
 * recipient requires bypassing that recipient's own RLS — both need a
 * trusted server context.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:support@smartgoodstransport.pk";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "Push not configured (missing VAPID keys)" }, { status: 500 });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Push not configured (missing service role key)" }, { status: 500 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, title, body, url = "/", tag = "sgtc-alert", urgent = false } = payload || {};
  if (!userId || !title) {
    return NextResponse.json({ error: "userId and title are required" }, { status: 400 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 });

  const notificationPayload = JSON.stringify({
    title,
    body: body || "",
    url,
    tag,
    urgent, // urgent=true -> service worker keeps it on screen + vibrates like an incoming call
  });

  let sent = 0;
  const staleIds = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          notificationPayload
        );
        sent += 1;
      } catch (err) {
        // 404/410 = the browser subscription no longer exists — clean it up.
        if (err?.statusCode === 404 || err?.statusCode === 410) staleIds.push(sub.id);
      }
    })
  );

  if (staleIds.length) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return NextResponse.json({ sent });
}
