# Realtime Chat, Call-Style Alerts & 6-Step Shipment Workflow

This update covers 5 requirements: (1) realtime chat between Driver /
Merchant / Admin, (2) a call-style alert for drivers on new loads AND for
merchants when a driver accepts, (3) faster / fully-realtime dashboards,
(4) trimming the driver's trip tracker from 8 steps to 6, and (5) making
those same 6 steps live on the Merchant's Active Shipments view — including
the full Documentation (weighment slip → Bilty) → On the Way (live GPS) →
Reached Destination (photo + merchant approval) → Rent Received handshake.

## 1. Database — `supabase/migrations/005_realtime_chat_push_stages.sql`
Run this **after** 002/003/004.

- **Trip stages 8 → 6**: `loads.trip_stage` is now `0–5` (`0` Waiting for
  Truck, `1` Load Accepted, `2` Documentation, `3` On the Way, `4` Reached
  Destination, `5` Rent Received). Existing rows are migrated automatically
  ("Loading" folds into "Load Accepted"; "Unloading"/"Unloaded" are removed).
- `loads` gains `weighment_slip_url`, `delivery_proof_url`,
  `merchant_approved_at`.
- `biltys` gains real fields (`vehicle_no`, `driver_name`, `commodity`,
  `quantity_text`, `freight_rate`, `from_location`, `to_location`) plus a
  `status` (`draft`/`submitted`) — merchants can now fill in and submit a
  Bilty, not just get an auto-generated number. A new `biltys_merchant_write`
  policy allows the owning merchant to update it.
- New `messages` table — powers **both** general 1:1 chat (`load_id` null)
  and per-shipment chat (`load_id` set), with RLS scoped to the load's
  merchant + assigned driver + admin, or the general chat's two
  participants.
- New `push_subscriptions` table — stores Web Push endpoints per user.
- New `shipment-media` Storage bucket for weighment-slip / arrival-proof
  photos.
- RLS fix: merchants previously had **no** read access to the `vehicles`
  table at all (only the driver or an admin could), so vehicle/driver
  details, live GPS, and driver-id lookups on the merchant side were
  silently blocked by RLS. Added `vehicles_merchant_read_assigned` scoped to
  vehicles assigned to that merchant's own loads.
- RLS fix: `profiles` only allowed reading your own row — chat needs to show
  the other participant's name, so added narrow read access to (a) any admin
  profile and (b) anyone you share a load or message thread with.
- `messages`, `vehicles`, and `biltys` added to the `supabase_realtime`
  publication.

## 2. Realtime chat — general **and** per-shipment
- `components/chat/ChatThread.jsx` — the live message list + input, reused
  by both modes.
- `components/chat/ChatModal.jsx` / `LoadChatButton.jsx` — a per-load "Chat"
  button drops straight into any shipment/trip card.
- `components/chat/ChatHub.jsx` — a **Messages** tab (added to Driver,
  Merchant, and Admin dashboards) listing: (a) general contacts — Admin/
  support plus whoever you've actually shared a load with, and (b) a
  shortcut list of your per-shipment chats.

## 3. Call-style alerts — both directions, now with background push
- Driver → new load nearby: already existed (`LoadAlertOverlay.jsx`,
  `lib/alertSiren.js`) — unchanged.
- **New**: Merchant → driver accepted: `components/merchant/
  LoadAcceptedAlert.jsx` rings full-screen with the truck + driver's name,
  vehicle number, and a tap-to-call mobile number, the instant a driver
  accepts one of the merchant's loads (realtime `UPDATE` subscription on
  `loads`).
- **New**: Web Push so alerts also reach a locked/backgrounded phone, not
  only an open tab — `public/sw.js` (service worker), `lib/pushClient.js`
  (subscribe + trigger), and the one server-side piece this app needed,
  `app/api/push/send/route.js` (uses the `web-push` package + Supabase
  service-role key to fan out to every device a user has subscribed from).
  Fired at: new load posted, load accepted, weighment slip uploaded, Bilty
  submitted, on the way, arrived, delivery approved, and new chat message.

## 4. Six-step shipment workflow (`lib/tripStages.js`)
Both the Driver's Work Task Bar / My Trips and the Merchant's Active
Shipments render the exact same 6 steps, live:

1. **Waiting for Truck** — posted, no driver yet.
2. **Load Accepted** — merchant gets the call-style alert.
3. **Documentation** — driver uploads the weighment slip ("kande ki
   parchi"); merchant reviews it and fills in + submits the Bilty; driver
   can then view/print/save-as-PDF it (`components/BiltyModal.jsx`) and the
   "Mark On the Way" button unlocks.
4. **On the Way** — merchant sees the truck's live GPS position on a map
   (`components/merchant/LiveVehicleMap.jsx`, driven by realtime updates on
   `vehicles`, no polling).
5. **Reached Destination** — driver uploads an arrival photo; the "Rent
   Received" step stays locked until the merchant taps **Approve**.
6. **Rent Received** — driver closes the trip.

All the transition logic (upload, submit, approve, advance) lives in
`lib/shipmentActions.js`, shared by both dashboards so the two sides can
never drift out of sync — and each action also fires the matching push
notification.

## 5. Realtime / performance
- Merchant's Active Shipments and Driver's Work Task Bar / My Trips now
  **subscribe** to `postgres_changes` on `loads` (and `biltys`, `vehicles`
  where relevant) instead of only fetching once on mount — a step change on
  one side now appears on the other within moments, no refresh needed.
- Live GPS tracking reuses the existing `vehicles.current_lat/lng` write-path
  (`lib/useLiveLocation.js`, already active in Work/Search mode) instead of
  polling — the merchant's map marker moves on its own via realtime.

## To deploy
1. Run `supabase/migrations/005_realtime_chat_push_stages.sql` in Supabase
   Studio → SQL Editor (after 002/003/004).
2. In Supabase → Database → Replication, confirm `messages`, `vehicles`, and
   `biltys` are enabled for Realtime (the migration adds them, but double
   check on hosted plans that occasionally need a manual toggle).
3. Copy `.env.local.example` → `.env.local` and fill in:
   - `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API — **server only**,
     never expose this to the browser).
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` — a starter pair is
     pre-filled for you to get moving immediately; generate your own for
     production with `npx web-push generate-vapid-keys`.
4. Add the same 3 keys as Environment Variables in Vercel → Project Settings
   → Environment Variables, then redeploy.
5. `npm install` (pulls in the new `web-push` dependency) && `npm run build`.
