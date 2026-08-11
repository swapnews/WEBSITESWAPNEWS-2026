-- Content management: static pages + super-admin category governance.
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  excerpt text,
  content text not null default '',
  featured_media_id uuid references public.media_assets(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','published')),
  focus_keyword text,
  seo_title text,
  meta_description text,
  tags text[] not null default '{}',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pages_status_published_idx on public.pages(status, published_at desc);
create index if not exists pages_author_idx on public.pages(author_id, updated_at desc);

alter table public.pages enable row level security;

drop policy if exists "Public read published pages" on public.pages;
create policy "Public read published pages" on public.pages
for select using (status = 'published' or public.is_super_admin());

drop policy if exists "Super admins manage pages" on public.pages;
create policy "Super admins manage pages" on public.pages
for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Categories remain publicly readable; all mutations require super admin.
alter table public.categories enable row level security;
drop policy if exists "Editorial manage categories" on public.categories;
drop policy if exists "Admins manage categories" on public.categories;
drop policy if exists "Super admins manage categories" on public.categories;
create policy "Super admins manage categories" on public.categories
for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Keep updated_at trustworthy.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pages_set_updated_at on public.pages;
create trigger pages_set_updated_at before update on public.pages
for each row execute function public.set_updated_at();
