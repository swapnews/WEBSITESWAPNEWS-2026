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
