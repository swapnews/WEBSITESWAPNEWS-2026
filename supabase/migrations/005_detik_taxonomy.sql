-- SwapNews hierarchical editorial taxonomy inspired by Detik's channel structure.
-- Idempotent: safe to rerun. Existing articles remain intact and are remapped where possible.

alter table public.categories
  add column if not exists parent_id bigint references public.categories(id) on delete set null,
  add column if not exists is_active boolean not null default true;

create index if not exists categories_parent_idx on public.categories(parent_id, sort_order);

-- Main channels. Neutral SwapNews naming; no third-party branding copied.
insert into public.categories (name, slug, description, sort_order, parent_id, is_active)
values
  ('News', 'news', 'Berita nasional, politik, hukum, dan internasional', 10, null, true),
  ('Finance', 'finance', 'Ekonomi, bisnis, pasar, dan keuangan', 20, null, true),
  ('Hot', 'hot', 'Hiburan, selebriti, musik, dan film', 30, null, true),
  ('Sport', 'sport', 'Sepak bola dan olahraga', 40, null, true),
  ('Travel', 'travel', 'Wisata dan perjalanan', 50, null, true),
  ('Food', 'food', 'Kuliner dan resep', 60, null, true),
  ('Health', 'health', 'Kesehatan dan kebugaran', 70, null, true),
  ('Lifestyle', 'lifestyle', 'Gaya hidup, fashion, dan relasi', 80, null, true),
  ('Otomotif', 'otomotif', 'Mobil, motor, dan industri otomotif', 90, null, true),
  ('Teknologi', 'teknologi', 'Gadget, internet, sains, dan teknologi', 100, null, true),
  ('Properti', 'properti', 'Hunian, arsitektur, dan pasar properti', 110, null, true),
  ('Hikmah', 'hikmah', 'Agama, ibadah, dan inspirasi', 120, null, true),
  ('Edukasi', 'edukasi', 'Pendidikan, kampus, dan pengetahuan', 130, null, true),
  ('Video', 'video', 'Berita dan program video', 140, null, true),
  ('MUSIK', 'musik', 'Musik Indonesia, internasional, genre, dan industri', 150, null, true),
  ('PSIKOLOGI', 'psikologi', 'Kesehatan mental, relasi, dan pengembangan diri', 160, null, true),
  ('BALI', 'bali', 'Berita, budaya, pariwisata, dan kehidupan Bali', 170, null, true),
  ('GAMES', 'games', 'Game, esports, teknologi gaming, dan komunitas', 180, null, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  parent_id = null,
  is_active = true;

with channel(name, slug, parent_slug, sort_order) as (
  values
    ('Berita Nasional','berita-nasional','news',11), ('Politik','politik','news',12),
    ('Hukum & Kriminal','hukum-kriminal','news',13), ('Internasional','internasional','news',14),
    ('Peristiwa','peristiwa','news',15), ('Investigasi','investigasi','news',16),
    ('Lingkungan','lingkungan','news',17), ('Foto News','foto-news','news',18),

    ('Ekonomi & Bisnis','ekonomi-bisnis','finance',21), ('Bursa & Valas','bursa-valas','finance',22),
    ('Moneter','moneter','finance',23), ('Energi','energi','finance',24),
    ('Infrastruktur','infrastruktur','finance',25), ('Fintech','fintech','finance',26),
    ('UMKM','umkm','finance',27), ('Karier','karier','finance',28),

    ('Selebriti','selebriti','hot',31),
    ('Film','film','hot',33), ('K-Pop','k-pop','hot',34),
    ('Seni & Budaya','seni-budaya','hot',35), ('TV News','tv-news','hot',36),

    ('Sepak Bola','sepak-bola','sport',41), ('Liga Indonesia','liga-indonesia','sport',42),
    ('Liga Inggris','liga-inggris','sport',43), ('Liga Italia','liga-italia','sport',44),
    ('Liga Spanyol','liga-spanyol','sport',45), ('MotoGP','motogp','sport',46),
    ('F1','f1','sport',47), ('Basket','basket','sport',48), ('Sport Lain','sport-lain','sport',49),

    ('Travel News','travel-news','travel',51), ('Destinasi','destinasi','travel',52),
    ('Cerita Perjalanan','cerita-perjalanan','travel',53), ('Foto Travel','foto-travel','travel',54),

    ('Info Kuliner','info-kuliner','food',61), ('Resep','resep','food',62),
    ('Tempat Makan','tempat-makan','food',63), ('Makanan Sehat','makanan-sehat','food',64),

    ('Berita Kesehatan','berita-kesehatan','health',71), ('Diet','diet','health',72),
    ('Kebugaran','kebugaran','health',73), ('Konsultasi','konsultasi','health',74),
    ('Kesehatan Seksual','kesehatan-seksual','health',75),

    ('Fashion','fashion','lifestyle',81), ('Beauty','beauty','lifestyle',82),
    ('Love','love','lifestyle',83), ('Wedding','wedding','lifestyle',84),
    ('Parenting','parenting','lifestyle',85), ('Zodiak','zodiak','lifestyle',86),

    ('Mobil','mobil','otomotif',91), ('Motor','motor','otomotif',92),
    ('Modifikasi','modifikasi','otomotif',93), ('Tips Otomotif','tips-otomotif','otomotif',94),

    ('Gadget','gadget','teknologi',101), ('Cyberlife','cyberlife','teknologi',102),
    ('Science','science','teknologi',104),
    ('Telekomunikasi','telekomunikasi','teknologi',105),

    ('Berita Properti','berita-properti','properti',111), ('Rumah','rumah','properti',112),
    ('Apartemen','apartemen','properti',113), ('Tips Hunian','tips-hunian','properti',114),

    ('Khazanah','khazanah','hikmah',121), ('Muslimah','muslimah','hikmah',122),
    ('Haji & Umrah','haji-umrah','hikmah',123), ('Doa & Hadits','doa-hadits','hikmah',124),

    ('Sekolah','sekolah','edukasi',131), ('Kampus','kampus','edukasi',132),
    ('Beasiswa','beasiswa','edukasi',133), ('Detikpedia','detikpedia','edukasi',134),

    ('Berita Video','berita-video','video',141), ('Program','program-video','video',142),

    ('Berita Musik','berita-musik','musik',151), ('Musik Indonesia','musik-indonesia','musik',152),
    ('Musik Internasional','musik-internasional','musik',153), ('Rock & Metal','rock-metal','musik',154),
    ('Pop','pop','musik',155), ('Jazz & Blues','jazz-blues','musik',156),
    ('Reggae','reggae','musik',157), ('Musik Indie','musik-indie','musik',158),
    ('Album & Review','album-review','musik',159),

    ('Kesehatan Mental','kesehatan-mental','psikologi',161), ('Relasi','relasi','psikologi',162),
    ('Keluarga & Parenting','keluarga-parenting','psikologi',163), ('Karier & Produktivitas','karier-produktivitas','psikologi',164),
    ('Pengembangan Diri','pengembangan-diri','psikologi',165), ('Konsultasi Psikologi','konsultasi-psikologi','psikologi',166),

    ('Berita Bali','berita-bali','bali',171), ('Denpasar','denpasar','bali',172),
    ('Badung','badung','bali',173), ('Gianyar','gianyar','bali',174),
    ('Buleleng','buleleng','bali',175), ('Bali Timur','bali-timur','bali',176),
    ('Budaya Bali','budaya-bali','bali',177), ('Pariwisata Bali','pariwisata-bali','bali',178),

    ('Game News','game-news','games',181), ('Esports','esports','games',182),
    ('Mobile Games','mobile-games','games',183), ('PC Games','pc-games','games',184),
    ('Console Games','console-games','games',185), ('Review Games','review-games','games',186),
    ('Tips & Trik','tips-trik-games','games',187), ('Komunitas Gaming','komunitas-gaming','games',188)
)
insert into public.categories (name, slug, sort_order, parent_id, is_active)
select channel.name, channel.slug, channel.sort_order, parent.id, true
from channel
join public.categories parent on parent.slug = channel.parent_slug
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  parent_id = excluded.parent_id,
  is_active = true;

-- Map legacy/imported categories into closest new editorial desks.
with mapping(old_slug, new_slug) as (
  values
    ('nasional','berita-nasional'), ('news','news'), ('hotnews','berita-nasional'),
    ('politik','politik'), ('hukum','hukum-kriminal'), ('hukum-kriminal','hukum-kriminal'),
    ('hukum-keamanan','hukum-kriminal'), ('hukum-korupsi','hukum-kriminal'), ('hukum-korupsi-2','hukum-kriminal'),
    ('porli','hukum-kriminal'), ('polri','hukum-kriminal'), ('tni-polri','hukum-kriminal'),
    ('internasional','internasional'), ('peristiwa','peristiwa'), ('investigasi','investigasi'),
    ('lingkungan','lingkungan'), ('ekonomi','ekonomi-bisnis'), ('ekonomi-bisnis','ekonomi-bisnis'),
    ('bisnis','ekonomi-bisnis'), ('finance','finance'), ('ekonomi-digital','fintech'),
    ('entertainment','hot'), ('selebriti','selebriti'), ('music','musik'),
    ('musik-hiburan','musik'), ('movie','film'), ('film-series','film'), ('k-pop','k-pop'),
    ('rock-metal','musik'), ('reggae','musik'), ('reggae-2','musik'), ('blues','musik'),
    ('pop','musik'), ('punk','musik'), ('keroncong','musik'), ('band-indie','musik'),
    ('bola-sports','sepak-bola'), ('bola','sepak-bola'), ('olahraga','sport-lain'),
    ('sepak-bola-nasional','liga-indonesia'), ('pariwisata','travel-news'), ('food-travel','travel'),
    ('health','berita-kesehatan'), ('kesehatan','berita-kesehatan'), ('psikologi','psikologi'),
    ('bali','bali'), ('games','games'),
    ('woman','lifestyle'), ('teknologi','teknologi'), ('tekno-sains','teknologi'),
    ('gadget','gadget'), ('sains','science'), ('ai','teknologi'),
    ('telekomunikasi-indonesia','telekomunikasi'), ('otomotif','otomotif'),
    ('pendidikan','sekolah'), ('edukasi','edukasi'), ('humaniora','detikpedia'),
    ('video','video'), ('budaya','seni-budaya'), ('budaya-lokal','seni-budaya')
)
update public.articles article
set category_id = target.id
from public.categories legacy
join mapping on mapping.old_slug = legacy.slug
join public.categories target on target.slug = mapping.new_slug
where article.category_id = legacy.id
  and legacy.id <> target.id;

-- Hide legacy categories no longer used; never delete them in this migration.
update public.categories category
set is_active = false
where category.parent_id is null
  and category.slug not in ('news','finance','hot','sport','travel','food','health','lifestyle','otomotif','teknologi','properti','hikmah','edukasi','video','musik','psikologi','bali','games')
  and not exists (select 1 from public.articles article where article.category_id = category.id);
