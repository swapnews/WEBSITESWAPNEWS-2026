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
