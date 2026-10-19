-- ========================================================
-- SWAPNEWS COMPLETE DATABASE SCHEMA & MIGRATIONS
-- Generated for New Supabase Project Migration
-- ========================================================

-- CORE SCHEMA (schema.sql)
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


-- ========================================================
-- MIGRATION: 002_monetization.sql
-- ========================================================

-- Fase PRD 2 — Monetisasi + Kontributor
-- Jalankan setelah schema.sql (Fase 1-3) di Supabase SQL Editor.

alter table public.articles add column if not exists is_exclusive boolean not null default false;

create type public.membership_status as enum ('pending', 'active', 'expired', 'cancelled');
create type public.order_status as enum ('pending', 'paid', 'processing', 'shipped', 'completed', 'refunded', 'cancelled');
create type public.payment_method as enum ('pakasir', 'points');
create type public.point_entry_type as enum ('article_approved', 'redeem', 'revoke', 'adjust');
create type public.redemption_status as enum ('pending', 'approved', 'rejected', 'paid_out');
create type public.redemption_type as enum ('cash', 'product');

-- Membership tahunan Rp99.900 via PAKASIR.COM
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.membership_status not null default 'pending',
  price_idr integer not null default 99900,
  transaction_id text unique,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index memberships_user_idx on public.memberships(user_id, status);
create unique index memberships_one_active on public.memberships(user_id) where status = 'active';

-- Katalog merchandise
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  price_idr integer not null check (price_idr > 0),
  price_points integer not null check (price_points > 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pesanan merchandise
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  payment_method public.payment_method not null,
  total_idr integer,
  total_points integer,
  status public.order_status not null default 'pending',
  transaction_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders(user_id, status);

-- Ledger poin immutable (2 poin per artikel approved; 1 poin = Rp1.000)
create table public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_type public.point_entry_type not null,
  points integer not null,
  balance_after integer not null,
  reference_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index point_ledger_user_idx on public.point_ledger(user_id, created_at desc);

-- Pengajuan redeem poin (cash min 100 poin / produk)
create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.redemption_type not null,
  points integer not null check (points > 0),
  status public.redemption_status not null default 'pending',
  product_id uuid references public.products(id) on delete set null,
  payout_account text,
  payout_owner text,
  note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index redemptions_user_idx on public.redemptions(user_id, status);

-- Data tambahan kirim berita kontributor
create table public.contributor_submissions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null unique references public.articles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  location text,
  event_date date,
  sources text,
  originality_statement boolean not null default false,
  terms_accepted boolean not null default false,
  fraud_flag boolean not null default false,
  points_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contributor_user_idx on public.contributor_submissions(user_id);

-- Slot iklan (disembunyikan untuk member)
create table public.ad_slots (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  position text not null,
  embed_code text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Audit log pembayaran/idempotensi webhook
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  transaction_id text not null,
  provider text not null default 'pakasir',
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (transaction_id, event_type)
);

create trigger memberships_set_updated_at before update on public.memberships for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger redemptions_set_updated_at before update on public.redemptions for each row execute function public.set_updated_at();
create trigger contributor_set_updated_at before update on public.contributor_submissions for each row execute function public.set_updated_at();
create trigger ad_slots_set_updated_at before update on public.ad_slots for each row execute function public.set_updated_at();

-- Saldo poin terkini per user
create or replace function public.point_balance(target_user uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  select coalesce(sum(points), 0)::integer from public.point_ledger where user_id = target_user;
$$;

-- Artikel approved kontributor dalam sebulan (target 50/bulan)
create or replace function public.approved_this_month(target_user uuid)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::integer
  from public.contributor_submissions cs
  join public.articles a on a.id = cs.article_id
  where cs.user_id = target_user
    and a.status = 'published'
    and date_trunc('month', a.published_at) = date_trunc('month', now());
$$;

-- Trigger: artikel kontributor berstatus published → +2 poin (maks 10/hari)
create or replace function public.award_contributor_points()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  submission record;
  approved_today integer;
  new_balance integer;
begin
  if new.status = 'published' and (old.status is distinct from 'published') then
    select * into submission from public.contributor_submissions where article_id = new.id and not points_awarded;
    if found then
      select count(*) into approved_today
      from public.point_ledger
      where user_id = submission.user_id
        and entry_type = 'article_approved'
        and created_at::date = now()::date;
      if approved_today < 10 then
        new_balance := public.point_balance(submission.user_id) + 2;
        insert into public.point_ledger (user_id, entry_type, points, balance_after, reference_id, note)
        values (submission.user_id, 'article_approved', 2, new_balance, new.id, 'Artikel kontributor disetujui');
        update public.contributor_submissions set points_awarded = true where id = submission.id;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger articles_award_points
after update on public.articles
for each row execute function public.award_contributor_points();

-- Cegah update/delete ledger (immutable)
create or replace function public.ledger_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'point_ledger bersifat immutable';
end;
$$;

create trigger ledger_no_update before update or delete on public.point_ledger
for each row execute function public.ledger_immutable();

-- RLS
alter table public.memberships enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.point_ledger enable row level security;
alter table public.redemptions enable row level security;
alter table public.contributor_submissions enable row level security;
alter table public.ad_slots enable row level security;
alter table public.payment_events enable row level security;

create policy "Users read own membership" on public.memberships for select using (auth.uid() = user_id or public.is_admin());
create policy "Admins manage memberships" on public.memberships for all using (public.is_admin()) with check (public.is_admin());

create policy "Public read active products" on public.products for select using (is_active or public.is_admin());
create policy "Admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());

create policy "Users read own orders" on public.orders for select using (auth.uid() = user_id or public.is_admin());
create policy "Members create own orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "Admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());

create policy "Users read own ledger" on public.point_ledger for select using (auth.uid() = user_id or public.is_admin());

create policy "Users read own redemptions" on public.redemptions for select using (auth.uid() = user_id or public.is_admin());
create policy "Members create own redemptions" on public.redemptions for insert with check (auth.uid() = user_id and status = 'pending');
create policy "Admins manage redemptions" on public.redemptions for all using (public.is_admin()) with check (public.is_admin());

create policy "Users read own submissions" on public.contributor_submissions for select using (auth.uid() = user_id or public.is_admin());
create policy "Members create own submissions" on public.contributor_submissions for insert with check (auth.uid() = user_id);
create policy "Admins manage submissions" on public.contributor_submissions for all using (public.is_admin()) with check (public.is_admin());

create policy "Active members submit articles" on public.articles for insert
with check (
  auth.uid() = author_id
  and status = 'in_review'
  and exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.status = 'active' and m.expires_at > now()
  )
);

create policy "Public read active ad slots" on public.ad_slots for select using (is_active or public.is_super_admin());
create policy "Super admins manage ad slots" on public.ad_slots for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Admins read payment events" on public.payment_events for select using (public.is_admin());

-- Membership aktif menandai profil sebagai member
create or replace function public.sync_member_flag()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles
  set is_member = exists (
    select 1 from public.memberships m
    where m.user_id = new.user_id and m.status = 'active' and m.expires_at > now()
  )
  where id = new.user_id;
  return new;
end;
$$;

create trigger memberships_sync_flag
after insert or update on public.memberships
for each row execute function public.sync_member_flag();


-- ========================================================
-- MIGRATION: 003_optimization.sql
-- ========================================================

-- Fase PRD 3 — Optimasi
-- Jalankan setelah 002_monetization.sql.

-- Full-text search Bahasa Indonesia (simple config menjaga istilah/nama Indonesia)
alter table public.articles
add column if not exists search_vector tsvector
generated always as (
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(excerpt, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(content, '')), 'C')
) stored;
create index if not exists articles_search_gin on public.articles using gin(search_vector);

