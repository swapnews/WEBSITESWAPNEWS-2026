-- Instagram Reels manager. Run after 006_content_management.sql.
create table if not exists public.social_reels (
  id uuid primary key default gen_random_uuid(),
  instagram_url text not null,
  embed_url text not null unique check (embed_url ~ '^https://www\.instagram\.com/(reel|p)/[A-Za-z0-9_-]+/embed/$'),
  title text not null,
  caption text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_reels_active_order_idx on public.social_reels(is_active, sort_order, created_at desc);
alter table public.social_reels enable row level security;

drop policy if exists "Public read active social reels" on public.social_reels;
create policy "Public read active social reels" on public.social_reels
for select using (is_active or public.is_super_admin());

drop policy if exists "Super admins manage social reels" on public.social_reels;
create policy "Super admins manage social reels" on public.social_reels
for all using (public.is_super_admin()) with check (public.is_super_admin());

drop trigger if exists social_reels_set_updated_at on public.social_reels;
create trigger social_reels_set_updated_at before update on public.social_reels
for each row execute function public.set_updated_at();
