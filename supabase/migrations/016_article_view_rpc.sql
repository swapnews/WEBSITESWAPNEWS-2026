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
