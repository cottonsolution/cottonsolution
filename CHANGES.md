# Load Posting & Dynamic Management Update

This update implements all 6 requirements plus the load-card workflow, on top
of the existing Next.js + Supabase (Postgres) stack — no new frameworks were
introduced. Location search uses OpenStreetMap/Leaflet (already a project
dependency) instead of Google Places, since it needs no API key and behaves
as a drop-in equivalent (search-as-you-type + map preview pin).

## 1. Database — `supabase/migrations/002_load_posting_enhancements.sql`
Run this in Supabase Studio → SQL Editor **after** the base `schema.sql`.

- New table `commodities` (name, active, sort_order) — seeded from the old
  fixed list.
- New table `quantity_units` (name, symbol, active, sort_order) — seeded
  with Munds / Tons / KGs / Bori. Reused for **both** the Quantity dropdown
  and the Target Freight rate-unit dropdown.
- `loads` table gains: `commodity_id`, `quantity_unit_id`, `vehicle_type_id`,
  `offered_rate_unit_id`, `offered_rate_unit`, `pickup_place_id`,
  `dropoff_place_id`, `dropoff_lat`, `dropoff_lng`. Old hard-coded CHECK
  constraints on `commodity` / `quantity_unit` are dropped since these are
  now admin-managed lists. Existing rows are backfilled automatically.
- RLS: `commodities` and `quantity_units` are public-read / admin-write,
  matching the existing `vehicle_types` pattern.

Truck types reuse the **existing** `vehicle_types` table/admin tab (already
had full CRUD) — it's now also the source for the compulsory Post Load
"Truck Type" field, so no new table was needed there.

## 2. Admin Dashboard — `app/admin/dashboard/page.js`
- New **Commodity** tab and **Quantity Units** tab (add / edit / delete /
  reorder via ↑↓ / active-inactive toggle), built on a shared
  `ManagedListCRUD` component.
- **Vehicle Types** tab renamed to **Truck Types** with an updated
  description (it now feeds both driver registration and load posting).

## 3. Merchant Dashboard — `app/merchant/dashboard/page.js`
Post a Load form:
- **Commodity** → dropdown, sourced live from Admin → Commodity.
- **Quantity** → numeric input + dropdown unit selector, sourced from
  Admin → Quantity Units.
- **Truck Type** → now a **required** dropdown, sourced from Admin → Truck
  Types (previously optional).
- **Pickup / Drop-off Location** → new `LocationAutocomplete` component:
  type-ahead search (OpenStreetMap Nominatim), pick a suggestion or use
  "My Current Location", then a mini Leaflet map renders the pinned point
  for visual confirmation. Drop-off now also captures lat/lng (previously
  only pickup did).
- **Target Freight** → numeric input + unit dropdown (e.g. "1200 / Ton"),
  sourced from the same Quantity Units list.

Posted Loads cards:
- Below the form, a **"Your Posted Loads"** grid shows all of the
  merchant's currently `open` loads as cards with **View / Edit / Delete**
  actions.
- **View** opens a read-only modal with full details + map previews.
- **Edit** opens a pre-filled modal (guarded server-side to only update
  while `status = 'open'`).
- **Delete** removes the load after confirmation.
- The list subscribes to **Supabase Realtime** on the `loads` table, so a
  card automatically disappears the moment a driver accepts the load
  (status leaves `"open"`) — no page refresh needed.

## 4. New / changed components
- `components/LocationAutocomplete.jsx` — map-based location search input.
- `components/MiniMapPreview.jsx` — small read-only Leaflet pin preview,
  reused by both the location picker and the load View modal.
- `components/Icons.jsx` — added `EditIcon`, `MapIcon`, `ArrowUpIcon`,
  `ArrowDownIcon`.

## Backend / API notes
This project doesn't use custom Next.js API routes — all data access goes
through `@supabase/supabase-js` directly from client components, protected
by Postgres Row Level Security policies (see the existing pattern in
`schema.sql`). The new tables and columns follow that same convention rather
than introducing a parallel API layer, to stay consistent with the rest of
the codebase.

## To deploy
1. Run `supabase/migrations/002_load_posting_enhancements.sql` against your
   Supabase project.
2. Deploy the updated app code as usual (`npm install && npm run build`).
3. In Admin Dashboard, review/add entries under **Commodity**, **Quantity
   Units**, and **Truck Types** before merchants start posting loads.