create or replace function public.search_published_articles(search_query text, result_limit integer default 10)
returns table (
  id uuid, slug text, title text, excerpt text, published_at timestamptz,
  view_count bigint, rank real
)
language sql stable security definer set search_path = public
as $$
  select a.id, a.slug, a.title, a.excerpt, a.published_at, a.view_count,
         ts_rank(a.search_vector, websearch_to_tsquery('simple', search_query)) rank
  from public.articles a
  where a.status = 'published'
    and a.search_vector @@ websearch_to_tsquery('simple', search_query)
  order by rank desc, a.published_at desc
  limit least(greatest(result_limit, 1), 30);
$$;
grant execute on function public.search_published_articles(text, integer) to anon, authenticated;

-- Riwayat baca member untuk rekomendasi
create table public.reading_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  category_id bigint references public.categories(id) on delete set null,
  read_at timestamptz not null default now(),
  unique(user_id, article_id)
);
create index reading_history_user_idx on public.reading_history(user_id, read_at desc);

-- Subscriber dan preferensi kategori OneSignal
create table public.push_subscribers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  onesignal_subscription_id text not null unique,
  category_ids bigint[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_subscribers_categories_idx on public.push_subscribers using gin(category_ids);

create table public.push_campaigns (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references public.articles(id) on delete set null,
  title text not null,
  message text not null,
  target_type text not null check (target_type in ('all', 'category')),
  category_id bigint references public.categories(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'failed')),
  recipient_count integer,
  onesignal_notification_id text,
  sent_by uuid not null references public.profiles(id) on delete restrict,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create trigger push_subscribers_set_updated_at before update on public.push_subscribers
for each row execute function public.set_updated_at();

-- Analitik dashboard ringkas
create or replace function public.dashboard_analytics(days_back integer default 30)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'total_views', coalesce((select sum(view_count) from articles where published_at >= now() - make_interval(days => days_back)), 0),
    'published_articles', (select count(*) from articles where status = 'published' and published_at >= now() - make_interval(days => days_back)),
    'active_members', (select count(*) from memberships where status = 'active' and expires_at > now()),
    'paid_orders', (select count(*) from orders where status in ('paid','processing','shipped','completed') and created_at >= now() - make_interval(days => days_back)),
    'contributor_approved', (select count(*) from contributor_submissions cs join articles a on a.id = cs.article_id where a.status = 'published' and a.published_at >= now() - make_interval(days => days_back)),
    'pending_redemptions', (select count(*) from redemptions where status = 'pending')
  )
  where public.is_admin();
$$;
grant execute on function public.dashboard_analytics(integer) to authenticated;

