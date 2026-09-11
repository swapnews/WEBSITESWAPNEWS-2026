-- 021_fix_public_media_rls.sql
--
-- MASALAH:
-- Policy lama "Public can read published article media" pada public.media_assets
-- ditulis seperti ini:
--
--   using (exists (select 1 from public.articles a where a.featured_media_id = id ...))
--
-- Di dalam subquery, kolom `id` TIDAK di-kualifikasi. PostgreSQL menyelesaikan
-- nama kolom dari scope terdalam lebih dulu, sehingga `id` terbaca sebagai
-- `a.id` (articles.id), BUKAN `media_assets.id`. Kondisinya menjadi
-- `a.featured_media_id = a.id` yang praktis selalu FALSE.
--
-- AKIBAT: klien publik (anon key) selalu menerima 0 baris dari media_assets,
-- sehingga seluruh kartu berita jatuh ke gambar placeholder walaupun URL
-- Cloudinary sudah benar tersimpan di database.
--
-- PERBAIKAN: kualifikasi eksplisit menjadi `public.media_assets.id`.
-- Bug identik juga terjadi pada policy pembaca profil penulis.

drop policy if exists "Public can read published article media" on public.media_assets;

create policy "Public can read published article media"
on public.media_assets for select
using (
  exists (
    select 1
    from public.articles a
    where a.featured_media_id = public.media_assets.id
      and a.status = 'published'
  )
  or exists (
    select 1
    from public.article_media am
    join public.articles a on a.id = am.article_id
    where am.media_id = public.media_assets.id
      and a.status = 'published'
  )
);

drop policy if exists "Public can read published article authors" on public.profiles;

create policy "Public can read published article authors"
on public.profiles for select
using (
  exists (
    select 1
    from public.articles a
    where a.author_id = public.profiles.id
      and a.status = 'published'
  )
);
