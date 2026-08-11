-- ============================================================================
-- MIGRATION 011 — VIDEO SLIDES FOR ALL 4 DASHBOARDS
-- Run this in Supabase Studio -> SQL Editor. Safe to re-run.
--
-- Reuses the existing `hero_slides` table (already supports image/video,
-- already has an Admin management UI, already renders on the public Home
-- page via <HeroSlider>) instead of creating a parallel table. Adds a
-- `section` column so the same mechanism can serve 4 separate slide decks:
-- 'home' (public Home page — existing behaviour, unchanged), 'admin',
-- 'driver', and 'merchant' (the 3 dashboards).
-- ============================================================================

alter table public.hero_slides add column if not exists section text not null default 'home';

alter table public.hero_slides drop constraint if exists hero_slides_section_check;
alter table public.hero_slides add constraint hero_slides_section_check
  check (section in ('home', 'admin', 'driver', 'merchant'));

create index if not exists hero_slides_section_idx on public.hero_slides (section, sort_order);

-- No RLS changes needed — "hero_slides_public_read" already allows anyone
-- (including logged-out visitors) to read every row regardless of section,
-- and "hero_slides_admin_write" already restricts changes to admins only.

-- ============================================================================
-- End of migration 011
-- ============================================================================
