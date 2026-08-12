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
