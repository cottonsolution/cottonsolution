-- ============================================================================
-- MIGRATION 003 — FIX: DRIVER CAN'T ACCEPT LOADS
-- Run this in Supabase Studio -> SQL Editor (or `supabase db push`). Safe to
-- re-run.
--
-- ROOT CAUSE: public.loads had Row Level Security enabled, but the only
-- write policy was "loads_merchant_all" (merchant_id = auth.uid()). Drivers
-- only had a SELECT policy ("loads_driver_read_open"). So whenever the
-- driver app tried to accept a load — i.e.
--   update loads set status='assigned', assigned_vehicle_id=<their vehicle>
-- — Postgres silently rejected the write (RLS filters it out, no error is
-- thrown, 0 rows change). The UI had no error to show, so it looked like
-- "Accept" just did nothing.
--
-- FIX: add an UPDATE policy that lets an authenticated driver update a load
-- when either:
--   (a) the load is currently "open" (i.e. they're accepting it), or
--   (b) the load is already assigned to one of their own vehicles
--       (i.e. they're advancing the 8-step trip tracker),
-- and only ever lets them set assigned_vehicle_id to a vehicle they own
-- (so a driver can never hijack another driver's assigned load).
-- ============================================================================

drop policy if exists "loads_driver_accept_and_progress" on public.loads;
create policy "loads_driver_accept_and_progress" on public.loads
  for update
  using (
    status = 'open'
    or assigned_vehicle_id in (select id from public.vehicles where driver_id = auth.uid())
  )
  with check (
    assigned_vehicle_id in (select id from public.vehicles where driver_id = auth.uid())
  );

-- ============================================================================
-- End of migration 003
-- ============================================================================
