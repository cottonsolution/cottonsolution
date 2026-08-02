"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

/**
 * Browser-side Supabase client for every Client Component that touches auth
 * (login/signup/logout, session checks) or writes data as a logged-in user
 * (dashboards, forms, realtime channels, file uploads).
 *
 * THE BUG THIS FIXES: the plain `createClient(...)` in `lib/supabaseClient.js`
 * only stores the session in the browser's localStorage. `middleware.js`
 * (which guards /admin, /merchant, /driver) runs on the SERVER and can only
 * see the session via cookies — it has no access to localStorage. So the
 * old flow was:
 *   1. User logs in -> session saved to localStorage only. Login succeeds.
 *   2. App redirects to /merchant/dashboard.
 *   3. middleware.js runs on the server, checks for a session cookie, finds
 *      none (it was never written there), and bounces the request straight
 *      back to /login.
 *   4. The login button's "Please wait..." spinner ends and the form just
 *      looks like it reset — with no error, because technically the login
 *      itself DID succeed; only the very next page load got rejected.
 *
 * `createClientComponentClient()` uses the exact same session under the
 * hood, but additionally mirrors it into cookies on every sign-in/sign-out/
 * refresh, so `middleware.js` (and any server-rendered page) can see it too.
 *
 * Public, read-only pages (Home, Services, Contact, Footer) that never touch
 * `.auth` still use the plain client in `lib/supabaseClient.js` — no change
 * needed there.
 */
export const supabase = createClientComponentClient();
