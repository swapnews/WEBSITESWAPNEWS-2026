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
