-- Global SEO settings for SwapNews SuperAdmin panel.
create table if not exists public.site_seo_settings (
  id boolean primary key default true check (id = true),
  site_name text not null default 'SwapNews',
  tagline text not null default 'Suara Wawasan Aktual Publik',
  default_og_image text,
  organization_name text not null default 'SwapNews',
  organization_url text not null default 'https://swapnews.co.id',
  organization_logo text,
  same_as jsonb not null default '[]'::jsonb,
  google_site_verification text,
  yandex_verification text,
  bing_site_verification text,
  robots_policy text not null default 'index,follow',
  ai_crawler_policy text not null default 'search-allowed-training-review',
  llms_txt_enabled boolean not null default false,
  indexnow_enabled boolean not null default false,
  default_schema_type text not null default 'NewsArticle',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.site_seo_settings enable row level security;
drop policy if exists site_seo_settings_super_admin on public.site_seo_settings;
create policy site_seo_settings_super_admin on public.site_seo_settings
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.site_seo_settings (id) values (true)
on conflict (id) do nothing;