create or replace function public.popular_articles_analytics(result_limit integer default 10)
returns table(id uuid, title text, slug text, view_count bigint, published_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select a.id, a.title, a.slug, a.view_count, a.published_at
  from articles a
  where public.is_admin() and a.status = 'published'
  order by a.view_count desc
  limit least(greatest(result_limit, 1), 50);
$$;
grant execute on function public.popular_articles_analytics(integer) to authenticated;

-- RLS
alter table public.reading_history enable row level security;
alter table public.push_subscribers enable row level security;
alter table public.push_campaigns enable row level security;

create policy "Users manage own reading history" on public.reading_history
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins read reading history" on public.reading_history
for select using (public.is_admin());

create policy "Users manage own push subscription" on public.push_subscribers
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Super admins manage subscribers" on public.push_subscribers
for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Super admins manage push campaigns" on public.push_campaigns
for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Rekomendasi member: kategori paling sering dibaca lalu artikel trending
create or replace function public.recommended_articles(target_user uuid, result_limit integer default 6)
returns table(id uuid, slug text, title text, excerpt text, category_id bigint, view_count bigint, published_at timestamptz)
language sql stable security definer set search_path = public
as $$
  with favorite as (
    select rh.category_id, count(*) frequency
    from reading_history rh
    where rh.user_id = target_user and rh.read_at >= now() - interval '90 days'
    group by rh.category_id
  )
  select a.id, a.slug, a.title, a.excerpt, a.category_id, a.view_count, a.published_at
  from articles a
  left join favorite f on f.category_id = a.category_id
  where a.status = 'published'
    and not exists (select 1 from reading_history h where h.user_id = target_user and h.article_id = a.id)
  order by coalesce(f.frequency, 0) desc, a.view_count desc, a.published_at desc
  limit least(greatest(result_limit, 1), 20);
$$;
grant execute on function public.recommended_articles(uuid, integer) to authenticated;


-- ========================================================
-- MIGRATION: 004_article_seo.sql
-- ========================================================

-- Fase SEO Artikel: fields SEO, tags, dan slug protection
-- Jalankan setelah 003_optimization.sql.

alter table public.articles
  add column if not exists focus_keyword text,
  add column if not exists seo_title text,
  add column if not exists meta_description text,
  add column if not exists tags text[] not null default '{}';

create index if not exists articles_tags_gin on public.articles using gin(tags);

-- Tolak slug yang menabrak route aplikasi
create or replace function public.validate_article_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Slug harus huruf kecil, angka, dan tanda hubung';
  end if;
  if new.slug = any(array[
    'dashboard','member','membership','merchandise','login','cari','api',
    'artikel','auth','robots.txt','sitemap.xml','manifest.webmanifest','news','_next'
  ]) then
    raise exception 'Slug "%" dilarang karena menabrak route aplikasi', new.slug;
  end if;
  return new;
end;
$$;

drop trigger if exists articles_validate_slug on public.articles;
create trigger articles_validate_slug
before insert or update of slug on public.articles
for each row execute function public.validate_article_slug();


-- ========================================================
-- MIGRATION: 005_detik_taxonomy.sql
-- ========================================================

-- SwapNews hierarchical editorial taxonomy inspired by Detik's channel structure.
-- Idempotent: safe to rerun. Existing articles remain intact and are remapped where possible.

alter table public.categories
  add column if not exists parent_id bigint references public.categories(id) on delete set null,
  add column if not exists is_active boolean not null default true;

create index if not exists categories_parent_idx on public.categories(parent_id, sort_order);

-- Main channels. Neutral SwapNews naming; no third-party branding copied.
insert into public.categories (name, slug, description, sort_order, parent_id, is_active)
values
  ('News', 'news', 'Berita nasional, politik, hukum, dan internasional', 10, null, true),
  ('Finance', 'finance', 'Ekonomi, bisnis, pasar, dan keuangan', 20, null, true),
  ('Hot', 'hot', 'Hiburan, selebriti, musik, dan film', 30, null, true),
  ('Sport', 'sport', 'Sepak bola dan olahraga', 40, null, true),
  ('Travel', 'travel', 'Wisata dan perjalanan', 50, null, true),
  ('Food', 'food', 'Kuliner dan resep', 60, null, true),
  ('Health', 'health', 'Kesehatan dan kebugaran', 70, null, true),
  ('Lifestyle', 'lifestyle', 'Gaya hidup, fashion, dan relasi', 80, null, true),
  ('Otomotif', 'otomotif', 'Mobil, motor, dan industri otomotif', 90, null, true),
  ('Teknologi', 'teknologi', 'Gadget, internet, sains, dan teknologi', 100, null, true),
  ('Properti', 'properti', 'Hunian, arsitektur, dan pasar properti', 110, null, true),
  ('Hikmah', 'hikmah', 'Agama, ibadah, dan inspirasi', 120, null, true),
  ('Edukasi', 'edukasi', 'Pendidikan, kampus, dan pengetahuan', 130, null, true),
  ('Video', 'video', 'Berita dan program video', 140, null, true),
  ('MUSIK', 'musik', 'Musik Indonesia, internasional, genre, dan industri', 150, null, true),
  ('PSIKOLOGI', 'psikologi', 'Kesehatan mental, relasi, dan pengembangan diri', 160, null, true),
  ('BALI', 'bali', 'Berita, budaya, pariwisata, dan kehidupan Bali', 170, null, true),
  ('GAMES', 'games', 'Game, esports, teknologi gaming, dan komunitas', 180, null, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  parent_id = null,
  is_active = true;

with channel(name, slug, parent_slug, sort_order) as (
  values
    ('Berita Nasional','berita-nasional','news',11), ('Politik','politik','news',12),
    ('Hukum & Kriminal','hukum-kriminal','news',13), ('Internasional','internasional','news',14),
    ('Peristiwa','peristiwa','news',15), ('Investigasi','investigasi','news',16),
    ('Lingkungan','lingkungan','news',17), ('Foto News','foto-news','news',18),

    ('Ekonomi & Bisnis','ekonomi-bisnis','finance',21), ('Bursa & Valas','bursa-valas','finance',22),
    ('Moneter','moneter','finance',23), ('Energi','energi','finance',24),
    ('Infrastruktur','infrastruktur','finance',25), ('Fintech','fintech','finance',26),
    ('UMKM','umkm','finance',27), ('Karier','karier','finance',28),

    ('Selebriti','selebriti','hot',31),
    ('Film','film','hot',33), ('K-Pop','k-pop','hot',34),
    ('Seni & Budaya','seni-budaya','hot',35), ('TV News','tv-news','hot',36),

    ('Sepak Bola','sepak-bola','sport',41), ('Liga Indonesia','liga-indonesia','sport',42),
    ('Liga Inggris','liga-inggris','sport',43), ('Liga Italia','liga-italia','sport',44),
    ('Liga Spanyol','liga-spanyol','sport',45), ('MotoGP','motogp','sport',46),
    ('F1','f1','sport',47), ('Basket','basket','sport',48), ('Sport Lain','sport-lain','sport',49),

    ('Travel News','travel-news','travel',51), ('Destinasi','destinasi','travel',52),
    ('Cerita Perjalanan','cerita-perjalanan','travel',53), ('Foto Travel','foto-travel','travel',54),

    ('Info Kuliner','info-kuliner','food',61), ('Resep','resep','food',62),
    ('Tempat Makan','tempat-makan','food',63), ('Makanan Sehat','makanan-sehat','food',64),

    ('Berita Kesehatan','berita-kesehatan','health',71), ('Diet','diet','health',72),
    ('Kebugaran','kebugaran','health',73), ('Konsultasi','konsultasi','health',74),
    ('Kesehatan Seksual','kesehatan-seksual','health',75),

    ('Fashion','fashion','lifestyle',81), ('Beauty','beauty','lifestyle',82),
    ('Love','love','lifestyle',83), ('Wedding','wedding','lifestyle',84),
    ('Parenting','parenting','lifestyle',85), ('Zodiak','zodiak','lifestyle',86),

    ('Mobil','mobil','otomotif',91), ('Motor','motor','otomotif',92),
    ('Modifikasi','modifikasi','otomotif',93), ('Tips Otomotif','tips-otomotif','otomotif',94),

    ('Gadget','gadget','teknologi',101), ('Cyberlife','cyberlife','teknologi',102),
    ('Science','science','teknologi',104),
    ('Telekomunikasi','telekomunikasi','teknologi',105),

    ('Berita Properti','berita-properti','properti',111), ('Rumah','rumah','properti',112),
    ('Apartemen','apartemen','properti',113), ('Tips Hunian','tips-hunian','properti',114),

    ('Khazanah','khazanah','hikmah',121), ('Muslimah','muslimah','hikmah',122),
    ('Haji & Umrah','haji-umrah','hikmah',123), ('Doa & Hadits','doa-hadits','hikmah',124),

    ('Sekolah','sekolah','edukasi',131), ('Kampus','kampus','edukasi',132),
    ('Beasiswa','beasiswa','edukasi',133), ('Detikpedia','detikpedia','edukasi',134),

    ('Berita Video','berita-video','video',141), ('Program','program-video','video',142),

    ('Berita Musik','berita-musik','musik',151), ('Musik Indonesia','musik-indonesia','musik',152),
    ('Musik Internasional','musik-internasional','musik',153), ('Rock & Metal','rock-metal','musik',154),
    ('Pop','pop','musik',155), ('Jazz & Blues','jazz-blues','musik',156),
    ('Reggae','reggae','musik',157), ('Musik Indie','musik-indie','musik',158),
    ('Album & Review','album-review','musik',159),

    ('Kesehatan Mental','kesehatan-mental','psikologi',161), ('Relasi','relasi','psikologi',162),
    ('Keluarga & Parenting','keluarga-parenting','psikologi',163), ('Karier & Produktivitas','karier-produktivitas','psikologi',164),
    ('Pengembangan Diri','pengembangan-diri','psikologi',165), ('Konsultasi Psikologi','konsultasi-psikologi','psikologi',166),

    ('Berita Bali','berita-bali','bali',171), ('Denpasar','denpasar','bali',172),
    ('Badung','badung','bali',173), ('Gianyar','gianyar','bali',174),
    ('Buleleng','buleleng','bali',175), ('Bali Timur','bali-timur','bali',176),
    ('Budaya Bali','budaya-bali','bali',177), ('Pariwisata Bali','pariwisata-bali','bali',178),

    ('Game News','game-news','games',181), ('Esports','esports','games',182),
    ('Mobile Games','mobile-games','games',183), ('PC Games','pc-games','games',184),
    ('Console Games','console-games','games',185), ('Review Games','review-games','games',186),
    ('Tips & Trik','tips-trik-games','games',187), ('Komunitas Gaming','komunitas-gaming','games',188)
)
insert into public.categories (name, slug, sort_order, parent_id, is_active)
select channel.name, channel.slug, channel.sort_order, parent.id, true
from channel
join public.categories parent on parent.slug = channel.parent_slug
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  is_active = true;

-- Map legacy/imported categories into closest new editorial desks.
with mapping(old_slug, new_slug) as (
  values
    ('nasional','berita-nasional'), ('news','news'), ('hotnews','berita-nasional'),
    ('politik','politik'), ('hukum','hukum-kriminal'), ('hukum-kriminal','hukum-kriminal'),
    ('hukum-keamanan','hukum-kriminal'), ('hukum-korupsi','hukum-kriminal'), ('hukum-korupsi-2','hukum-kriminal'),
    ('porli','hukum-kriminal'), ('polri','hukum-kriminal'), ('tni-polri','hukum-kriminal'),
    ('internasional','internasional'), ('peristiwa','peristiwa'), ('investigasi','investigasi'),
    ('lingkungan','lingkungan'), ('ekonomi','ekonomi-bisnis'), ('ekonomi-bisnis','ekonomi-bisnis'),
    ('bisnis','ekonomi-bisnis'), ('finance','finance'), ('ekonomi-digital','fintech'),
    ('entertainment','hot'), ('selebriti','selebriti'), ('music','musik'),
    ('musik-hiburan','musik'), ('movie','film'), ('film-series','film'), ('k-pop','k-pop'),
    ('rock-metal','musik'), ('reggae','musik'), ('reggae-2','musik'), ('blues','musik'),
    ('pop','musik'), ('punk','musik'), ('keroncong','musik'), ('band-indie','musik'),
    ('bola-sports','sepak-bola'), ('bola','sepak-bola'), ('olahraga','sport-lain'),
    ('sepak-bola-nasional','liga-indonesia'), ('pariwisata','travel-news'), ('food-travel','travel'),
    ('health','berita-kesehatan'), ('kesehatan','berita-kesehatan'), ('psikologi','psikologi'),
    ('bali','bali'), ('games','games'),
    ('woman','lifestyle'), ('teknologi','teknologi'), ('tekno-sains','teknologi'),
    ('gadget','gadget'), ('sains','science'), ('ai','teknologi'),
    ('telekomunikasi-indonesia','telekomunikasi'), ('otomotif','otomotif'),
    ('pendidikan','sekolah'), ('edukasi','edukasi'), ('humaniora','detikpedia'),
    ('video','video'), ('budaya','seni-budaya'), ('budaya-lokal','seni-budaya')
)
update public.articles article
set category_id = target.id
from public.categories legacy
join mapping on mapping.old_slug = legacy.slug
join public.categories target on target.slug = mapping.new_slug
where article.category_id = legacy.id
  and legacy.id <> target.id;

-- Hide legacy categories no longer used; never delete them in this migration.
update public.categories category
set is_active = false
where category.parent_id is null
  and category.slug not in ('news','finance','hot','sport','travel','food','health','lifestyle','otomotif','teknologi','properti','hikmah','edukasi','video','musik','psikologi','bali','games')
  and not exists (select 1 from public.articles article where article.category_id = category.id);


-- ========================================================
-- MIGRATION: 006_content_management.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 007_social_reels.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 008_homepage_control.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 009_editorial_workflow.sql
-- ========================================================

-- Editorial workflow, audit trail, and scheduled publishing.
-- Run after 008_homepage_control.sql.
alter type public.article_status add value if not exists 'archived';
alter table public.articles add column if not exists scheduled_at timestamptz;
alter table public.articles add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;
alter table public.articles add column if not exists reviewed_at timestamptz;

create table if not exists public.editorial_notes (
 id uuid primary key default gen_random_uuid(), article_id uuid not null references public.articles(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 note text not null check(char_length(note) between 2 and 2000), created_at timestamptz not null default now()
);
create table if not exists public.article_audit_log (
 id bigint generated always as identity primary key, article_id uuid not null references public.articles(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null, action text not null,
 from_status text, to_status text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists articles_workflow_idx on public.articles(status,scheduled_at,published_at desc);
create index if not exists editorial_notes_article_idx on public.editorial_notes(article_id,created_at desc);
create index if not exists audit_article_idx on public.article_audit_log(article_id,created_at desc);
alter table public.editorial_notes enable row level security;
alter table public.article_audit_log enable row level security;
create policy "Editorial team read notes" on public.editorial_notes for select using (public.current_role() in ('wartawan','admin','super_admin'));
create policy "Editorial team create notes" on public.editorial_notes for insert with check (author_id=auth.uid() and public.current_role() in ('wartawan','admin','super_admin'));
create policy "Admins read audit log" on public.article_audit_log for select using (public.current_role() in ('admin','super_admin'));

create or replace function public.audit_article_status() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.status is distinct from new.status then
  insert into public.article_audit_log(article_id,actor_id,action,from_status,to_status)
  values(new.id,auth.uid(),'status_changed',old.status,new.status);
 end if; return new;
end; $$;
drop trigger if exists articles_audit_status on public.articles;
create trigger articles_audit_status after update on public.articles for each row execute function public.audit_article_status();

create or replace function public.publish_scheduled_articles() returns integer language plpgsql security definer set search_path=public as $$
declare affected integer;
begin
 update public.articles set status='published',published_at=coalesce(scheduled_at,now()),updated_at=now()
 where status='scheduled' and scheduled_at is not null and scheduled_at<=now();
 get diagnostics affected=row_count; return affected;
end; $$;
revoke all on function public.publish_scheduled_articles() from public;
grant execute on function public.publish_scheduled_articles() to service_role;


-- ========================================================
-- MIGRATION: 010_editorial_quality.sql
-- ========================================================

-- Editorial Quality Engine scan history.
create table if not exists public.editorial_scans(
 id uuid primary key default gen_random_uuid(), article_id uuid references public.articles(id) on delete cascade,
 scanned_by uuid not null references public.profiles(id) on delete cascade,
 provider text not null default 'rules' check(provider in ('rules','gemini')),
 rule_version text not null, score integer not null check(score between 0 and 100), passed boolean not null,
 scores jsonb not null default '{}'::jsonb, stats jsonb not null default '{}'::jsonb,
 issues jsonb not null default '[]'::jsonb, input_hash text not null,
 fixed_content text, created_at timestamptz not null default now()
);
create index if not exists editorial_scans_article_idx on public.editorial_scans(article_id,created_at desc);
create index if not exists editorial_scans_quality_idx on public.editorial_scans(passed,score,created_at desc);
alter table public.editorial_scans enable row level security;
create policy "Editorial team read scans" on public.editorial_scans for select using(public.current_role() in ('wartawan','admin','super_admin'));
create policy "Editorial team create scans" on public.editorial_scans for insert with check(scanned_by=auth.uid() and public.current_role() in ('wartawan','admin','super_admin'));


-- ========================================================
-- MIGRATION: 011_article_insertions.sql
-- ========================================================

-- Configurable article insertions: related story, merchandise, ad HTML, and copy attribution.
create table if not exists public.article_insertion_settings (
  id boolean primary key default true check (id),
  read_also_enabled boolean not null default true,
  read_also_paragraph smallint not null default 2 check (read_also_paragraph between 1 and 20),
  read_also_label text not null default 'BACA JUGA',
  product_enabled boolean not null default true,
  product_paragraph smallint not null default 3 check (product_paragraph between 1 and 20),
  product_id uuid references public.products(id) on delete set null,
  ad_enabled boolean not null default true,
  ad_paragraph smallint not null default 4 check (ad_paragraph between 1 and 20),
  ad_html text not null default '',
  copy_message text not null default 'Harap sertakan Source atau sumber saat mengutip atau menyalin berita dari SwapNews.',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.article_insertion_settings (id) values (true) on conflict (id) do nothing;

create trigger article_insertion_settings_updated_at before update on public.article_insertion_settings
for each row execute function public.set_updated_at();

alter table public.article_insertion_settings enable row level security;
create policy "Public read article insertion settings" on public.article_insertion_settings for select using (true);
create policy "Super admins manage article insertion settings" on public.article_insertion_settings for all
using (public.is_super_admin()) with check (public.is_super_admin());


-- ========================================================
-- MIGRATION: 012_required_pages.sql
-- ========================================================

-- Required editable public pages. Run after 006_content_management.sql.
-- Idempotent: existing slugs remain untouched.
insert into public.pages (title,slug,excerpt,content,author_id,status,focus_keyword,seo_title,meta_description,tags,published_at)
select seed.title,seed.slug,seed.excerpt,seed.content,admin.id,'published',seed.keyword,seed.seo_title,seed.meta,seed.tags,now()
from (values
('About Us','about-us','Mengenal SwapNews, ruang berita independen untuk perspektif lokal dan percakapan bermakna.','<h2>Tentang SwapNews</h2><p>SwapNews hadir untuk membawa berita lebih dekat dengan kehidupan pembaca. Kami menggabungkan ketelitian jurnalistik, perspektif lokal, dan pengalaman digital yang mudah digunakan.</p><h2>Misi Kami</h2><p>Menyajikan informasi akurat, relevan, dan bertanggung jawab sambil memberi ruang bagi suara komunitas.</p><h2>Nilai Redaksi</h2><ul><li>Akurasi sebelum kecepatan.</li><li>Independen dan transparan.</li><li>Menghormati martabat manusia.</li><li>Berpihak pada kepentingan publik.</li></ul>','tentang SwapNews','About Us — Mengenal SwapNews','Kenali misi, nilai redaksi, dan komitmen jurnalistik SwapNews.',array['swapnews','tentang kami','media']),
('Kebijakan Privasi','kebijakan-privasi','Cara SwapNews mengumpulkan, menggunakan, dan melindungi data Anda.','<h2>Komitmen Privasi</h2><p>Kami memproses data seperlunya untuk menyediakan layanan, keamanan, personalisasi, dan analitik.</p><h2>Data yang Diproses</h2><p>Data akun, perangkat, interaksi layanan, serta informasi yang Anda kirimkan secara sukarela.</p><h2>Hak Pengguna</h2><p>Anda dapat meminta akses, koreksi, atau penghapusan data sesuai hukum yang berlaku.</p><h2>Kontak</h2><p>Hubungi redaksi@swapnews.co.id untuk pertanyaan privasi.</p>','kebijakan privasi','Kebijakan Privasi SwapNews','Pelajari pengelolaan dan perlindungan data pribadi pengguna SwapNews.',array['privasi','data pribadi']),
('Syarat dan Ketentuan','syarat-dan-ketentuan','Ketentuan penggunaan layanan, konten, akun, dan fitur SwapNews.','<h2>Penerimaan Ketentuan</h2><p>Dengan menggunakan SwapNews, Anda menyetujui ketentuan ini.</p><h2>Penggunaan Layanan</h2><p>Layanan tidak boleh digunakan untuk pelanggaran hukum, manipulasi, spam, atau tindakan yang merugikan pihak lain.</p><h2>Hak Kekayaan Intelektual</h2><p>Konten SwapNews dilindungi hukum. Pengutipan wajib menyertakan sumber dan tautan.</p><h2>Perubahan</h2><p>Ketentuan dapat diperbarui untuk menyesuaikan layanan dan regulasi.</p>','syarat ketentuan','Syarat dan Ketentuan SwapNews','Syarat penggunaan portal, akun, dan konten SwapNews.',array['syarat','ketentuan']),
('Pedoman Siber','pedoman-siber','Standar pemberitaan media siber, koreksi, hak jawab, dan konten pengguna.','<h2>Ruang Lingkup</h2><p>Pedoman ini menjadi acuan pengelolaan berita, verifikasi, koreksi, hak jawab, dan konten pengguna.</p><h2>Verifikasi</h2><p>Setiap berita pada prinsipnya harus melalui verifikasi. Informasi mendesak yang belum lengkap diberi penjelasan dan diperbarui.</p><h2>Koreksi dan Hak Jawab</h2><p>SwapNews melayani koreksi serta hak jawab secara proporsional dan transparan.</p><h2>Konten Pengguna</h2><p>Konten komunitas wajib mematuhi hukum, etika, dan panduan komunitas.</p>','pedoman media siber','Pedoman Siber SwapNews','Pedoman pemberitaan, verifikasi, koreksi, dan hak jawab SwapNews.',array['pedoman siber','hak jawab']),
('Panduan Komunitas','panduan-komunitas','Standar aman dan saling menghormati bagi komunitas SwapNews.','<h2>Ruang yang Aman</h2><p>Kami mendorong percakapan informatif, kritis, dan saling menghormati.</p><h2>Dilarang</h2><ul><li>Ujaran kebencian dan ancaman.</li><li>Informasi pribadi tanpa izin.</li><li>Spam dan manipulasi.</li><li>Konten melanggar hukum.</li></ul><h2>Moderasi</h2><p>Kami dapat membatasi atau menghapus konten yang melanggar panduan.</p>','panduan komunitas','Panduan Komunitas SwapNews','Aturan partisipasi komunitas agar aman, sehat, dan bermanfaat.',array['komunitas','moderasi']),
('Disclaimer','disclaimer','Batas tanggung jawab dan konteks penggunaan informasi di SwapNews.','<h2>Informasi Umum</h2><p>Konten disediakan untuk informasi umum dan bukan pengganti nasihat profesional.</p><h2>Tautan Eksternal</h2><p>SwapNews tidak mengendalikan isi atau kebijakan situs pihak ketiga.</p><h2>Pembaruan</h2><p>Kami berupaya menjaga akurasi, tetapi informasi dapat berubah mengikuti perkembangan.</p>','disclaimer berita','Disclaimer SwapNews','Batas tanggung jawab atas penggunaan informasi dan tautan eksternal.',array['disclaimer']),
('Karir','karir','Bergabung membangun jurnalisme digital yang dekat dengan komunitas.','<h2>Tumbuh Bersama SwapNews</h2><p>Kami mencari reporter, editor, kreator visual, engineer, dan talenta bisnis yang ingin memberi dampak.</p><h2>Cara Melamar</h2><p>Kirim profil, portofolio, dan posisi yang diminati ke karir@swapnews.co.id.</p><h2>Budaya Kerja</h2><p>Kolaboratif, bertanggung jawab, terbuka pada eksperimen, dan berorientasi pembaca.</p>','karir media','Karir di SwapNews','Temukan peluang karir dan bangun masa depan jurnalisme digital bersama SwapNews.',array['karir','lowongan']),
('Pasang Iklan','pasang-iklan','Solusi kampanye brand yang relevan, aman, dan terukur di SwapNews.','<h2>Tumbuh Bersama Audiens Kami</h2><p>SwapNews menawarkan display, branded content, social activation, dan kemitraan khusus.</p><h2>Brand Safety</h2><p>Setiap kerja sama mengikuti standar transparansi, pemisahan editorial, dan keamanan merek.</p><h2>Hubungi Tim</h2><p>Kirim tujuan kampanye ke iklan@swapnews.co.id untuk menerima media kit.</p>','pasang iklan','Pasang Iklan di SwapNews','Jangkau audiens SwapNews melalui solusi iklan dan kemitraan brand.',array['iklan','media kit']),
('Bantuan','bantuan','Jawaban dan jalur bantuan untuk akun, membership, konten, dan layanan SwapNews.','<h2>Pusat Bantuan</h2><p>Temukan bantuan terkait akun, membership, kirim berita, merchandise, dan penggunaan situs.</p><h2>Hubungi Kami</h2><p>Email bantuan@swapnews.co.id dengan subjek yang jelas dan detail masalah.</p><h2>Waktu Respons</h2><p>Tim berusaha merespons pada hari kerja dalam 1–3 hari.</p>','bantuan SwapNews','Pusat Bantuan SwapNews','Dapatkan bantuan terkait akun, konten, membership, dan layanan SwapNews.',array['bantuan','help'])
) as seed(title,slug,excerpt,content,keyword,seo_title,meta,tags)
cross join lateral (select id from public.profiles where role='super_admin' order by created_at asc limit 1) admin
where not exists (select 1 from public.pages p where p.slug=seed.slug);


-- ========================================================
-- MIGRATION: 013_media_seo_metadata.sql
-- ========================================================

alter table public.media_assets
    add column if not exists caption text,
    add column if not exists description text;

comment on column public.media_assets.caption is 'Caption displayed with image in editorial content.';
comment on column public.media_assets.description is 'Long-form SEO and accessibility context for image.';


-- ========================================================
-- MIGRATION: 014_wartawan_system.sql
-- ========================================================

-- Migration 014: Wartawan System & Dynamic Points
-- Adds registration fields to profiles and dynamic point allocation logic for Admin approval.

alter table public.profiles
  add column if not exists username text,
  add column if not exists ktp_url text,
  add column if not exists whatsapp text,
  add column if not exists instagram_handle text,
  add column if not exists address text,
  add column if not exists wartawan_status text not null default 'none';

create index if not exists profiles_wartawan_status_idx on public.profiles(wartawan_status);

-- Function for Admin to award points dynamically when approving articles (5 to 10 points)
create or replace function public.award_article_points(
  p_article_id uuid,
  p_points integer,
  p_reviewer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_new_balance integer;
begin
  if p_points < 5 or p_points > 10 then
    raise exception 'Nilai poin harus antara 5 dan 10 untuk artikel publikasi';
  end if;

  select author_id into v_author_id
  from public.articles
  where id = p_article_id;

  if not found then
    raise exception 'Artikel tidak ditemukan';
  end if;

  v_new_balance := public.point_balance(v_author_id) + p_points;

  insert into public.point_ledger (user_id, entry_type, points, balance_after, reference_id, note)
  values (v_author_id, 'article_approved', p_points, v_new_balance, p_article_id, format('Artikel disetujui Admin dengan %s poin', p_points));

  update public.contributor_submissions
  set points_awarded = true
  where article_id = p_article_id;
end;
$$;


-- ========================================================
-- MIGRATION: 015_seo_settings.sql
-- ========================================================

-- Global SEO settings for SwapNews SuperAdmin panel.
create table if not exists public.site_seo_settings (
  id boolean primary key default true check (id = true),
  site_name text not null default 'SwapNews',
  tagline text not null default 'Suara Wawasan Aktual Publik',
  default_og_image text,
  organization_name text not null default 'SwapNews',
  organization_url text not null default 'https://swapnews.co.id',
  organization_logo text,
  same_as jsonb not null default '[]'::jsonb,
  google_site_verification text,
  yandex_verification text,
  bing_site_verification text,
  robots_policy text not null default 'index,follow',
  ai_crawler_policy text not null default 'search-allowed-training-review',
  llms_txt_enabled boolean not null default false,
  indexnow_enabled boolean not null default false,
  default_schema_type text not null default 'NewsArticle',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.site_seo_settings enable row level security;
drop policy if exists site_seo_settings_super_admin on public.site_seo_settings;
create policy site_seo_settings_super_admin on public.site_seo_settings
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.site_seo_settings (id) values (true)
on conflict (id) do nothing;


-- ========================================================
-- MIGRATION: 016_article_view_rpc.sql
-- ========================================================

-- 016_article_view_rpc.sql
-- Fix view counter: RPC increment_article_view tidak pernah dimigrasikan ke production.
-- Idempoten — aman dijalankan berulang.

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
  set view_count = coalesce(view_count, 0) + 1
  where id = article_uuid and status = 'published'
  returning view_count into next_count;

  return next_count;
end;
$$;

revoke all on function public.increment_article_view(uuid) from public;
grant execute on function public.increment_article_view(uuid) to anon, authenticated;


-- ========================================================
-- MIGRATION: 017_article_view_baseline.sql
-- ========================================================

-- 017_article_view_baseline.sql
-- Semua artikel dimulai dari 182 pembaca dan bertambah dari angka tersebut.

alter table public.articles
  alter column view_count set default 182;

update public.articles
set view_count = 182
where view_count < 182;

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


-- ========================================================
-- MIGRATION: 018_profile_center.sql
-- ========================================================

-- 018_profile_center.sql
-- Pusat profil Member/Wartawan dan rekening payout privat.

alter table public.profiles
  add column if not exists bio text,
  add column if not exists birth_date date,
  add column if not exists gender text,
  add column if not exists profession text,
  add column if not exists city text,
  add column if not exists province text,
  add column if not exists postal_code text,
  add column if not exists press_card_number text;

create table if not exists public.profile_payout_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  payout_type text not null default 'bank' check (payout_type in ('bank', 'ewallet')),
  provider_name text not null,
  account_number text not null,
  account_holder text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_payout_accounts enable row level security;

revoke all on table public.profile_payout_accounts from anon;
grant select, insert, update, delete on table public.profile_payout_accounts to authenticated;

drop policy if exists "Users read own payout account" on public.profile_payout_accounts;
create policy "Users read own payout account"
on public.profile_payout_accounts for select
using (auth.uid() = user_id);

drop policy if exists "Users create own payout account" on public.profile_payout_accounts;
create policy "Users create own payout account"
on public.profile_payout_accounts for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update own payout account" on public.profile_payout_accounts;
create policy "Users update own payout account"
on public.profile_payout_accounts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete own payout account" on public.profile_payout_accounts;
create policy "Users delete own payout account"
on public.profile_payout_accounts for delete
using (auth.uid() = user_id);

drop trigger if exists profile_payout_accounts_set_updated_at on public.profile_payout_accounts;
create trigger profile_payout_accounts_set_updated_at
before update on public.profile_payout_accounts
for each row execute function public.set_updated_at();


-- ========================================================
-- MIGRATION: 019_ads_management.sql
-- ========================================================

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


-- ========================================================
-- MIGRATION: 020_wartawan_editorial_permissions.sql
-- ========================================================

-- Migration 020: Wartawan direct publishing, shared editing, authorship transfer, and contribution stats.
-- Run after 019_ads_management.sql.

-- Editorial users can read every article, including unpublished work from other authors.
drop policy if exists "Authors can read own articles" on public.articles;
drop policy if exists "Editorial team can read all articles" on public.articles;
create policy "Editorial team can read all articles"
on public.articles for select
using (public.current_role() in ('wartawan'::public.app_role, 'admin'::public.app_role, 'super_admin'::public.app_role));

-- Wartawan can edit every article and every workflow status. Delete remains admin-only.
drop policy if exists "Authors can update own unpublished articles" on public.articles;
drop policy if exists "Admins can update any article" on public.articles;
drop policy if exists "Editorial team can update all articles" on public.articles;
create policy "Editorial team can update all articles"
on public.articles for update
using (public.current_role() in ('wartawan'::public.app_role, 'admin'::public.app_role, 'super_admin'::public.app_role))
with check (public.current_role() in ('wartawan'::public.app_role, 'admin'::public.app_role, 'super_admin'::public.app_role));

-- Guard byline changes at database level. Server UI cannot be bypassed by direct API calls.
create or replace function public.protect_article_authorship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.author_id is distinct from new.author_id
     and public.current_role() <> 'super_admin'::public.app_role then
    raise exception 'Hanya Super Admin dapat memindahkan penulis artikel';
  end if;
  return new;
end;
$$;

drop trigger if exists articles_protect_authorship on public.articles;
create trigger articles_protect_authorship
before update of author_id on public.articles
for each row execute function public.protect_article_authorship();

-- Record every byline transfer, including old/new author and transfer mode.
create or replace function public.audit_article_authorship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  transfer_mode text;
begin
  if old.author_id is distinct from new.author_id then
    transfer_mode := coalesce(nullif(current_setting('app.authorship_transfer_mode', true), ''), 'direct');
    insert into public.article_audit_log(article_id, actor_id, action, metadata)
    values (
      new.id,
      auth.uid(),
      'authorship_transferred',
      jsonb_build_object(
        'old_author_id', old.author_id,
        'new_author_id', new.author_id,
        'mode', transfer_mode
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists articles_audit_authorship on public.articles;
create trigger articles_audit_authorship
after update of author_id on public.articles
for each row execute function public.audit_article_authorship();

-- One atomic endpoint handles selected-article and category-wide transfers.
create or replace function public.transfer_article_authorship(
  p_new_author_id uuid,
  p_article_ids uuid[] default null,
  p_category_id bigint default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer := 0;
  target_is_approved boolean := false;
  transfer_mode text;
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'Akses transfer penulis hanya untuk Super Admin';
  end if;

  if (p_article_ids is null) = (p_category_id is null) then
    raise exception 'Pilih tepat satu mode: artikel terpilih atau kategori';
  end if;

  if p_article_ids is not null and coalesce(array_length(p_article_ids, 1), 0) = 0 then
    raise exception 'Tidak ada artikel terpilih';
  end if;

  select exists (
    select 1
    from public.profiles
    where id = p_new_author_id
      and role = 'wartawan'::public.app_role
      and wartawan_status = 'approved'
  ) into target_is_approved;

  if not target_is_approved then
    raise exception 'Target harus Wartawan berstatus approved';
  end if;

  transfer_mode := case when p_article_ids is not null then 'selected' else 'category' end;
  perform set_config('app.authorship_transfer_mode', transfer_mode, true);

  if p_article_ids is not null then
    update public.articles
    set author_id = p_new_author_id
    where id = any(p_article_ids)
      and author_id is distinct from p_new_author_id;
  else
    update public.articles
    set author_id = p_new_author_id
    where category_id = p_category_id
      and author_id is distinct from p_new_author_id;
  end if;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.transfer_article_authorship(uuid, uuid[], bigint) from public;
grant execute on function public.transfer_article_authorship(uuid, uuid[], bigint) to authenticated;

-- Direct publish earns the minimum editorial score (5 points). Admin review may award 5-10.
-- Transaction advisory lock makes one article award idempotent without rewriting immutable ledger history.
create or replace function public.award_article_points(
  p_article_id uuid,
  p_points integer,
  p_reviewer_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_status public.article_status;
  v_actor_role public.app_role;
  v_new_balance integer;
begin
  if auth.uid() is null or p_reviewer_id is distinct from auth.uid() then
    raise exception 'Identitas pemberi poin tidak valid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_article_id::text, 0));

  select author_id, status into v_author_id, v_status
  from public.articles
  where id = p_article_id
  for update;

  if not found then
    raise exception 'Artikel tidak ditemukan';
  end if;
  if v_status <> 'published'::public.article_status then
    raise exception 'Poin hanya dapat diberikan untuk artikel published';
  end if;

  v_actor_role := public.current_role();
  if v_actor_role = 'wartawan'::public.app_role then
    if p_points <> 5 then
      raise exception 'Direct publish Wartawan hanya memberi 5 poin';
    end if;
  elsif v_actor_role in ('admin'::public.app_role, 'super_admin'::public.app_role) then
    if p_points < 5 or p_points > 10 then
      raise exception 'Nilai poin review harus antara 5 dan 10';
    end if;
  else
    raise exception 'Role tidak dapat memberikan poin artikel';
  end if;

  if exists (
    select 1 from public.point_ledger
    where reference_id = p_article_id
      and entry_type = 'article_approved'::public.point_entry_type
  ) then
    return;
  end if;

  v_new_balance := public.point_balance(v_author_id) + p_points;
  insert into public.point_ledger(user_id, entry_type, points, balance_after, reference_id, note)
  values (
    v_author_id,
    'article_approved'::public.point_entry_type,
    p_points,
    v_new_balance,
    p_article_id,
    case
      when v_actor_role = 'wartawan'::public.app_role then 'Direct publish Wartawan: 5 poin'
      else format('Artikel disetujui Admin dengan %s poin', p_points)
    end
  );

  update public.contributor_submissions
  set points_awarded = true
  where article_id = p_article_id;
end;
$$;

revoke all on function public.award_article_points(uuid, integer, uuid) from public;
grant execute on function public.award_article_points(uuid, integer, uuid) to authenticated;

-- Aggregated server-side stats avoid loading every article and ledger row into Next.js.
create or replace function public.wartawan_contribution_stats()
returns table (
  id uuid,
  email text,
  full_name text,
  username text,
  total_articles bigint,
  published_articles bigint,
  workflow_articles bigint,
  total_views bigint,
  article_points bigint,
  points_balance bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Akses statistik hanya untuk Admin';
  end if;

  return query
  select
    p.id,
    p.email,
    p.full_name,
    p.username,
    coalesce(a.total_articles, 0),
    coalesce(a.published_articles, 0),
    coalesce(a.workflow_articles, 0),
    coalesce(a.total_views, 0),
    coalesce(ap.article_points, 0),
    coalesce(b.points_balance, 0)
  from public.profiles p
  left join (
    select
      author_id,
      count(*)::bigint as total_articles,
      count(*) filter (where status = 'published')::bigint as published_articles,
      count(*) filter (where status <> 'published')::bigint as workflow_articles,
      coalesce(sum(view_count) filter (where status = 'published'), 0)::bigint as total_views
    from public.articles
    group by author_id
  ) a on a.author_id = p.id
  left join (
    select
      article.author_id,
      coalesce(sum(ledger.points), 0)::bigint as article_points
    from public.articles article
    join public.point_ledger ledger
      on ledger.reference_id = article.id
     and ledger.entry_type = 'article_approved'::public.point_entry_type
    where article.status = 'published'::public.article_status
    group by article.author_id
  ) ap on ap.author_id = p.id
  left join (
    select
      user_id,
      coalesce(sum(points), 0)::bigint as points_balance
    from public.point_ledger
    group by user_id
  ) b on b.user_id = p.id
  where p.role = 'wartawan'::public.app_role
    and p.wartawan_status = 'approved'
  order by coalesce(a.published_articles, 0) desc, coalesce(a.total_articles, 0) desc, p.full_name nulls last;
end;
$$;

revoke all on function public.wartawan_contribution_stats() from public;
grant execute on function public.wartawan_contribution_stats() to authenticated;


-- ========================================================
-- MIGRATION: 021_fix_public_media_rls.sql
-- ========================================================

-- 021_fix_public_media_rls.sql
--
-- MASALAH:
-- Policy lama "Public can read published article media" pada public.media_assets
-- ditulis seperti ini:
--
--   using (exists (select 1 from public.articles a where a.featured_media_id = id ...))
--
-- Di dalam subquery, kolom `id` TIDAK di-kualifikasi. PostgreSQL menyelesaikan
-- nama kolom dari scope terdalam lebih dulu, sehingga `id` terbaca sebagai
-- `a.id` (articles.id), BUKAN `media_assets.id`. Kondisinya menjadi
-- `a.featured_media_id = a.id` yang praktis selalu FALSE.
--
-- AKIBAT: klien publik (anon key) selalu menerima 0 baris dari media_assets,
-- sehingga seluruh kartu berita jatuh ke gambar placeholder walaupun URL
-- Cloudinary sudah benar tersimpan di database.
--
-- PERBAIKAN: kualifikasi eksplisit menjadi `public.media_assets.id`.
-- Bug identik juga terjadi pada policy pembaca profil penulis.

drop policy if exists "Public can read published article media" on public.media_assets;

create policy "Public can read published article media"
on public.media_assets for select
using (
  exists (
    select 1
    from public.articles a
    where a.featured_media_id = public.media_assets.id
      and a.status = 'published'
  )
  or exists (
    select 1
    from public.article_media am
    join public.articles a on a.id = am.article_id
    where am.media_id = public.media_assets.id
      and a.status = 'published'
  )
);

drop policy if exists "Public can read published article authors" on public.profiles;

create policy "Public can read published article authors"
on public.profiles for select
using (
  exists (
    select 1
    from public.articles a
    where a.author_id = public.profiles.id
      and a.status = 'published'
  )
);


-- ========================================================
-- MIGRATION: 022_wartawan_direct_publish_review.sql
-- ========================================================

-- Migration 022: Wartawan direct publish + Super Admin post-publish review + all-user points stats.
-- Run after 021_fix_public_media_rls.sql.

-- ---------------------------------------------------------------------------
-- 1. Post-publish review queue.
--    A published article with reviewed_by IS NULL has not been checked by an
--    admin yet. Partial index keeps that lookup cheap and tiny: only the rows
--    still awaiting review are indexed, so the index shrinks as work is done.
-- ---------------------------------------------------------------------------
create index if not exists articles_awaiting_post_review_idx
on public.articles (published_at desc)
where status = 'published'::public.article_status and reviewed_by is null;

-- ---------------------------------------------------------------------------
-- 2. Allow an admin to mark a published article as reviewed without touching
--    any other field. Keeping this server-side avoids shipping article rows to
--    Next.js just to flip one boolean-ish column.
-- ---------------------------------------------------------------------------
create or replace function public.mark_article_reviewed(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Akses tandai review hanya untuk Admin';
  end if;

  update public.articles
  set reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_article_id
    and status = 'published'::public.article_status
    and reviewed_by is null;

  if not found then
    raise exception 'Artikel tidak ditemukan atau sudah direview';
  end if;
end;
$$;

revoke all on function public.mark_article_reviewed(uuid) from public;
grant execute on function public.mark_article_reviewed(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Points for every user that actually has ledger activity.
--    Aggregated in the database on purpose: returning the raw point_ledger to
--    the app would grow linearly with history and blow the egress budget.
--    Users with no ledger entry are excluded, so the result stays small.
-- ---------------------------------------------------------------------------
create or replace function public.all_user_points_stats()
returns table (
  id uuid,
  email text,
  full_name text,
  username text,
  role public.app_role,
  article_points bigint,
  redeemed_points bigint,
  points_balance bigint,
  entries_count bigint,
  last_entry_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'Akses rekap poin hanya untuk Super Admin';
  end if;

  return query
  select
    p.id,
    p.email,
    p.full_name,
    p.username,
    p.role,
    l.article_points,
    l.redeemed_points,
    l.points_balance,
    l.entries_count,
    l.last_entry_at
  from (
    select
      user_id,
      coalesce(sum(points) filter (where entry_type = 'article_approved'::public.point_entry_type), 0)::bigint as article_points,
      coalesce(abs(sum(points) filter (where entry_type = 'redeem'::public.point_entry_type)), 0)::bigint as redeemed_points,
      coalesce(sum(points), 0)::bigint as points_balance,
      count(*)::bigint as entries_count,
      max(created_at) as last_entry_at
    from public.point_ledger
    group by user_id
  ) l
  join public.profiles p on p.id = l.user_id
  order by l.points_balance desc, l.article_points desc, p.full_name nulls last;
end;
$$;

revoke all on function public.all_user_points_stats() from public;
grant execute on function public.all_user_points_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Wartawan publishes without moderation.
--    The old policy forced every member insert to status = 'in_review', which
--    blocked direct publishing from the contributor form. Split it in two:
--    editorial roles may insert any status, members stay restricted.
-- ---------------------------------------------------------------------------
drop policy if exists "Active members submit articles" on public.articles;
create policy "Active members submit articles"
on public.articles for insert
with check (
  auth.uid() = author_id
  and status = 'in_review'::public.article_status
  and exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.expires_at > now()
  )
);

drop policy if exists "Editorial team insert any status" on public.articles;
create policy "Editorial team insert any status"
on public.articles for insert
with check (
  auth.uid() = author_id
  and public.current_role() in (
    'wartawan'::public.app_role,
    'admin'::public.app_role,
    'super_admin'::public.app_role
  )
);


-- ========================================================
-- MIGRATION: 023_article_cover_image_url.sql
-- ========================================================

-- Migration 023: Stop shipping full article HTML just to find a cover image.
--
-- PROBLEM
-- Card/list queries (homepage 60 rows, channel 40 rows, related 24 rows) were
-- selecting the `content` column. They did not render the article body; they
-- only needed it so the app could regex out the first <img> when an article had
-- no featured_media_id. Article HTML is routinely 20-60 KB, so a single
-- homepage render could transfer several megabytes of text that was thrown
-- away. On the Supabase Free Plan (5 GB uncached egress) this is the fastest
-- way to hit the quota and get the project restricted.
--
-- SOLUTION
-- Extract the first image URL once, at write time, into a small text column.
-- Reads then cost ~100 bytes per row instead of tens of kilobytes.

alter table public.articles
  add column if not exists cover_image_url text;

comment on column public.articles.cover_image_url is
  'First image found in content, extracted at write time so list queries never need to download the full HTML body. Maintained by trigger articles_set_cover_image_url.';

-- ---------------------------------------------------------------------------
-- Extractor. Kept immutable and null-safe so it can be reused in a backfill.
-- substring(... from ...) with a capture group returns the captured text.
-- ---------------------------------------------------------------------------
create or replace function public.extract_first_image_url(p_content text)
returns text
language sql
immutable
as $$
  select substring(p_content from '<img[^>]+src=["'']([^"'']+)["'']');
$$;

-- ---------------------------------------------------------------------------
-- Keep the column in sync. Only recompute when content actually changed, so
-- unrelated updates (view_count, reviewed_by, status) stay cheap.
-- ---------------------------------------------------------------------------
create or replace function public.articles_set_cover_image_url()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.content is distinct from old.content then
    new.cover_image_url := public.extract_first_image_url(new.content);
  end if;
  return new;
end;
$$;

drop trigger if exists articles_set_cover_image_url on public.articles;
create trigger articles_set_cover_image_url
before insert or update of content on public.articles
for each row execute function public.articles_set_cover_image_url();

-- ---------------------------------------------------------------------------
-- Backfill existing rows. Restricted to rows that actually contain an <img>
-- so we do not rewrite the whole table unnecessarily.
-- ---------------------------------------------------------------------------
update public.articles
set cover_image_url = public.extract_first_image_url(content)
where cover_image_url is null
  and content is not null
  and content like '%<img%';


-- ========================================================
-- MIGRATION: 025_site_config.sql
-- ========================================================

-- Migration 025: Site Configuration (Key-Value dynamic settings)
-- Stores dynamic runtime settings like membership price, merchandise defaults, etc.
-- Avoids hardcoded pricing and copies in application code.

create table if not exists public.site_config (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.site_config enable row level security;

-- Public can read active configuration
drop policy if exists "Public can read site config" on public.site_config;
create policy "Public can read site config"
on public.site_config for select
using (true);

-- Only Super Admin can modify configuration
drop policy if exists "Super admin can manage site config" on public.site_config;
create policy "Super admin can manage site config"
on public.site_config for all
using (public.current_role() = 'super_admin'::public.app_role)
with check (public.current_role() = 'super_admin'::public.app_role);

-- Seed default configuration
insert into public.site_config (key, value, description)
values
  ('membership_price_idr', '49900'::jsonb, 'Harga membership tahunan dalam Rupiah'),
  ('membership_title', '"SwapNews Eksklusif"'::jsonb, 'Judul paket membership'),
  ('membership_description', '"Satu paket tahunan. Dukung jurnalisme warga dan dapatkan akses penuh."'::jsonb, 'Deskripsi membership'),
  ('membership_benefits', '["Artikel eksklusif tanpa batas", "Pengalaman baca bebas iklan", "Badge member terverifikasi", "Kirim berita sebagai kontributor dan kumpulkan poin"]'::jsonb, 'Daftar keuntungan member'),
  ('merchandise_store_title', '"Produk resmi SwapNews"'::jsonb, 'Judul halaman merchandise'),
  ('merchandise_store_subtitle', '"Bayar via Pakasir atau tukar poin member."'::jsonb, 'Subjudul halaman merchandise'),
  ('merchandise_free_shipping_min', '150000'::jsonb, 'Minimal belanja untuk gratis ongkir (0 jika dinonaktifkan)')
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();


-- ========================================================
-- MIGRATION: 026_fixed_article_points.sql
-- ========================================================

-- Migration 026: Fixed 10 points for approved articles
-- Replaces award_article_points function to award exactly 10 points per article.

create or replace function public.award_article_points(
  p_article_id uuid,
  p_points integer default 10,
  p_reviewer_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_status public.article_status;
  v_actor_role public.app_role;
  v_new_balance integer;
  v_points integer := 10; -- Always enforce 10 points per requirement
begin
  if auth.uid() is null then
    raise exception 'Identitas pemberi poin tidak valid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_article_id::text, 0));

  select author_id, status into v_author_id, v_status
  from public.articles
  where id = p_article_id
  for update;

  if not found then
    raise exception 'Artikel tidak ditemukan';
  end if;
  if v_status <> 'published'::public.article_status then
    raise exception 'Poin hanya dapat diberikan untuk artikel published';
  end if;

  v_actor_role := public.current_role();
  if v_actor_role not in ('wartawan'::public.app_role, 'admin'::public.app_role, 'super_admin'::public.app_role) then
    raise exception 'Role tidak berhak memberikan poin artikel';
  end if;

  -- Idempotency check: don't double award
  if exists (
    select 1 from public.point_ledger
    where reference_id = p_article_id
      and entry_type = 'article_approved'::public.point_entry_type
  ) then
    return;
  end if;

  v_new_balance := public.point_balance(v_author_id) + v_points;
  insert into public.point_ledger(user_id, entry_type, points, balance_after, reference_id, note)
  values (
    v_author_id,
    'article_approved'::public.point_entry_type,
    v_points,
    v_new_balance,
    p_article_id,
    case
      when v_actor_role = 'wartawan'::public.app_role then 'Direct publish Wartawan: 10 poin'
      else 'Artikel disetujui Admin: 10 poin'
    end
  );

  update public.contributor_submissions
  set points_awarded = true
  where article_id = p_article_id;
end;
$$;

revoke all on function public.award_article_points(uuid, integer, uuid) from public;
grant execute on function public.award_article_points(uuid, integer, uuid) to authenticated;


-- ========================================================
-- MIGRATION: 027_merchandise_detail.sql
-- ========================================================

-- Migration 027: Detailed Merchandise Schema
-- Adds category_product, sku, weight_grams, variants, rating, and sales_count to products table for Shopee-style e-commerce.

alter table public.products
  add column if not exists category_product text not null default 'Umum',
  add column if not exists sku text,
  add column if not exists weight_grams integer not null default 200,
  add column if not exists original_price_idr integer,
  add column if not exists variants jsonb not null default '[]'::jsonb,
  add column if not exists rating numeric(2,1) not null default 5.0,
  add column if not exists sales_count integer not null default 0;

create index if not exists products_category_idx on public.products(category_product);
create index if not exists products_sales_count_idx on public.products(sales_count desc);
create index if not exists products_is_active_idx on public.products(is_active);


