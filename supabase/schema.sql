-- SwapNews core schema
-- Run in Supabase SQL Editor after enabling pgcrypto and pg_trgm.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type public.app_role as enum ('super_admin', 'admin', 'wartawan', 'visitor');
create type public.article_status as enum ('draft', 'in_review', 'revision', 'scheduled', 'published', 'rejected');
create type public.comment_status as enum ('pending', 'approved', 'rejected', 'spam');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  username text,
  ktp_url text,
  whatsapp text,
  instagram_handle text,
  address text,
  bio text,
  birth_date date,
  gender text,
  profession text,
  city text,
  province text,
  postal_code text,
  press_card_number text,
  wartawan_status text not null default 'none',
  role public.app_role not null default 'visitor',
  is_member boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_payout_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  payout_type text not null default 'bank' check (payout_type in ('bank', 'ewallet')),
  provider_name text not null,
  account_number text not null,
  account_holder text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  secure_url text not null,
  format text,
  width integer,
  height integer,
  bytes bigint,
  alt_text text not null default '',
  title text,
  caption text,
  credit text,
  focal_x numeric(5,4),
  focal_y numeric(5,4),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null default '',
  status public.article_status not null default 'draft',
  category_id bigint references public.categories(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete restrict,
  featured_media_id uuid references public.media_assets(id) on delete set null,
  published_at timestamptz,
  scheduled_at timestamptz,
  view_count integer not null default 182,
  reading_time_minutes integer not null default 1,
  is_exclusive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('indonesian', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('indonesian', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('indonesian', coalesce(content, '')), 'C')
  ) stored
);

create table public.article_media (
  article_id uuid not null references public.articles(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (article_id, media_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  guest_name text,
  guest_email text,
  content text not null,
  status public.comment_status not null default 'pending',
  parent_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index articles_status_idx on public.articles(status);
create index articles_published_at_idx on public.articles(published_at desc);
create index articles_category_idx on public.articles(category_id);
create index articles_author_idx on public.articles(author_id);
create index articles_search_idx on public.articles using gin(search_vector);
create index articles_title_trgm_idx on public.articles using gin(title gin_trgm_ops);
create index comments_article_idx on public.comments(article_id);
create index comments_status_idx on public.comments(status);
create index media_public_id_idx on public.media_assets(public_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger profile_payout_accounts_set_updated_at
before update on public.profile_payout_accounts
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();

create trigger articles_set_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.profile_payout_accounts enable row level security;
alter table public.categories enable row level security;
alter table public.media_assets enable row level security;
alter table public.articles enable row level security;
alter table public.article_media enable row level security;
alter table public.comments enable row level security;

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'visitor'::public.app_role);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('admin'::public.app_role, 'super_admin'::public.app_role);
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select public.current_role() = 'super_admin'::public.app_role;
$$;

create or replace function public.can_manage_content()
returns boolean
language sql
stable
as $$
  select public.current_role() in ('admin'::public.app_role, 'super_admin'::public.app_role, 'wartawan'::public.app_role);
$$;

create policy "Public can read published articles"
on public.articles for select
using (status = 'published');

create policy "Editorial team can read all articles"
on public.articles for select
using (public.current_role() in ('wartawan'::public.app_role, 'admin'::public.app_role, 'super_admin'::public.app_role));

create policy "Authors can insert own drafts"
on public.articles for insert
with check (auth.uid() = author_id and public.can_manage_content());

create policy "Editorial team can update all articles"
on public.articles for update
using (public.current_role() in ('wartawan'::public.app_role, 'admin'::public.app_role, 'super_admin'::public.app_role))
with check (public.current_role() in ('wartawan'::public.app_role, 'admin'::public.app_role, 'super_admin'::public.app_role));

create policy "Admins can delete articles"
on public.articles for delete
using (public.is_admin());

create policy "Public can read categories"
on public.categories for select
using (true);

create policy "Admins can manage categories"
on public.categories for all
using (public.is_admin())
with check (public.is_admin());

create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id or public.is_admin());

create policy "Users can update own profile basics"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "Super admins can manage profiles"
on public.profiles for all
using (public.is_super_admin())
with check (public.is_super_admin());

revoke all on table public.profile_payout_accounts from anon;
grant select, insert, update, delete on table public.profile_payout_accounts to authenticated;

create policy "Users read own payout account"
on public.profile_payout_accounts for select
using (auth.uid() = user_id);

create policy "Users create own payout account"
on public.profile_payout_accounts for insert
with check (auth.uid() = user_id);

create policy "Users update own payout account"
on public.profile_payout_accounts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users delete own payout account"
on public.profile_payout_accounts for delete
using (auth.uid() = user_id);

create policy "Content managers can read media"
on public.media_assets for select
using (public.can_manage_content());

create policy "Content managers can insert media"
on public.media_assets for insert
with check (public.can_manage_content() and created_by = auth.uid());

create policy "Admins can manage media"
on public.media_assets for update
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read approved comments on published articles"
on public.comments for select
using (
  status = 'approved'
  and exists (
    select 1 from public.articles a
    where a.id = article_id and a.status = 'published'
  )
);

create policy "Users can read own comments"
on public.comments for select
using (auth.uid() = author_id or public.is_admin());

create policy "Guests can insert pending comments"
on public.comments for insert
with check (status = 'pending');

create policy "Admins can moderate comments"
on public.comments for update
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete comments"
on public.comments for delete
using (public.is_admin());

-- Fase 3 public portal additions
create or replace function public.increment_article_view(article_uuid uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  update public.articles
  set view_count = greatest(coalesce(view_count, 0), 182) + 1
  where id = article_uuid and status = 'published'
  returning view_count into next_count;

  return next_count;
end;
$$;

revoke all on function public.increment_article_view(uuid) from public;
grant execute on function public.increment_article_view(uuid) to anon, authenticated;

create policy "Public can read published article media"
on public.media_assets for select
using (
  exists (
    select 1 from public.articles a
    where a.featured_media_id = id and a.status = 'published'
  )
  or exists (
    select 1 from public.article_media am
    join public.articles a on a.id = am.article_id
    where am.media_id = id and a.status = 'published'
  )
);

create policy "Public can read published article authors"
on public.profiles for select
using (
  exists (
    select 1 from public.articles a
    where a.author_id = id and a.status = 'published'
  )
);
