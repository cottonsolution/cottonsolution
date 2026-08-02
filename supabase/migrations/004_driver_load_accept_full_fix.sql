-- ============================================================================
-- MIGRATION 004 — DRIVER LOAD ACCEPT: FULL FIX (READ + WRITE)
-- Run this in Supabase Studio -> SQL Editor. Safe to run even if migration
-- 003 was already applied — every statement uses DROP POLICY IF EXISTS first.
--
-- This supersedes 003. It fixes TWO separate RLS gaps:
--
-- 1. WRITE (the "Could not accept this load: new row violates row-level
--    security policy" error you're seeing): drivers had no UPDATE policy on
--    public.loads at all, so accepting a load was always rejected.
--
-- 2. READ (a second, previously-hidden bug): even once the write is allowed,
--    drivers still had no SELECT policy covering a load once its status
--    moves past "open" (i.e. after being accepted). Without this, "My
--    Trips" and the Work Mode tracking bar would look empty even though the
--    accept succeeded, and the app's own "did this actually update?" check
--    (added for error-visibility) would wrongly report "someone else
--    accepted this load first".
-- ============================================================================

-- 1) READ: a driver can see a load once it's assigned to one of their own
--    vehicles, regardless of status (open / assigned / in_transit / delivered).
drop policy if exists "loads_driver_read_assigned" on public.loads;
create policy "loads_driver_read_assigned" on public.loads
  for select using (
    assigned_vehicle_id in (select id from public.vehicles where driver_id = auth.uid())
  );

-- 2) WRITE: a driver can accept an "open" load, and can progress the 8-step
--    trip tracker on a load already assigned to their own vehicle — but can
--    never assign a load to a vehicle they don't own.
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
-- End of migration 004
-- ============================================================================
