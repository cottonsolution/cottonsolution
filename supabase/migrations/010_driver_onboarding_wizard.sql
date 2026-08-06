-- ============================================================================
-- 010_driver_onboarding_wizard.sql
-- Adds the profile-completion gate + the richer fields collected by the new
-- multi-step Driver onboarding wizard (replaces the old /register form).
-- Safe to re-run.
-- ============================================================================

-- 1. Profile-completion gate (applies to all roles: driver, merchant, admin)
alter table public.profiles add column if not exists is_profile_completed boolean not null default false;

-- 2. Route Permit is no longer collected at registration time (per product
-- decision — will be added back separately later), so it can no longer be
-- required at insert time.
alter table public.vehicles alter column permit_no drop not null;
alter table public.vehicles alter column permit_expiry drop not null;

-- 3. New fields collected by the onboarding wizard
alter table public.vehicles add column if not exists father_name text;
alter table public.vehicles add column if not exists date_of_birth date;
alter table public.vehicles add column if not exists cnic_issue_date date;
alter table public.vehicles add column if not exists present_address text;
alter table public.vehicles add column if not exists permanent_address text;
alter table public.vehicles add column if not exists cnic_front_image_url text;
alter table public.vehicles add column if not exists cnic_back_image_url text;
alter table public.vehicles add column if not exists license_holder_name text;
alter table public.vehicles add column if not exists truck_model text;

-- 4. Backfill so EXISTING accounts aren't suddenly locked out of their
-- dashboards the moment this ships:
--   - Admins never need onboarding.
--   - Merchants who already filled their business fields at signup are
--     considered complete (their onboarding today just confirms those fields).
--   - Drivers who already have a vehicle registered under the old /register
--     flow are considered complete (they already did the equivalent work).
update public.profiles set is_profile_completed = true where role = 'admin';

update public.profiles p
set is_profile_completed = true
where p.role = 'merchant' and p.company_name is not null and p.company_name <> '';

update public.profiles p
set is_profile_completed = true
where p.role = 'driver'
  and exists (select 1 from public.vehicles v where v.driver_id = p.id);

-- 5. Vehicle Verification view — recreated so a missing (now-optional) route
-- permit shows "Not Provided" instead of the misleading "Valid", and the
-- truck model is exposed alongside vehicle type.
drop view if exists public.vehicle_verification_view;

create view public.vehicle_verification_view as
select
  vehicle_no,
  vehicle_type,
  truck_model,
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
  case when permit_expiry is null then 'Not Provided'
       when permit_expiry < current_date then 'Expired'
       when permit_expiry < current_date + interval '30 days' then 'Expiring Soon'
       else 'Valid' end as permit_status,
  status
from public.vehicles;

grant select on public.vehicle_verification_view to anon, authenticated;
