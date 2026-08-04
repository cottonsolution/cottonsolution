-- ============================================================================
-- MIGRATION 008 — WEIGHMENT SLIP APPROVE / REQUEST RESUBMIT
-- Run this in Supabase Studio -> SQL Editor after 002-007. Safe to re-run.
--
-- Adds the missing "Approve" / "Request Resubmit" step for the merchant when
-- reviewing the driver's weighment slip during Documentation. Previously the
-- Bilty form appeared the instant a slip was uploaded, with no way for the
-- merchant to reject a bad/illegible photo and ask the driver to re-upload.
--
-- No new RLS policy is needed: these are new columns on public.loads, and
-- both the merchant ("loads_merchant_all") and the driver
-- ("loads_driver_accept_and_progress") already have UPDATE access to their
-- own loads from earlier migrations.
-- ============================================================================

alter table public.loads add column if not exists weighment_slip_status text;
alter table public.loads add column if not exists weighment_slip_note   text;

alter table public.loads drop constraint if exists loads_weighment_slip_status_check;
alter table public.loads add constraint loads_weighment_slip_status_check
  check (weighment_slip_status is null or weighment_slip_status in ('pending', 'approved', 'resubmit_requested'));

-- Backfill: any load that already has a slip uploaded (from before this
-- migration existed) is treated as "pending" review so it shows up
-- correctly in the new Approve / Request Resubmit UI.
update public.loads
  set weighment_slip_status = 'pending'
  where weighment_slip_url is not null and weighment_slip_status is null;

-- ============================================================================
-- End of migration 008
-- ============================================================================
