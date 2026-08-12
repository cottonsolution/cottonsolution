-- ============================================================================
-- 012_account_verification_status.sql
-- Adds the admin approval-workflow column powering the new "Trucks/Drivers
-- Management" and "Merchants Management" grid-menu sections (All / New
-- Requests / Under Verification / Active / Unbilled / Banned-Rejected).
--
-- Kept deliberately separate from the existing `vehicles.status`
-- (active/suspended) column, which the public Vehicle Verification portal
-- and expiry-alert logic already depend on — nothing there changes.
-- Safe to re-run.
-- ============================================================================

alter table public.vehicles add column if not exists account_status text not null default 'new';
alter table public.vehicles drop constraint if exists vehicles_account_status_check;
alter table public.vehicles add constraint vehicles_account_status_check
  check (account_status in ('new', 'under_verification', 'active', 'unbilled', 'banned'));

alter table public.profiles add column if not exists account_status text not null default 'new';
alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles add constraint profiles_account_status_check
  check (account_status in ('new', 'under_verification', 'active', 'unbilled', 'banned'));

-- Backfill: don't lock out anyone already using the platform today — every
-- account that existed before this migration is treated as already active.
update public.profiles set account_status = 'active';
update public.vehicles set account_status = 'active';

-- Admin needs to update OTHER people's profile rows (approve/ban a merchant)
-- — the existing "profiles_update_own" policy only ever allowed a person to
-- update their own row, so there was no way for an admin to do this at all.
drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_admin_write" on public.profiles
  for update using (public.is_admin());
