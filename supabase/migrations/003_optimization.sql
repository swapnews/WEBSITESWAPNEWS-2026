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
