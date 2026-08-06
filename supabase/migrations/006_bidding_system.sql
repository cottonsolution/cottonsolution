-- ============================================================================
-- 006 — inDrive-STYLE BIDDING SYSTEM (Distance/Fare, Merchant Bid Review,
--        Call Integration support)
-- Run this in Supabase Studio -> SQL Editor AFTER 002/003/004/005.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR
-- REPLACE throughout).
--
-- The `public.bids` table + its base RLS policies (`bids_driver_all`,
-- `bids_merchant_read`) already exist in schema.sql — this migration adds
-- everything needed to turn that table into a full merchant-facing bid
-- review + accept workflow:
--   1. loads.distance_km            — stores the auto-calculated route km
--   2. bids.updated_at              — so the UI can show "x minutes ago"
--   3. RLS: merchant can read the vehicle + driver profile behind a bid
--      on their own load (needed to show driver name / truck / phone
--      BEFORE the load is assigned to them)
--   4. RLS: merchant can manually reject a single bid without accepting
--      another one yet
--   5. accept_bid(p_bid_id) RPC — atomically accepts one bid, rejects every
--      other pending bid on that load, and assigns the load to the winning
--      driver's vehicle. Security-definer so it can safely touch three
--      tables (bids/loads) in one transaction under the merchant's RLS
--      identity, exactly like the existing `generate_bilty` / `is_admin`
--      pattern already used in this project.
--   6. Realtime: adds `bids` to the supabase_realtime publication so the
--      driver load board and the merchant Bid Review panel update live.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. LOADS — store the computed route distance (km) at posting time
-- ----------------------------------------------------------------------------
alter table public.loads add column if not exists distance_km numeric;

-- ----------------------------------------------------------------------------
-- 2. BIDS — updated_at for "x minutes ago" freshness in the bid list
-- ----------------------------------------------------------------------------
alter table public.bids add column if not exists updated_at timestamptz default now();

create or replace function public.touch_bid_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_bid_updated on public.bids;
create trigger on_bid_updated
  before update on public.bids
  for each row execute procedure public.touch_bid_updated_at();

-- ----------------------------------------------------------------------------
-- 3. RLS — a merchant needs to see the *bidding* driver's vehicle + profile
--    (name, phone) before the load is assigned to them, so the Bid Review
--    panel can render "Ali Transport — 10 Wheeler — 0300-1234567 — PKR 9,500".
--    The existing vehicles/profiles policies only cover an *already
--    assigned* vehicle, which is too late for bid review.
-- ----------------------------------------------------------------------------
drop policy if exists "vehicles_merchant_read_bidders" on public.vehicles;
create policy "vehicles_merchant_read_bidders" on public.vehicles
  for select using (
    id in (
      select b.vehicle_id from public.bids b
      join public.loads l on l.id = b.load_id
      where l.merchant_id = auth.uid()
    )
  );

drop policy if exists "profiles_merchant_read_bidders" on public.profiles;
create policy "profiles_merchant_read_bidders" on public.profiles
  for select using (
    id in (
      select b.driver_id from public.bids b
      join public.loads l on l.id = b.load_id
      where l.merchant_id = auth.uid()
    )
  );

-- A driver should also be able to see the merchant's name/phone for a load
-- they've bid on (not just after being assigned) — helpful before calling
-- to confirm details.
drop policy if exists "profiles_driver_read_load_owner" on public.profiles;
create policy "profiles_driver_read_load_owner" on public.profiles
  for select using (
    id in (
      select l.merchant_id from public.loads l
      join public.bids b on b.load_id = l.id
      join public.vehicles v on v.id = b.vehicle_id
      where v.driver_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 4. RLS — merchant can explicitly reject a single pending bid (independent
--    of accepting another one). Deliberately narrow: the CHECK clause only
--    ever allows the new status to be 'rejected' — accepting must go
--    through the accept_bid() RPC below so the load-assignment side effect
--    always happens atomically together with rejecting the other bids.
-- ----------------------------------------------------------------------------
drop policy if exists "bids_merchant_reject" on public.bids;
create policy "bids_merchant_reject" on public.bids
  for update using (
    exists (select 1 from public.loads l where l.id = load_id and l.merchant_id = auth.uid())
  )
  with check (
    status = 'rejected'
    and exists (select 1 from public.loads l where l.id = load_id and l.merchant_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 5. accept_bid(p_bid_id) — the "Accept Bid" button's backend. Runs as one
--    atomic transaction:
--      a) verifies the caller owns the load the bid belongs to (or is admin)
--      b) verifies the load is still "open" (can't double-assign)
--      c) marks the chosen bid 'accepted'
--      d) marks every other pending bid on that load 'rejected'
--      e) assigns the load to the winning bid's vehicle, moves it to
--         trip_stage 1 ("Load Accepted") — identical to what the existing
--         driver-side "Accept" button does, so the rest of the trip
--         tracking / bilty-generation trigger keeps working unchanged.
-- ----------------------------------------------------------------------------
create or replace function public.accept_bid(p_bid_id uuid)
returns public.loads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bid    public.bids;
  v_load   public.loads;
begin
  select * into v_bid from public.bids where id = p_bid_id;
  if v_bid.id is null then
    raise exception 'Bid not found';
  end if;

  select * into v_load from public.loads where id = v_bid.load_id;
  if v_load.id is null then
    raise exception 'Load not found';
  end if;

  if v_load.merchant_id <> auth.uid() and not public.is_admin() then
    raise exception 'Not authorized to accept this bid';
  end if;

  if v_load.status <> 'open' then
    raise exception 'This load is no longer open — it may already be assigned';
  end if;

  update public.bids set status = 'accepted' where id = p_bid_id;

  update public.bids
  set status = 'rejected'
  where load_id = v_load.id and id <> p_bid_id and status = 'pending';

  update public.loads
  set status = 'assigned',
      trip_stage = 1,
      assigned_vehicle_id = v_bid.vehicle_id
  where id = v_load.id and status = 'open'
  returning * into v_load;

  if v_load.id is null then
    raise exception 'This load was just assigned by someone else — please refresh.';
  end if;

  return v_load;
end;
$$;

grant execute on function public.accept_bid(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. REALTIME — bids need to stream live to both the driver load board (so
--    a driver sees their bid flip to Accepted/Rejected instantly) and the
--    merchant Bid Review panel (so new counter-offers appear without a
--    manual refresh).
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bids'
  ) then
    alter publication supabase_realtime add table public.bids;
  end if;
end $$;

-- ============================================================================
-- End of migration 006
-- ============================================================================
