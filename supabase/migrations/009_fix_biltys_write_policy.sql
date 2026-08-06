-- ============================================================================
-- MIGRATION 009 — FIX: BILTY SUBMIT DOESN'T WORK
-- Run this in Supabase Studio -> SQL Editor. Safe to run even if some of
-- this already exists (every statement uses IF NOT EXISTS / DROP...IF EXISTS).
--
-- ROOT CAUSE (confirmed from your diagnostic query): public.biltys only had
-- a SELECT policy ("biltys_read"). There was no UPDATE policy at all, so
-- when the merchant filled in the Bilty form and hit "Submit Bilty to
-- Driver", Postgres silently rejected the write — this is migration 005's
-- "biltys_merchant_write" policy, which never got applied to your database
-- (likely because 005 partially failed or wasn't run in full).
--
-- This migration only re-does the biltys-related pieces of 005, so it's
-- safe to run standalone without touching chat/push/vehicles/profiles,
-- which your diagnostic already shows are unaffected.
-- ============================================================================

-- These columns should already exist from migration 005, but are re-added
-- here defensively (IF NOT EXISTS = no-op if they're already there).
alter table public.biltys add column if not exists vehicle_no      text;
alter table public.biltys add column if not exists driver_name     text;
alter table public.biltys add column if not exists commodity       text;
alter table public.biltys add column if not exists quantity_text   text;
alter table public.biltys add column if not exists freight_rate    text;
alter table public.biltys add column if not exists from_location   text;
alter table public.biltys add column if not exists to_location     text;
alter table public.biltys add column if not exists status          text default 'draft';
alter table public.biltys add column if not exists submitted_at    timestamptz;

alter table public.biltys drop constraint if exists biltys_status_check;
alter table public.biltys add constraint biltys_status_check check (status in ('draft', 'submitted'));

-- THE ACTUAL FIX: the missing UPDATE policy.
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

-- ============================================================================
-- End of migration 009
-- ============================================================================
