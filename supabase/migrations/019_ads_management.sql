-- Ads Management: upgrade legacy UUID inventory into 10 managed canonical slots.
-- Legacy rows stay stored but are disabled and excluded from public reads.
create table if not exists public.ad_slots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text not null default '',
  embed_code text not null default '',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ad_slots
  add column if not exists slot_key text,
  add column if not exists placement text,
  add column if not exists desktop_width smallint,
  add column if not exists desktop_height smallint,
  add column if not exists mobile_width smallint,
  add column if not exists mobile_height smallint,
  add column if not exists content_type text not null default 'html',
  add column if not exists html_content text not null default '',
  add column if not exists youtube_url text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

-- Legacy schema requires embed_code, while managed slots store material in html_content.
alter table public.ad_slots
  alter column embed_code set default '';

-- Preserve legacy material for operators, but never serve unmapped rows publicly.
update public.ad_slots
set html_content = embed_code
where slot_key is null and html_content = '' and embed_code <> '';

update public.ad_slots
set placement = coalesce(placement, nullif(position, ''), name),
    is_active = false
where slot_key is null;

alter table public.ad_slots drop constraint if exists ad_slots_name_key;
alter table public.ad_slots drop constraint if exists ad_slots_slot_key_valid;
alter table public.ad_slots drop constraint if exists ad_slots_dimensions_valid;
alter table public.ad_slots drop constraint if exists ad_slots_content_type_valid;
alter table public.ad_slots drop constraint if exists ad_slots_html_length;
alter table public.ad_slots drop constraint if exists ad_slots_youtube_length;
alter table public.ad_slots drop constraint if exists ad_slots_schedule_valid;
alter table public.ad_slots drop constraint if exists ad_slots_active_content_valid;

alter table public.ad_slots
  add constraint ad_slots_slot_key_valid check (slot_key is null or slot_key in (
    'global_header_leaderboard',
    'home_after_hero_billboard',
    'home_sidebar_rectangle',
    'home_after_topics_leaderboard',
    'home_midfeed_billboard',
    'article_top_leaderboard',
    'article_inline_rectangle',
    'article_sidebar_halfpage',
    'article_bottom_leaderboard',
    'global_footer_leaderboard'
  )),
  add constraint ad_slots_dimensions_valid check (
    slot_key is null or (
      desktop_width between 250 and 1200
      and desktop_height between 50 and 800
      and mobile_width between 250 and 400
      and mobile_height between 50 and 600
    )
  ),
  add constraint ad_slots_content_type_valid check (content_type in ('html', 'youtube')),
  add constraint ad_slots_html_length check (char_length(html_content) <= 50000),
  add constraint ad_slots_youtube_length check (youtube_url is null or char_length(youtube_url) <= 500),
  add constraint ad_slots_schedule_valid check (ends_at is null or starts_at is null or ends_at > starts_at),
  add constraint ad_slots_active_content_valid check (
    slot_key is null
    or not is_active
    or (content_type = 'html' and char_length(trim(html_content)) > 0)
    or (content_type = 'youtube' and youtube_url is not null and char_length(trim(youtube_url)) > 0)
  );

create unique index if not exists ad_slots_slot_key_unique_idx
on public.ad_slots (slot_key) where slot_key is not null;

insert into public.ad_slots (
  slot_key, name, position, placement,
  desktop_width, desktop_height, mobile_width, mobile_height,
  content_type, html_content, is_active
) values
  ('global_header_leaderboard', 'Header Leaderboard', 'global_header_leaderboard', 'Header portal publik', 970, 90, 320, 100, 'html', '', false),
  ('home_after_hero_billboard', 'Homepage Hero Billboard', 'home_after_hero_billboard', 'Homepage setelah hero', 970, 250, 320, 100, 'html', '', false),
  ('home_sidebar_rectangle', 'Homepage Sidebar Rectangle', 'home_sidebar_rectangle', 'Sidebar terpopuler homepage', 300, 250, 300, 250, 'html', '', false),
  ('home_after_topics_leaderboard', 'Homepage Topics Leaderboard', 'home_after_topics_leaderboard', 'Homepage setelah topik', 728, 90, 320, 100, 'html', '', false),
  ('home_midfeed_billboard', 'Homepage Mid-feed Billboard', 'home_midfeed_billboard', 'Tengah feed homepage', 970, 250, 320, 100, 'html', '', false),
  ('article_top_leaderboard', 'Article Top Leaderboard', 'article_top_leaderboard', 'Artikel sebelum isi', 728, 90, 320, 100, 'html', '', false),
  ('article_inline_rectangle', 'Article Inline Rectangle', 'article_inline_rectangle', 'Artikel setelah paragraf terpilih', 336, 280, 300, 250, 'html', '', false),
  ('article_sidebar_halfpage', 'Article Sidebar Half-page', 'article_sidebar_halfpage', 'Sidebar artikel', 300, 600, 300, 250, 'html', '', false),
  ('article_bottom_leaderboard', 'Article Bottom Leaderboard', 'article_bottom_leaderboard', 'Artikel setelah isi', 728, 90, 320, 100, 'html', '', false),
  ('global_footer_leaderboard', 'Footer Leaderboard', 'global_footer_leaderboard', 'Sebelum footer publik', 970, 90, 320, 100, 'html', '', false)
on conflict (slot_key) where slot_key is not null do update set
  name = excluded.name,
  position = excluded.position,
  placement = excluded.placement,
  desktop_width = excluded.desktop_width,
  desktop_height = excluded.desktop_height,
  mobile_width = excluded.mobile_width,
  mobile_height = excluded.mobile_height;

create index if not exists ad_slots_public_schedule_idx
on public.ad_slots (is_active, starts_at, ends_at)
where is_active = true and slot_key is not null;

drop trigger if exists ad_slots_set_updated_at on public.ad_slots;
create trigger ad_slots_set_updated_at
before update on public.ad_slots
for each row execute function public.set_updated_at();

alter table public.ad_slots enable row level security;

revoke all on table public.ad_slots from anon, authenticated;
grant select on table public.ad_slots to anon, authenticated;
grant update (
  content_type, html_content, youtube_url, is_active, starts_at, ends_at, updated_by
) on table public.ad_slots to authenticated;

drop policy if exists "Public read active ad slots" on public.ad_slots;
drop policy if exists "Super admins manage ad slots" on public.ad_slots;
drop policy if exists "Public read live ad slots" on public.ad_slots;
drop policy if exists "Super admins read all ad slots" on public.ad_slots;
drop policy if exists "Super admins update ad slots" on public.ad_slots;

create policy "Public read live ad slots"
on public.ad_slots for select
using (
  slot_key is not null
  and is_active
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);

create policy "Super admins read all ad slots"
on public.ad_slots for select
using (public.is_super_admin());

create policy "Super admins update ad slots"
on public.ad_slots for update
using (slot_key is not null and public.is_super_admin())
with check (slot_key is not null and public.is_super_admin());
