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
