-- ============================================================================
-- 007 — FIX: infinite recursion in RLS caused by migration 006's bidding
--        policies.
-- Run this in Supabase Studio -> SQL Editor AFTER 006.
-- Safe to re-run (uses CREATE OR REPLACE / DROP POLICY IF EXISTS throughout).
--
-- ROOT CAUSE
-- ----------
-- Migration 006 added three policies that directly joined across tables:
--   profiles_merchant_read_bidders  -> queries bids + loads
--   vehicles_merchant_read_bidders  -> queries bids + loads
--   profiles_driver_read_load_owner -> queries loads + bids + vehicles
--
-- The pre-existing "loads_driver_read_assigned" policy already queried
-- vehicles, and bids_merchant_read already queried loads. Because a
-- sub-select inside an RLS policy is evaluated under the SAME querying
-- role (so it re-triggers RLS on the tables it touches), this created a
-- cycle:
--   profiles -> bids -> loads -> vehicles -> bids -> loads -> vehicles -> ...
-- Postgres detects this and aborts with "infinite recursion detected in
-- policy for relation ...", which breaks the profile fetch on login (not
-- just the bidding feature, since profiles is read on every login).
--
-- FIX
-- ---
-- Same trick already used for is_admin() in schema.sql: move the
-- cross-table lookup into a SECURITY DEFINER function. Such a function
-- runs with the privileges of its owner (the table owner in Supabase),
-- which bypasses RLS entirely for the queries INSIDE the function. That
-- breaks the cycle because the lookup no longer re-triggers policies on
-- bids/loads/vehicles.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (security definer -> bypass RLS internally, no recursion)
-- ----------------------------------------------------------------------------

-- Does p_driver_id have a bid on a load owned by the calling merchant?
create or replace function public.driver_has_bid_on_my_load(p_driver_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.bids b
    join public.loads l on l.id = b.load_id
    where l.merchant_id = auth.uid()
      and b.driver_id = p_driver_id
  );
$$;

-- Is p_vehicle_id the vehicle behind a bid on a load owned by the calling merchant?
create or replace function public.vehicle_has_bid_on_my_load(p_vehicle_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.bids b
    join public.loads l on l.id = b.load_id
    where l.merchant_id = auth.uid()
      and b.vehicle_id = p_vehicle_id
  );
$$;

-- Does the calling driver (via one of their vehicles) have a bid on a load
-- owned by p_merchant_id?
create or replace function public.i_bid_on_merchant_load(p_merchant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.loads l
    join public.bids b on b.load_id = l.id
    join public.vehicles v on v.id = b.vehicle_id
    where l.merchant_id = p_merchant_id
      and v.driver_id = auth.uid()
  );
$$;

grant execute on function public.driver_has_bid_on_my_load(uuid) to authenticated;
grant execute on function public.vehicle_has_bid_on_my_load(uuid) to authenticated;
grant execute on function public.i_bid_on_merchant_load(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Recreate the 006 policies to call the helper functions instead of joining
-- across tables inline. Same access rules, no recursion.
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_merchant_read_bidders" on public.profiles;
create policy "profiles_merchant_read_bidders" on public.profiles
  for select using ( public.driver_has_bid_on_my_load(id) );

drop policy if exists "vehicles_merchant_read_bidders" on public.vehicles;
create policy "vehicles_merchant_read_bidders" on public.vehicles
  for select using ( public.vehicle_has_bid_on_my_load(id) );

drop policy if exists "profiles_driver_read_load_owner" on public.profiles;
create policy "profiles_driver_read_load_owner" on public.profiles
  for select using ( public.i_bid_on_merchant_load(id) );

-- ============================================================================
-- End of migration 007
-- ============================================================================
