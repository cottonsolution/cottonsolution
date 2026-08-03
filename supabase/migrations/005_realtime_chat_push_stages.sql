-- ============================================================================
-- 005 — REALTIME CHAT + PUSH ALERTS + 6-STEP TRIP TRACKING + DOCUMENTATION/
--        BILTY APPROVAL WORKFLOW
-- Run this in Supabase Studio -> SQL Editor AFTER 002/003/004.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TRIP STAGES: 8 steps -> 6 steps
--    Old:  1 Load Accepted, 2 Loading, 3 Documentation, 4 On the Way,
--          5 Reached, 6 Unloading, 7 Unloaded, 8 Rent Received
--    New:  0 Waiting for Truck, 1 Load Accepted, 2 Documentation,
--          3 On the Way, 4 Reached Destination, 5 Rent Received
--    ("Loading" folds into "Load Accepted"; "Unloading"/"Unloaded" are
--    dropped — the driver now goes straight from On the Way to Reached.)
-- ----------------------------------------------------------------------------
alter table public.loads drop constraint if exists loads_trip_stage_check;

update public.loads set trip_stage = case
  when trip_stage is null or trip_stage <= 0 then 0
  when trip_stage = 1 then 1  -- Load Accepted        -> Load Accepted
  when trip_stage = 2 then 1  -- Loading               -> Load Accepted
  when trip_stage = 3 then 2  -- Documentation         -> Documentation
  when trip_stage = 4 then 3  -- On the Way            -> On the Way
  when trip_stage = 5 then 4  -- Reached at Destination-> Reached Destination
  when trip_stage = 6 then 4  -- Unloading             -> Reached Destination
  when trip_stage = 7 then 4  -- Unloaded              -> Reached Destination
  when trip_stage = 8 then 5  -- Rent Received         -> Rent Received
  else least(trip_stage, 5)
end
where trip_stage is not null;

alter table public.loads add constraint loads_trip_stage_check check (trip_stage between 0 and 5);

-- Documentation step: driver uploads the weighment slip ("kande ki parchi"),
-- merchant reviews it before filling in the Bilty.
alter table public.loads add column if not exists weighment_slip_url text;

-- On the Way -> Reached Destination: driver uploads a proof-of-arrival photo.
alter table public.loads add column if not exists delivery_proof_url text;

-- Gate: the "Rent Received" step stays locked for the driver until the
-- merchant explicitly approves the arrival proof.
alter table public.loads add column if not exists merchant_approved_at timestamptz;

