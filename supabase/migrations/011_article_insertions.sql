-- Configurable article insertions: related story, merchandise, ad HTML, and copy attribution.
create table if not exists public.article_insertion_settings (
  id boolean primary key default true check (id),
  read_also_enabled boolean not null default true,
  read_also_paragraph smallint not null default 2 check (read_also_paragraph between 1 and 20),
  read_also_label text not null default 'BACA JUGA',
  product_enabled boolean not null default true,
  product_paragraph smallint not null default 3 check (product_paragraph between 1 and 20),
  product_id uuid references public.products(id) on delete set null,
  ad_enabled boolean not null default true,
  ad_paragraph smallint not null default 4 check (ad_paragraph between 1 and 20),
  ad_html text not null default '',
  copy_message text not null default 'Harap sertakan Source atau sumber saat mengutip atau menyalin berita dari SwapNews.',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.article_insertion_settings (id) values (true) on conflict (id) do nothing;

create trigger article_insertion_settings_updated_at before update on public.article_insertion_settings
for each row execute function public.set_updated_at();

alter table public.article_insertion_settings enable row level security;
create policy "Public read article insertion settings" on public.article_insertion_settings for select using (true);
create policy "Super admins manage article insertion settings" on public.article_insertion_settings for all
using (public.is_super_admin()) with check (public.is_super_admin());
