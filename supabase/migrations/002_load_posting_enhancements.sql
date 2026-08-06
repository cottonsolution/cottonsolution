-- ============================================================================
-- MIGRATION 002 — DYNAMIC LOAD POSTING PARAMETERS
-- Run this in Supabase Studio -> SQL Editor AFTER schema.sql (or via
-- `supabase db push`). Safe to re-run (uses IF NOT EXISTS / ON CONFLICT).
--
-- Adds:
--   1. public.commodities        — Admin > Commodity CMS
--   2. public.quantity_units     — Admin > Quantity Units CMS
--      (reused for both "Quantity" and "Target Freight" unit dropdowns,
--       e.g. Munds, Tons, KGs, Bori)
--   3. Extra columns on public.loads for: commodity_id / quantity_unit_id /
--      vehicle_type_id (FK links to the tables above + vehicle_types),
--      dropoff_lat/lng + pickup/dropoff place ids (map-based location
--      search for BOTH pickup and drop-off), and offered_rate_unit_id
--      (dynamic "PKR / <unit>" freight rate).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. COMMODITIES  (Admin CMS — feeds the merchant "Commodity" dropdown)
-- ----------------------------------------------------------------------------
create table if not exists public.commodities (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  active        boolean not null default true,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

insert into public.commodities (name, sort_order) values
  ('Cotton', 1),
  ('Wheat', 2),
  ('Rapeseed', 3),
  ('Maize', 4),
  ('Rice', 5),
  ('Sugarcane', 6),
  ('Other', 7)
on conflict (name) do nothing;

-- ----------------------------------------------------------------------------
-- 2. QUANTITY UNITS  (Admin CMS — feeds BOTH the "Quantity" unit dropdown
--    and the "Target Freight" rate-unit dropdown, e.g. "1200 / Ton")
-- ----------------------------------------------------------------------------
create table if not exists public.quantity_units (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,   -- e.g. "Munds", "Tons", "KGs", "Bori"
  symbol        text,                   -- optional short label, e.g. "Md", "T", "Kg", "Bori"
  active        boolean not null default true,
  sort_order    int default 0,
  created_at    timestamptz default now()
);

insert into public.quantity_units (name, symbol, sort_order) values
  ('Munds', 'Md', 1),
  ('Tons', 'T', 2),
  ('KGs', 'Kg', 3),
  ('Bori', 'Bori', 4)
on conflict (name) do nothing;

-- ----------------------------------------------------------------------------
-- 3. LOADS — extra columns for dynamic dropdowns + dual map-based locations
-- ----------------------------------------------------------------------------

-- Relax the old hard-coded check constraints now that Commodity + Quantity
-- Unit are admin-managed lists rather than fixed enums.
alter table public.loads drop constraint if exists loads_commodity_check;
alter table public.loads drop constraint if exists loads_quantity_unit_check;
alter table public.loads alter column quantity_unit drop default;

alter table public.loads
  add column if not exists commodity_id          uuid references public.commodities (id),
  add column if not exists quantity_unit_id       uuid references public.quantity_units (id),
  add column if not exists vehicle_type_id         uuid references public.vehicle_types (id),
  add column if not exists pickup_place_id        text,        -- geocoder place reference for the pinned pickup point
  add column if not exists dropoff_place_id       text,        -- geocoder place reference for the pinned drop-off point
  add column if not exists dropoff_lat            numeric,     -- drop-off pin captured via map search (mirrors pickup_lat)
  add column if not exists dropoff_lng            numeric,
  add column if not exists offered_rate_unit_id   uuid references public.quantity_units (id),
  add column if not exists offered_rate_unit      text;        -- denormalised label, e.g. "Ton" -> shown as "PKR 1200 / Ton"

-- Best-effort backfill of the new FK columns from existing text values so
-- older rows keep working with the new dropdown-driven UI.
update public.loads l
set commodity_id = c.id
from public.commodities c
where l.commodity_id is null and l.commodity = c.name;

update public.loads l
set quantity_unit_id = u.id
from public.quantity_units u
where l.quantity_unit_id is null and l.quantity_unit = u.name;

update public.loads l
set vehicle_type_id = vt.id
from public.vehicle_types vt
where l.vehicle_type_id is null and l.vehicle_type_needed = vt.name;

comment on column public.loads.vehicle_type_needed is
  'Truck type is now a REQUIRED field on the post-load form (validated in the app layer); kept nullable here only for backward compatibility with rows created before this migration.';

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY — commodities & quantity_units follow the same public
-- read / admin write pattern as vehicle_types.
-- ----------------------------------------------------------------------------
alter table public.commodities enable row level security;
alter table public.quantity_units enable row level security;

drop policy if exists "commodities_public_read" on public.commodities;
create policy "commodities_public_read" on public.commodities
  for select using (true);
drop policy if exists "commodities_admin_write" on public.commodities;
create policy "commodities_admin_write" on public.commodities
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "quantity_units_public_read" on public.quantity_units;
create policy "quantity_units_public_read" on public.quantity_units
  for select using (true);
drop policy if exists "quantity_units_admin_write" on public.quantity_units;
create policy "quantity_units_admin_write" on public.quantity_units
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- End of migration 002
-- ============================================================================
