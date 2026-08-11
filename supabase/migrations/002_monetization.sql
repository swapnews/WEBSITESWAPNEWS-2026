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
