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
