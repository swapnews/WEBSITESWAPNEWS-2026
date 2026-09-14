-- Migration 025: Site Configuration (Key-Value dynamic settings)
-- Stores dynamic runtime settings like membership price, merchandise defaults, etc.
-- Avoids hardcoded pricing and copies in application code.

create table if not exists public.site_config (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.site_config enable row level security;

-- Public can read active configuration
drop policy if exists "Public can read site config" on public.site_config;
create policy "Public can read site config"
on public.site_config for select
using (true);

-- Only Super Admin can modify configuration
drop policy if exists "Super admin can manage site config" on public.site_config;
create policy "Super admin can manage site config"
on public.site_config for all
using (public.current_role() = 'super_admin'::public.app_role)
with check (public.current_role() = 'super_admin'::public.app_role);

-- Seed default configuration
insert into public.site_config (key, value, description)
values
  ('membership_price_idr', '49900'::jsonb, 'Harga membership tahunan dalam Rupiah'),
  ('membership_title', '"SwapNews Eksklusif"'::jsonb, 'Judul paket membership'),
  ('membership_description', '"Satu paket tahunan. Dukung jurnalisme warga dan dapatkan akses penuh."'::jsonb, 'Deskripsi membership'),
  ('membership_benefits', '["Artikel eksklusif tanpa batas", "Pengalaman baca bebas iklan", "Badge member terverifikasi", "Kirim berita sebagai kontributor dan kumpulkan poin"]'::jsonb, 'Daftar keuntungan member'),
  ('merchandise_store_title', '"Produk resmi SwapNews"'::jsonb, 'Judul halaman merchandise'),
  ('merchandise_store_subtitle', '"Bayar via Pakasir atau tukar poin member."'::jsonb, 'Subjudul halaman merchandise'),
  ('merchandise_free_shipping_min', '150000'::jsonb, 'Minimal belanja untuk gratis ongkir (0 jika dinonaktifkan)')
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();
