-- ============================================================================
-- MIGRATION 010 — IN-APP NOTIFICATIONS (bell icon feed)
-- Run this in Supabase Studio -> SQL Editor after 002-009. Safe to re-run.
--
-- This is purely additive: a new table + policies. It doesn't touch any
-- existing table, column, function, or RLS policy, so nothing that already
-- works changes behaviour.
--
-- `lib/pushClient.js`'s `triggerPush()` (already called from every important
-- action in the app — bid placed, load accepted, slip uploaded/approved,
-- Bilty ready, on the way, reached destination, delivery approved) now also
-- writes a row here, so the same events that ring a background push also
-- show up in the in-app notification bell — no new call sites needed
-- anywhere else in the app.
-- ============================================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  load_id     uuid references public.loads(id) on delete set null,
  title       text not null,
  body        text,
  url         text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "notifications_mark_read_own" on public.notifications;
create policy "notifications_mark_read_own" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Any signed-in user can create a notification FOR someone else (e.g. a
-- driver's action notifies the merchant, and vice-versa) — this table only
-- holds informational text, so it's safe to allow.
drop policy if exists "notifications_insert_any" on public.notifications;
create policy "notifications_insert_any" on public.notifications
  for insert with check (auth.uid() is not null);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ============================================================================
-- End of migration 010
-- ============================================================================
