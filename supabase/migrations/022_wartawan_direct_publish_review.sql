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
