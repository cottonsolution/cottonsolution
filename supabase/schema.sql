-- ============================================================================
-- SMART GOODS TRANSPORT COMPANY — SUPABASE SCHEMA
-- Run this in Supabase Studio -> SQL Editor (or via `supabase db push`)
-- ============================================================================

-- Extension for UUID generation
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES  (extends built-in auth.users with role + contact info)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null,
  phone         text,
  role          text not null check (role in ('admin', 'merchant', 'driver')),
  created_at    timestamptz default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'merchant')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. SITE CONTENT  (single-row table driving the Home Page Content Manager)
-- ----------------------------------------------------------------------------
create table if not exists public.site_content (
  id          int primary key default 1,
  heading     text not null default 'Pakistan''s Smartest Commercial Goods Transport Network',
  subheading  text not null default 'Connecting verified truck drivers with commodity loads for seamless, transparent, and efficient transport across the nation.',
  updated_at  timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into public.site_content (id) values (1) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 3. SERVICES  ("Our Services" CMS — full CRUD from Admin Dashboard)
-- ----------------------------------------------------------------------------
create table if not exists public.services (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text not null,
  icon          text default 'truck',       -- lucide-react icon name
  sort_order    int default 0,
  created_at    timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 4. HOW IT WORKS STEPS  (3-step workflow CMS)
-- ----------------------------------------------------------------------------
create table if not exists public.how_it_works_steps (
  id            uuid primary key default gen_random_uuid(),
  step_number   int not null,
  title         text not null,
  description   text not null,
  sort_order    int default 0
);

-- ----------------------------------------------------------------------------
-- 5. VEHICLES  (Driver & Vehicle Registration + Vehicle Verification Portal)
-- ----------------------------------------------------------------------------
create table if not exists public.vehicles (
  id                  uuid primary key default gen_random_uuid(),
  driver_id           uuid references public.profiles (id) on delete set null,
  vehicle_no          text unique not null,
  mobile_no           text not null,
  driver_name         text not null,
  cnic_no             text not null,
  cnic_expiry         date not null,
  license_no          text not null,
  license_expiry      date not null,
  permit_no           text not null,
  permit_expiry       date not null,
  status              text default 'active' check (status in ('active', 'suspended')),
  created_at          timestamptz default now()
);

create index if not exists idx_vehicles_vehicle_no on public.vehicles (vehicle_no);

-- Convenience view used by the Vehicle Verification portal — auto-computes
-- expiry status so the frontend never has to do date math against "now()".
create or replace view public.vehicle_verification_view as
select
  vehicle_no,
  mobile_no,
  driver_name,
  cnic_no,
  cnic_expiry,
  case when cnic_expiry < current_date then 'Expired'
       when cnic_expiry < current_date + interval '30 days' then 'Expiring Soon'
       else 'Valid' end as cnic_status,
  license_no,
  license_expiry,
  case when license_expiry < current_date then 'Expired'
       when license_expiry < current_date + interval '30 days' then 'Expiring Soon'
       else 'Valid' end as license_status,
  permit_no,
  permit_expiry,
  case when permit_expiry < current_date then 'Expired'
       when permit_expiry < current_date + interval '30 days' then 'Expiring Soon'
       else 'Valid' end as permit_status,
  status
from public.vehicles;

-- ----------------------------------------------------------------------------
-- 6. LOADS  (Merchant-posted commodity loads)
-- ----------------------------------------------------------------------------
create table if not exists public.loads (
  id                  uuid primary key default gen_random_uuid(),
  merchant_id         uuid not null references public.profiles (id) on delete cascade,
  commodity           text not null check (commodity in ('Cotton', 'Wheat', 'Rapeseed')),
  quantity_munds      numeric not null check (quantity_munds > 0),
  pickup_location     text not null,
  dropoff_location    text not null,
  offered_rate        numeric,
  status              text default 'open' check (status in ('open', 'assigned', 'in_transit', 'delivered', 'cancelled')),
  assigned_vehicle_id uuid references public.vehicles (id),
  created_at          timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 7. BIDS  (Drivers accept / counter-bid on open loads)
-- ----------------------------------------------------------------------------
create table if not exists public.bids (
  id            uuid primary key default gen_random_uuid(),
  load_id       uuid not null references public.loads (id) on delete cascade,
  driver_id     uuid not null references public.profiles (id) on delete cascade,
  vehicle_id    uuid references public.vehicles (id),
  bid_amount    numeric not null,
  status        text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at    timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 8. BILTYS  (auto-generated digital receipt once a load is assigned)
-- ----------------------------------------------------------------------------
create table if not exists public.biltys (
  id            uuid primary key default gen_random_uuid(),
  load_id       uuid not null references public.loads (id) on delete cascade,
  bilty_no      text unique not null,
  file_url      text,  -- Supabase Storage object path (bucket: "biltys")
  generated_at  timestamptz default now()
);

-- Auto-generate a bilty the moment a load becomes "assigned"
create or replace function public.generate_bilty()
returns trigger as $$
begin
  if new.status = 'assigned' and old.status is distinct from 'assigned' then
    insert into public.biltys (load_id, bilty_no)
    values (new.id, 'BLT-' || to_char(now(), 'YYYYMMDD') || '-' || substr(new.id::text, 1, 8));
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_load_assigned on public.loads;
create trigger on_load_assigned
  after update on public.loads
  for each row execute procedure public.generate_bilty();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.site_content enable row level security;
alter table public.services enable row level security;
alter table public.how_it_works_steps enable row level security;
alter table public.vehicles enable row level security;
alter table public.loads enable row level security;
alter table public.bids enable row level security;
alter table public.biltys enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Profiles: users read/update their own row; admins read all
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- Public content (site_content, services, steps): readable by everyone,
-- writable only by admins
create policy "site_content_public_read" on public.site_content
  for select using (true);
create policy "site_content_admin_write" on public.site_content
  for update using (public.is_admin());

create policy "services_public_read" on public.services
  for select using (true);
create policy "services_admin_write" on public.services
  for all using (public.is_admin()) with check (public.is_admin());

create policy "steps_public_read" on public.how_it_works_steps
  for select using (true);
create policy "steps_admin_write" on public.how_it_works_steps
  for all using (public.is_admin()) with check (public.is_admin());

-- Vehicles: public can read only via the verification view (granted below);
-- raw table read/write restricted to the owning driver or admin
create policy "vehicles_owner_or_admin_read" on public.vehicles
  for select using (driver_id = auth.uid() or public.is_admin());
create policy "vehicles_owner_insert" on public.vehicles
  for insert with check (driver_id = auth.uid() or public.is_admin());
create policy "vehicles_owner_or_admin_update" on public.vehicles
  for update using (driver_id = auth.uid() or public.is_admin());

-- The verification view is intentionally exposed for public lookup by
-- vehicle number (no sensitive PII beyond what the portal is required to show)
grant select on public.vehicle_verification_view to anon, authenticated;

-- Loads: merchants manage their own; drivers can see all "open" loads;
-- admin sees everything
create policy "loads_merchant_all" on public.loads
  for all using (merchant_id = auth.uid() or public.is_admin())
  with check (merchant_id = auth.uid() or public.is_admin());
create policy "loads_driver_read_open" on public.loads
  for select using (status = 'open' or merchant_id = auth.uid() or public.is_admin());

-- Bids: drivers manage their own bids; merchants read bids on their loads
create policy "bids_driver_all" on public.bids
  for all using (driver_id = auth.uid() or public.is_admin())
  with check (driver_id = auth.uid() or public.is_admin());
create policy "bids_merchant_read" on public.bids
  for select using (
    exists (select 1 from public.loads l where l.id = load_id and l.merchant_id = auth.uid())
    or public.is_admin()
  );

-- Biltys: visible to the merchant who owns the load and the assigned driver
create policy "biltys_read" on public.biltys
  for select using (
    exists (
      select 1 from public.loads l
      join public.vehicles v on v.id = l.assigned_vehicle_id
      where l.id = load_id and (l.merchant_id = auth.uid() or v.driver_id = auth.uid())
    ) or public.is_admin()
  );

-- ============================================================================
-- SEED DATA (Our Services + How It Works — editable later via Admin CMS)
-- ============================================================================
insert into public.services (title, description, icon, sort_order) values
  ('Commodity Load Matching', 'Instantly match cotton, wheat, and rapeseed loads with verified nearby trucks.', 'package', 1),
  ('Real-Time Shipment Tracking', 'Track every consignment from pickup to delivery with live status updates.', 'map-pin', 2),
  ('Verified Driver Network', 'Every driver and vehicle is document-checked: CNIC, licence, and route permit.', 'shield-check', 3),
  ('Digital Bilty Generation', 'Auto-generated, tamper-proof digital biltys for every dispatched shipment.', 'file-text', 4)
on conflict do nothing;

insert into public.how_it_works_steps (step_number, title, description, sort_order) values
  (1, 'Post Your Load', 'Merchants post commodity details, quantity in munds, pickup and drop-off points.', 1),
  (2, 'Get Matched & Verified', 'Verified nearby drivers bid on the load; merchants confirm vehicle legal status.', 2),
  (3, 'Dispatch & Track', 'Goods move with a digital bilty while both sides track the trip in real time.', 3)
on conflict do nothing;
