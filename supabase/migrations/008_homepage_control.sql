-- Homepage Control Center and scheduled breaking news.
-- Run after 007_social_reels.sql.
create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique check (section_key ~ '^[a-z0-9_-]+$'),
  title text not null,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  style_variant text not null default 'default',
  category_slug text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.breaking_news (
  id uuid primary key default gen_random_uuid(),
  headline text not null check (char_length(headline) between 5 and 180),
  target_url text not null default '/',
  priority integer not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (target_url ~ '^(/|https://)')
);

insert into public.homepage_sections(section_key,title,is_enabled,sort_order,style_variant,category_slug) values
 ('topics','Pilihan Kanal',true,10,'compact',null),
 ('reels','Reels Pilihan',true,20,'carousel',null),
 ('games','Games Arena',true,30,'arena','games'),
 ('sports','Sports Focus',true,40,'scoreboard','sport'),
 ('bali','Bali Kini',true,50,'mosaic','bali'),
 ('latest','Berita Terkini',true,60,'editorial',null)
on conflict (section_key) do nothing;

create index if not exists homepage_sections_order_idx on public.homepage_sections(is_enabled,sort_order);
create index if not exists breaking_news_schedule_idx on public.breaking_news(is_active,starts_at,ends_at,priority desc);

alter table public.homepage_sections enable row level security;
alter table public.breaking_news enable row level security;

create policy "Public read homepage sections" on public.homepage_sections for select using (true);
create policy "Super admins manage homepage sections" on public.homepage_sections for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy "Public read breaking news" on public.breaking_news for select using (is_active and starts_at <= now() and (ends_at is null or ends_at > now()));
create policy "Super admins manage breaking news" on public.breaking_news for all using (public.is_super_admin()) with check (public.is_super_admin());

create trigger homepage_sections_set_updated_at before update on public.homepage_sections for each row execute function public.set_updated_at();
create trigger breaking_news_set_updated_at before update on public.breaking_news for each row execute function public.set_updated_at();