-- Pre-existing gap fixed here: merchants render vehicle/driver details (and
-- now also live-track GPS + read driver_id for approvals) on their Active
-- Shipments cards, but `vehicles` was only readable by its own driver or an
-- admin — a merchant had no RLS path to their assigned truck's row at all.
drop policy if exists "vehicles_merchant_read_assigned" on public.vehicles;
create policy "vehicles_merchant_read_assigned" on public.vehicles
  for select using (
    id in (select assigned_vehicle_id from public.loads where merchant_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 2. BILTYS — extend from "auto-generated number only" to a full document the
--    merchant fills in and submits during the Documentation step; the driver
--    can then view / download / print it.
-- ----------------------------------------------------------------------------
alter table public.biltys add column if not exists vehicle_no      text;
alter table public.biltys add column if not exists driver_name     text;
alter table public.biltys add column if not exists commodity       text;
alter table public.biltys add column if not exists quantity_text   text;
alter table public.biltys add column if not exists freight_rate    text;
alter table public.biltys add column if not exists from_location   text;
alter table public.biltys add column if not exists to_location     text;
alter table public.biltys add column if not exists status          text default 'draft';
alter table public.biltys drop constraint if exists biltys_status_check;
alter table public.biltys add constraint biltys_status_check check (status in ('draft', 'submitted'));
alter table public.biltys add column if not exists submitted_at    timestamptz;

-- Merchants need write access to fill in + submit the bilty for their own
-- loads (previously biltys only had a read policy — the row was written once
-- by the security-definer trigger and never touched again).
drop policy if exists "biltys_merchant_write" on public.biltys;
create policy "biltys_merchant_write" on public.biltys
  for update using (
    exists (select 1 from public.loads l where l.id = load_id and l.merchant_id = auth.uid())
    or public.is_admin()
  )
  with check (
    exists (select 1 from public.loads l where l.id = load_id and l.merchant_id = auth.uid())
    or public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- 3. MESSAGES — one table powers both "general chat" (load_id is null,
--    direct between sender_id/receiver_id) and "per-shipment chat" (load_id
--    set, visible to that load's merchant + assigned driver + any admin).
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  load_id      uuid references public.loads (id) on delete cascade,
  sender_id    uuid not null references public.profiles (id) on delete cascade,
  receiver_id  uuid references public.profiles (id) on delete cascade,
  body         text not null,
  read_at      timestamptz,
  created_at   timestamptz default now()
);

create index if not exists idx_messages_load_id on public.messages (load_id);
create index if not exists idx_messages_participants on public.messages (sender_id, receiver_id);

alter table public.messages enable row level security;

drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select using (
    (
      load_id is not null and exists (
        select 1 from public.loads l
        left join public.vehicles v on v.id = l.assigned_vehicle_id
        where l.id = messages.load_id
          and (l.merchant_id = auth.uid() or v.driver_id = auth.uid())
      )
    )
    or (load_id is null and (sender_id = auth.uid() or receiver_id = auth.uid()))
    or public.is_admin()
  );

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and (
      (
        load_id is not null and exists (
          select 1 from public.loads l
          left join public.vehicles v on v.id = l.assigned_vehicle_id
          where l.id = messages.load_id
            and (l.merchant_id = auth.uid() or v.driver_id = auth.uid())
        )
      )
      or (load_id is null and receiver_id is not null)
      or public.is_admin()
    )
  );

drop policy if exists "messages_update_read" on public.messages;
create policy "messages_update_read" on public.messages
  for update using (receiver_id = auth.uid() or public.is_admin())
  with check (receiver_id = auth.uid() or public.is_admin());

-- Chat needs to show the other participant's name/phone. profiles only had
-- "read own row or admin" — extend it so a merchant/driver can read the
-- profile of (a) any admin (support contact) and (b) anyone they share a
-- load or an existing message thread with. Still no open directory browse.
drop policy if exists "profiles_public_admin_read" on public.profiles;
create policy "profiles_public_admin_read" on public.profiles
  for select using (role = 'admin');

drop policy if exists "profiles_read_related" on public.profiles;
create policy "profiles_read_related" on public.profiles
  for select using (
    exists (
      select 1 from public.loads l
      left join public.vehicles v on v.id = l.assigned_vehicle_id
      where (l.merchant_id = auth.uid() and v.driver_id = profiles.id)
         or (v.driver_id = auth.uid() and l.merchant_id = profiles.id)
    )
    or exists (
      select 1 from public.messages m
      where (m.sender_id = auth.uid() and m.receiver_id = profiles.id)
         or (m.receiver_id = auth.uid() and m.sender_id = profiles.id)
    )
  );

-- ----------------------------------------------------------------------------
-- 4. PUSH SUBSCRIPTIONS — Web Push endpoints so alerts (new load, load
--    accepted, new message, documentation ready, arrival, etc.) can reach a
--    driver/merchant even when the site tab is closed or the phone is
--    locked, not just while the dashboard is open in the foreground.
-- ----------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth_key    text not null,
  created_at  timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_owner" on public.push_subscriptions;
create policy "push_subscriptions_owner" on public.push_subscriptions
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. STORAGE — bucket for weighment-slip / arrival-proof photos
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('shipment-media', 'shipment-media', true)
on conflict (id) do nothing;

drop policy if exists "shipment_media_public_read" on storage.objects;
create policy "shipment_media_public_read" on storage.objects
  for select using (bucket_id = 'shipment-media');

drop policy if exists "shipment_media_authenticated_upload" on storage.objects;
create policy "shipment_media_authenticated_upload" on storage.objects
  for insert with check (bucket_id = 'shipment-media' and auth.role() = 'authenticated');

drop policy if exists "shipment_media_owner_or_admin_modify" on storage.objects;
create policy "shipment_media_owner_or_admin_modify" on storage.objects
  for update using (bucket_id = 'shipment-media' and (owner = auth.uid() or public.is_admin()));

drop policy if exists "shipment_media_owner_or_admin_delete" on storage.objects;
create policy "shipment_media_owner_or_admin_delete" on storage.objects
  for delete using (bucket_id = 'shipment-media' and (owner = auth.uid() or public.is_admin()));

-- ----------------------------------------------------------------------------
-- 6. REALTIME — add the new tables (and `vehicles`, for merchant-side live
--    GPS tracking on the On-the-Way step) to the realtime publication.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vehicles'
  ) then
    alter publication supabase_realtime add table public.vehicles;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'biltys'
  ) then
    alter publication supabase_realtime add table public.biltys;
  end if;
end $$;
