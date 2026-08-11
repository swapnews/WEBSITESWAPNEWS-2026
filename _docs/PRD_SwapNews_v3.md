# PRD — SwapNews
**Domain:** `swapnews.co.id` · **Portal Berita Super PWA Single-Tenant** · **Versi 3.0 — DISETUJUI** · 10 Agustus 2026
**Bahasa:** Indonesia · **Tagline:** *Bukan Berita Biasa* · Status: ✅ Disetujui user

---

## 1. Ringkasan Eksekutif

SwapNews adalah portal berita digital berfitur lengkap setara **detik.com, Kumparan, dan Kompas.com**, dibangun sebagai **Super PWA** (Progressive Web App) untuk satu organisasi/redaksi. SwapNews **bukan produk SaaS dan tidak mendukung multi-tenant**.

Fokus utama pengalaman ada di **versi mobile** yang terasa seperti aplikasi native (densitas UI ala Gojek), dengan bahasa desain **Claymorphism** berwarna identitas logo (gradasi kuning-amber → oranye → merah).

Seluruh file media disimpan dan ditransformasikan di **Cloudinary**. Supabase hanya menyimpan data aplikasi, metadata media, dan relasi konten — tidak menyimpan binary gambar.

---

## 2. Latar Belakang & Masalah yang Dipecahkan

| Masalah | Solusi SwapNews |
|---|---|
| Portal berita berat & lambat di mobile | Super PWA: installable, offline-ready, load < 2 detik |
| Pembaca pasif, tidak ada interaksi | Komentar guest/login, reaksi, share, bookmark |
| CMS berita kaku & tidak SEO-friendly | Editor ala WordPress + media picker SEO (alt, title, meta) |
| Media boros storage & bandwidth | Auto-kompres WebP kualitas 40% ke Cloudinary; validasi visual mencegah hasil buram |
| Push notification rentan berlebihan | Push manual terkontrol oleh Super Admin saja |
| Monetisasi tunggal (iklan) | Multi-stream: iklan, merchandise, membership eksklusif |

---

## 3. Tujuan Produk (Goals)

1. Menyamai kelengkapan fitur detik.com / Kumparan / Kompas.com.
2. Mobile-first experience yang terasa seperti aplikasi native (bukan web biasa).
3. Redaksi produktif: wartawan menulis → admin approve → publish.
4. Monetisasi: iklan, merchandise, membership eksklusif.
5. Operasional hemat: memaksimalkan free tier tanpa melanggar ketentuan layanan masing-masing platform.

---

## 4. Referensi Kompetitor

| Fitur | detik.com | Kumparan | Kompas.com | SwapNews |
|---|---|---|---|---|
| Kanal/kategori berita | ✅ | ✅ | ✅ | ✅ (dikelola Admin) |
| Breaking news ticker | ✅ | ✅ | ✅ | ✅ |
| Berita terpopuler/trending | ✅ | ✅ | ✅ | ✅ |
| Infinite scroll / baca juga | ✅ | ✅ | ✅ | ✅ |
| Push notification | ✅ | ✅ | ✅ | ✅ (OneSignal web push, manual Super Admin) |
| Dark mode | ✅ | ✅ | ✅ | ✅ |
| Membership premium | ❌ | ❌ | ✅ (Kompas.id) | ✅ |
| Komentar | ✅ | ✅ | ✅ | ✅ (guest + login) |
| Toko merchandise | ❌ | ❌ | ❌ | ✅ (diferensiasi) |
| PWA installable | Sebagian | ❌ | ❌ | ✅ Super PWA |
| Multi-tenant / dijual ke media lain | ❌ | ❌ | ❌ | ❌ (di luar scope) |

---

## 5. Peran Pengguna (4 Role)

### 5.1 Super Admin
Pemilik platform. Akses penuh tanpa batas.
- Kelola semua user & role (buat/turunkan/hapus Admin, Wartawan).
- Kelola **kredensial & konfigurasi sistem**: email SMTP, API key (OneSignal, Cloudinary, payment gateway), notifikasi blast, pengaturan situs.
- Kelola kategori, halaman statis, iklan/ads slot, pengaturan situs global.
- **Satu-satunya role yang dapat mengirim push notification manual**.
- Dashboard analitik penuh (traffic, pendapatan, performa artikel).
- Audit log semua aktivitas.

### 5.2 Admin
Operasional redaksi & konten, **TANPA akses kredensial dan push notification**.
- **Approval workflow**: review, approve, tolak (dengan catatan revisi), jadwalkan berita dari Wartawan.
- Kelola kategori & sub-kategori berita.
- Kelola komentar (moderasi, hapus, ban user).
- Kelola merchandise, pesanan, membership.
- ❌ Tidak bisa: ubah SMTP/email, API key, **kirim push notification**, kelola role.

### 5.3 Wartawan / Editor
Produsen konten.
- Menulis berita di editor ala WordPress (rich text, heading, quote, embed, list).
- Media picker: upload gambar ke Cloudinary, edit judul/alt/meta deskripsi, auto WebP.
- Draft → submit untuk review Admin → status: `Draft / Menunggu Review / Revisi / Terjadwal / Terbit`.
- Lihat statistik artikel miliknya (views, komentar).
- ❌ Tidak bisa: publish langsung, kelola kategori, kelola user, kirim push.

### 5.4 Pengunjung (Visitor)
- **Guest**: baca berita gratis, komentar sebagai guest (nama + email, moderasi), terima push notif jika subscribe.
- **Member (login)**: komentar terverifikasi, bookmark, riwayat baca, beli merchandise, langganan **membership berita eksklusif**, atur preferensi notifikasi.

### Matriks Izin (Ringkas)

| Kemampuan | Super Admin | Admin | Wartawan | Visitor |
|---|:-:|:-:|:-:|:-:|
| Baca berita gratis | ✅ | ✅ | ✅ | ✅ |
| Komentar | ✅ | ✅ | ✅ | ✅ guest/login |
| Tulis & submit berita | ✅ | ✅ | ✅ | ❌ |
| Approve / publish | ✅ | ✅ | ❌ | ❌ |
| Kelola kategori | ✅ | ✅ | ❌ | ❌ |
| Moderasi komentar | ✅ | ✅ | ❌ | ❌ |
| Kelola merchandise & order | ✅ | ✅ | ❌ | ❌ |
| Kelola user & role | ✅ | ❌ | ❌ | ❌ |
| Kredensial (SMTP, API key) | ✅ | ❌ | ❌ | ❌ |
| **Kirim push notification** | ✅ | ❌ | ❌ | ❌ |

---

## 6. Fitur Portal Berita (Front-facing)

### 6.1 Beranda
- Headline utama (carousel/slider berita pilihan redaksi).
- Breaking news ticker (marquee teks berjalan).
- Feed berita per kategori dengan infinite scroll.
- Section: Terpopuler, Terbaru, Rekomendasi.
- **Trending Topic:** slider horizontal berisi tepat 5 kartu berita; menampilkan nomor urut, thumbnail 4:3, kategori, judul, dan jumlah view.
- Widget: cuaca, kurs, indeks (opsional, fase 2).

### 6.2 Halaman Artikel
- Gambar utama **presisi rasio 4:3** melalui smart crop Cloudinary + focal-point editor; bukan letterbox.
- Judul, kategori, penulis, tanggal terbit/perbarui, estimasi waktu baca, jumlah view.
- Tombol share (WhatsApp, X, Facebook, Telegram, copy link), bookmark, ukuran font, text-to-speech, mode baca, dan lapor koreksi.
- Reaksi menggunakan ikon Lucide, navigasi artikel sebelumnya/berikutnya, profil penulis, tag, sumber, dan timeline pembaruan.
- Setelah **paragraf ke-2**, sistem menyisipkan blok **BACA JUGA:** otomatis/manual seperti detik.com; Admin/Editor dapat mengganti artikel terkait.
- Setelah **paragraf ke-4**, sistem menyisipkan kartu **Merchandise/Produk** relevan; tampil adaptif dan tidak mengganggu pembacaan.
- Saat teks artikel disalin, clipboard menambahkan ringkasan pendek, URL canonical artikel, dan pesan: **“Untuk mengutip berita ini, harap cantumkan SwapNews sebagai sumber.”** Fitur ini atribusi, bukan DRM; pembaca tetap dapat menyalin teks.
- Komentar termoderasi di bawah artikel, artikel terkait, dan rekomendasi personal.
- Berita eksklusif: konten terkunci untuk non-member (paywall blur + CTA langganan).

### 6.3 Navigasi & Pencarian
- Bottom navigation mobile (Home, Kategori, Trending, Bookmark, Profil) — gaya aplikasi.
- Pencarian full-text dengan live suggestion (Postgres `tsvector`; opsi upgrade Typesense/Algolia fase 3).
- Halaman kanal per kategori + sub-kategori.
- Tag/topik: halaman arsip per tag.

### 6.4 Kategori (dikelola Admin & Super Admin saja)
Kategori awal yang diusulkan (bisa ditambah/ubah via CMS):

| Kategori | Contoh Sub-kategori |
|---|---|
| News | Nasional, Daerah, Internasional |
| Bisnis | Ekonomi, UMKM, Startup, Finansial |
| Tekno | Gadget, Apps, AI, Internet |
| Sports | Sepak Bola, Badminton, Basket |
| Hiburan | Selebriti, Film, Musik |
| Lifestyle | Kesehatan, Travel, Kuliner, Fashion |
| Otomotif | Mobil, Motor, Tips |
| Edukasi | Kampus, Beasiswa, Sains |
| Opini | Kolom, Tajuk, Surat Pembaca |
| Hukum & Kriminal | Hukum, Pengadilan, Kepolisian, Kejahatan, Investigasi |
| Viral | Trending, Unik, Media Sosial |

> Wartawan hanya dapat **memilih** kategori, tidak bisa membuat baru.

---

## 7. Super PWA

- **Installable**: manifest + prompt "Add to Home Screen", ikon maskable dari logo.
- **Offline mode**: service worker cache artikel yang sudah dibaca + halaman offline bermerek.
- **App-like**: splash screen, standalone display, pull-to-refresh, swipe antar artikel.
- **Push notification**: OneSignal web push, pengiriman manual oleh Super Admin (lihat §9).
- **Performa**: target Lighthouse PWA ≥ 95, LCP < 2s di 4G, gambar lazy-load + WebP.
- **Background sync**: komentar/bookmark tersimpan saat offline, terkirim saat online.

---

## 8. Arsitektur Single-Tenant

- Satu organisasi/redaksi, satu domain utama `swapnews.co.id`.
- Tidak ada tenant, wildcard subdomain, custom domain pelanggan, atau isolasi data lintas media.
- RLS tetap digunakan untuk membatasi data berdasarkan role dan kepemilikan konten.
- Supabase hanya menyimpan data aplikasi dan metadata media; semua binary media berada di Cloudinary.
- Jika SwapNews nantinya dijual sebagai platform multi-tenant, keputusan tersebut memerlukan PRD revisi dan desain ulang arsitektur.

---

## 9. Notifikasi (OneSignal Web Push)

| Trigger | Pengirim | Penerima | Catatan |
|---|---|---|---|
| Berita baru terbit | **Manual Super Admin** | Subscriber kategori terkait / semua | Super Admin memilih artikel yang sudah berstatus Terbit |
| Breaking / viral manual | **Manual Super Admin** | Semua subscriber / segmen | Super Admin menandai dan mengirim |
| Promo merchandise / membership | **Manual Super Admin** | Semua / segmen member | Dijadwalkan manual oleh Super Admin |

Aturan:
- **Tidak ada push otomatis** saat berita terbit, viral, ada balasan komentar, atau perubahan status artikel.
- Hanya **Super Admin** yang dapat membuat, menjadwalkan, dan mengirim push notification.
- Admin dan Wartawan tidak memiliki akses kirim push.
- Sebelum kirim: tampilkan preview judul, isi, URL tujuan, ikon, dan estimasi penerima.
- Setiap pengiriman dicatat di audit log.
- Preferensi notifikasi user per kategori tetap tersedia.
- Monitor kuota OneSignal; jika paket free tidak mencukupi, upgrade atau ganti provider sebelum kapasitas terlampaui.

---

## 10. Desain UI/UX

### 10.1 Gaya Visual: Claymorphism
Elemen terlihat seperti "tanah liat" lembut 3D: rounded besar, fluffy, tactile — **bukan** flat UI generik AI.

Token desain:
- **Warna utama** (dari logo):
  - Amber: `#FBBF24` → Oranye: `#F97316` → Merah-oranye: `#EF4444` (gradasi brand 135°)
  - Background terang: `#FFF8F0` (cream hangat)
  - Background dark mode: `#1C1410` (cokelat gelap hangat)
- **Clay surface**: radius 24–32px, background sedikit lebih terang dari base, `inner shadow` terang di atas + `drop shadow` lembut gelap di bawah (double shadow khas clay).
- **Tipografi**: Inter / Plus Jakarta Sans (heading: Outfit Bold).
- **Ikon**: **Lucide** (bukan emoji native) — konsisten, stroke-based, warna aksen oranye.
- **Animasi**: spring/bounce lembut (framer-motion), micro-interaction saat tap (clay "mendem"/tertekan).

### 10.2 Mobile: Densitas ala Gojek
- Versi mobile terasa seperti **aplikasi**, bukan website dikecilkan.
- Tipografi **sangat kecil & rapat**: base 11–12px, judul kartu 13–14px, meta 9–10px, line-height ketat.
- Padding rapat (8–12px), kartu kompak, banyak konten per viewport.
- Bottom nav + FAB, gesture swipe, sticky search bar.
- Desktop tetap nyaman dibaca (base 15–16px) — densitas kecil khusus mobile.

### 10.3 Registrasi & Onboarding (Animasi Claymorphism)
- Multi-step form (email → profil → minat kategori) dengan transisi slide-spring.
- Elemen clay "melompat" masuk (stagger bounce), progress indicator clay pill.
- Validasi inline dengan shake lembut + pesan ramah.
- Sukses: animasi confetti clay + ikon Lucide `party-popper` → redirect personalisasi.
- Social login (Google) opsional.

---

## 11. Editor Berita (alA WordPress)

### 11.1 Fitur Editor
- Rich text block-based: paragraf, H2/H3, quote, list, embed (YouTube, tweet, IG), divider, "baca juga" inline.
- Field SEO: slug otomatis (editable), meta title, meta description, focus keyword, canonical.
- Status workflow: Draft → Submit Review → (Admin) Revisi/Terbit/Terjadwal.
- Auto-save draft tiap 15 detik + revisi/versi artikel.
- Pilih kategori + tag, unggulan (featured), tandai eksklusif (member only).

### 11.2 Media Picker (Wajib, tanpa URL)
- **Upload only** — tidak ada opsi sisip gambar via URL eksternal.
- **Semua binary media masuk Cloudinary; tidak ada file gambar yang disimpan di database/storage Supabase.**
- Supabase hanya menyimpan metadata: `public_id`, `secure_url`, dimensi, aspect ratio, alt, judul, deskripsi, kredit, focal point, ukuran, dan relasi artikel.
- Setiap gambar wajib dapat diedit: **Judul, Alt Text, Meta Deskripsi**, kredit, dan focal point.
- Pipeline upload otomatis:
  1. Validasi tipe (JPG/PNG/WebP, maks 10MB), dimensi, dan keamanan file.
  2. **Auto-kompres → WebP kualitas 40%**. Preview before/after dan validasi visual tersedia karena kualitas 40% dapat menurunkan detail pada gambar tertentu.
  3. Upload bertanda tangan ke **Cloudinary**; kredensial tidak pernah dikirim ke client.
  4. Buat varian crawlable resolusi tinggi rasio **1:1, 4:3, dan 16:9** untuk rekomendasi Google NewsArticle.
  5. Simpan metadata di Supabase (bukan file binary).
- **Gambar utama artikel**: apapun rasio upload, frontend memakai varian smart-crop **4:3**. Editor dapat mengatur focal point dan melihat preview crop.
- Media library: grid thumbnail, pencarian, filter, reuse gambar lama, replace, dan audit penggunaan.
- **Sampah dan media orphan** di Cloudinary harus dibersihkan berkala agar kuota free tier tidak bocor.

---

## 12. Interaksi & Komentar

- **Guest**: komentar dengan nama + email (tanpa akun), masuk antrean moderasi.
- **Member login**: komentar masuk antrean moderasi sama seperti guest, avatar, reply/threading 2 level.
- Fitur: like komentar, report, sort (terbaru/terpopuler).
- Moderasi Admin: approve/hapus/ban, filter kata kasar otomatis (bad-word list).
- Notifikasi balasan komentar hanya in-app; **tidak memicu push notification**.

---

## 13. Monetisasi

### 13.1 Merchandise
- Katalog produk (kaos, mug, stiker, dsb) dengan foto, varian, stok.
- Setiap produk punya **harga rupiah + harga poin**; member dapat membayar dengan poin.
- Keranjang + checkout melalui **PAKASIR.COM** (rupiah) atau potong poin (ledger).
- Webhook pembayaran wajib diverifikasi server-side, idempotent, dan dicatat di audit log.
- Manajemen pesanan oleh Admin (baru/dibayar/diproses/dikirim/selesai/refund).

### 13.2 Membership & Kontributor Berita
- Paket tunggal **tahunan Rp99.900** melalui PAKASIR.COM.
- Benefit: artikel eksklusif, bebas iklan, badge member, serta akses mengirim berita sebagai kontributor.
- Artikel member selalu masuk workflow moderasi: Draft → Review → Revisi/Ditolak/Disetujui.
- **Sistem Poin (default, dapat diubah Super Admin):**
  - 1 artikel **approved** = **2 poin**; 1 poin = **Rp1.000**.
  - Target: **50 artikel approved/bulan = 100 poin = Rp100.000**.
  - Batas maksimal **10 artikel approved per hari** per member.
  - Counter bulanan reset tiap tanggal 1; poin berlaku 12 bulan.
- **Dashboard member**: progress bar `X/50 artikel bulan ini`, saldo poin, estimasi rupiah, riwayat approved, dan riwayat redeem.
- **Redeem:**
  - **Cash**: minimum 100 poin (Rp100.000), cair ≤ 7 hari kerja setelah disetujui Admin.
  - **Produk**: tukar poin langsung di halaman **Produk & Merchandise** sesuai harga poin produk.
- Poin memakai ledger immutable agar seluruh perolehan, pembatalan, dan redemption dapat diaudit.
- **Form Kirim Berita Member:** judul, kategori, lokasi, tanggal kejadian, isi, media picker, sumber/fakta pendukung, pernyataan orisinalitas, persetujuan syarat, dan preview.
- **Form Redeem Poin:** tipe pencairan (produk/cash), jumlah poin, produk/rekening/e-wallet, nama pemilik, catatan, status review, dan riwayat.
- Anti-abuse: pemeriksaan plagiarisme, duplicate content, rate limit, bukti sumber, fraud flag, dan pembatalan poin jika artikel dicabut.
- Pencairan cash dapat dikenakan potongan pajak sesuai regulasi (parameter dikelola Super Admin).
- Paywall: non-member melihat paragraf awal + blur + CTA langganan.

### 13.3 Iklan
- Slot iklan (banner, in-article) dikelola Super Admin; disembunyikan untuk member.

---

## 14. SEO Super Power & Performa

### 14.1 Patokan Resmi
Implementasi mengikuti, bukan menyalin verbatim, dokumentasi resmi berikut agar selalu bisa diperbarui saat panduan berubah:
- [Google Search Central — Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Schema.org — NewsArticle](https://schema.org/NewsArticle)
- Google Search Essentials, Google News content policies, dan pedoman gambar Google Images.

### 14.2 SEO Teknis Seluruh Halaman
- SSR/SSG/ISR untuk halaman publik, URL bersih (`/kategori/slug-artikel`), canonical absolut `https://swapnews.co.id/...`.
- Metadata unik tiap page/post: title, meta description, robots, canonical, author, publisher, dan hreflang `id-ID` bila diperlukan.
- **Open Graph + X Cards di setiap page/post**: `og:type`, `og:site_name`, `og:locale`, title, description, URL, image, image width/height/alt; artikel menambah published/modified time, section, dan tags.
- Sitemap index terpisah untuk post, category, page, author, product, dan **Google News sitemap 48 jam terakhir**; RSS otomatis dan robots.txt.
- Breadcrumb internal, related content, pagination crawlable, redirect 301, custom 404/410, dan pencegahan orphan page.
- Search Console, Bing Webmaster, IndexNow (jika relevan), Core Web Vitals, crawl-error dashboard, dan SEO audit log.

### 14.3 Structured Data JSON-LD
- Homepage: `Organization`, `WebSite`, dan `SearchAction` bila sesuai kelayakan Google.
- Artikel: `NewsArticle` dengan `headline`, `description`, `image` 1:1/4:3/16:9, `datePublished`, `dateModified`, `author` (`Person` + profile URL), `publisher` (`Organization` + logo), `mainEntityOfPage`, `articleSection`, `keywords`, `isAccessibleForFree`, dan `speakable` bila layak.
- Halaman lain: `BreadcrumbList`, `ProfilePage`, `CollectionPage`, `Product`, `Offer`, dan `FAQPage` hanya ketika konten terlihat memenuhi kebijakan Google.
- Data schema wajib sama dengan konten terlihat; tidak boleh fake rating, hidden content, atau schema spam.
- Validasi otomatis memakai Schema Markup Validator, Google Rich Results Test, dan URL Inspection sebelum rilis.

### 14.4 On-page & Editorial SEO
- Editor menampilkan skor/checklist, bukan janji ranking: panjang title/description, slug, heading hierarchy, keyword alami, alt image, internal link, sumber, byline, tanggal perbarui, dan preview SERP/OG.
- Prinsip people-first: orisinal, akurat, transparan, punya penulis/profil, koreksi, sumber primer, dan editorial policy.
- Gambar crawlable, minimal 50.000 piksel, relevan, tidak memakai logo sebagai hero, lazy-load tanpa menghalangi Googlebot.
- Target Core Web Vitals: LCP ≤ 2,5s, INP ≤ 200ms, CLS ≤ 0,1 pada persentil ke-75.
- WebP 40% + Cloudinary CDN, preload hero, responsive `srcset`, font subset, dan cache berjenjang.

---

## 15. Rekomendasi Tech Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | SSR/SEO, PWA, API routes |
| Styling | **Tailwind CSS** + semantic design tokens + CSS variables | Sistem desain premium, konsisten, responsif; utility tidak boleh menjadi styling ad-hoc |
| Animasi | Framer Motion | Spring/bounce clay |
| Ikon | **lucide-react** | Ikon konsisten, bukan emoji native |
| Database | PostgreSQL via **Supabase** (auth + RLS) | Data aplikasi dan metadata media saja |
| Auth | Supabase Auth (email + Google) | Role-based + RLS |
| Media | **Cloudinary** (signed upload + transform) | Semua binary media, auto WebP, smart crop, CDN |
| Editor | **Tiptap** (headless, block-based) | Pengalaman ala WordPress |
| Push | **OneSignal Web Push** | Push manual PWA oleh Super Admin |
| Hosting dev | Vercel Hobby | Preview dan development |
| Hosting production | Cloudflare Pages/Workers atau platform komersial-free yang sah | Free tier Vercel Hobby tidak sesuai untuk situs komersial |
| Payment | **PAKASIR.COM** | Pembayaran membership dan merchandise |

---

## 16. Non-Fungsional

- **Keamanan**: RLS di DB, rate-limit komentar, sanitasi konten editor, RBAC ketat (Admin ≠ kredensial ≠ push).
- **Skalabilitas**: cache berjenjang, CDN media Cloudinary, metadata ringan di Supabase.
- **Reliabilitas**: uptime target 99.9%, backup DB terjadwal, audit log.
- **Aksesibilitas**: kontras AA meski teks kecil, target sentuh ≥ 40px, alt text wajib.
- **Kepatuhan kuota**: dashboard penggunaan Supabase, Cloudinary, OneSignal, dan Upstash wajib dipantau sebelum limit free tier terlampaui.

---

## 17. Metrik Keberhasilan

- Lighthouse PWA ≥ 95; LCP < 2s (4G).
- Install rate PWA ≥ 10% pengunjung mobile.
- Push opt-in ≥ 30%; CTR notif ≥ 8% (diukur dari campaign manual Super Admin).
- Waktu publish (submit → terbit) < 4 jam.
- Konversi membership ≥ 2% dari member login.
- 0 insiden kuota free tier habis tanpa peringatan (semua penggunaan < 80% limit).

---

## 18. Roadmap

| Fase | Isi |
|---|---|
| **Fase 1 (Fondasi)** | Portal inti single-tenant, 4 role + RBAC/RLS, editor + media picker Cloudinary WebP 40%, komentar moderasi, OneSignal push manual Super Admin, PWA, SEO/schema, halaman legal, desain Tailwind Claymorphism |
| **Fase 2 (Monetisasi + Kontributor)** | PAKASIR.COM, membership Rp99.900/tahun, paywall, kirim berita member, ledger poin, redeem produk/cash, merchandise, iklan |
| **Fase 3 (Optimasi)** | Analitik dashboard, CI/CD pipeline, upgrade search, segmentasi push manual, eksperimen personalisasi, wrapper aplikasi bila dibutuhkan |

---

## 19. Keputusan Produk yang Telah Disetujui

1. Domain final: **SWAPNEWS.CO.ID**.
2. Bahasa konten: **Bahasa Indonesia saja**.
3. Payment gateway: **PAKASIR.COM**.
4. Semua komentar guest dan member: **moderasi sebelum tampil**.
5. Membership: **Rp99.900/tahun**, termasuk hak kirim berita; 2 poin per artikel approved; target 50 approved/bulan = Rp100.000; maksimal 10 artikel approved per hari.
6. Kategori tambahan: **Hukum & Kriminal**; homepage punya Trending Topic slider 5 kartu.
7. Arsitektur: **PWA single-tenant**, bukan SaaS multi-tenant.
8. Push notification: **hanya manual oleh Super Admin**, tidak ada trigger otomatis.
9. Styling: **Tailwind CSS** dengan design token premium Claymorphism.
10. Gambar: WebP kualitas **40%**, dengan preview dan validasi kualitas; binary di Cloudinary, metadata di Supabase.
11. Strategi biaya awal: **free tier semaksimal mungkin** dengan monitoring kuota.

---

## 20. Halaman Legal & Kebijakan (Page Editor)

Konten default disiapkan sistem; **dapat diedit kapan saja oleh Admin & Super Admin melalui Page Editor** di backend (rich text + SEO meta, versioned):

1. Syarat & Ketentuan Layanan.
2. Kebijakan Privasi (UU PDP).
3. Pedoman Media Siber (sesuai standar Dewan Pers).
4. Perjanjian Kontributor: lisensi konten ke SwapNews, orisinalitas, sanksi plagiarisme, pencabutan poin, penyelesaian sengketa.
5. Ketentuan Poin & Redeem: nilai tukar, minimum, masa tunggu, pajak, kedaluwarsa.
6. Kebijakan Refund & Pembatalan (membership/merchandise).
7. Disclaimer & Kebijakan Koreksi/Hak Jawab.
8. Editorial Policy: standar verifikasi, byline, sumber anonim, update artikel.

---

## 21. Arsitektur Sistem — 13 Layer

| # | Layer | Teknologi & Implementasi |
|---|---|---|
| 1 | **Frontend** | Next.js 14 App Router, Tailwind CSS + design tokens, Framer Motion, lucide-react, PWA (serwist), mobile-density ala Gojek |
| 2 | **API & Backend Logic** | Next.js Route Handlers + Server Actions; background jobs via Supabase Edge Functions & cron untuk notif terjadwal, ledger poin, cleanup media |
| 3 | **Database & Storage** | Supabase PostgreSQL (single-tenant + RLS), Cloudinary (semua binary media), Upstash Redis (queue & cache panas) |
| 4 | **Auth & Authorization** | Supabase Auth (email + Google OAuth), JWT berisi `role`, session refresh, proteksi route per role |
| 5 | **Hosting & Deployment** | Vercel Hobby untuk development/preview; production di Cloudflare Pages/Workers atau platform komersial-free yang sah; domain `swapnews.co.id` |
| 6 | **Cloud Compute** | Serverless functions, Supabase Edge Functions, Cloudinary transformation engine |
| 7 | **CI/CD & Version Control** | GitHub + GitHub Actions: lint → typecheck → test → build → migrasi DB → deploy; branch protection + preview deploy per PR |
| 8 | **Role Level Security** | Postgres RLS per role, policy terpisah Super Admin/Admin/Wartawan/Visitor, server-side permission guard, audit log |
| 9 | **Rate Limiting** | Upstash Ratelimit per IP/user/endpoint (login, komentar, kirim berita, redeem), Cloudflare WAF + bot protection |
| 10 | **Cache & CDN** | Cloudflare CDN, ISR/stale-while-revalidate untuk artikel, Cloudinary CDN untuk gambar |
| 11 | **Load Balancer & Scaling** | Edge network hosting, Supabase connection pooling, read replica saat trafik naik |
| 12 | **Error Tracking & Logging** | Sentry (frontend + backend), structured logging, alert ke email/Telegram admin |
| 13 | **Availability & Recovery** | Target uptime 99.9%, backup DB terjadwal + ekspor berkala, RPO ≤ 24 jam, RTO ≤ 4 jam, runbook disaster recovery |

---

## 22. Keputusan Final (Terkunci)

1. Domain **swapnews.co.id**, Bahasa Indonesia saja, payment **PAKASIR.COM**.
2. Semua komentar termoderasi; Tailwind CSS; WebP 40% + varian 1:1/4:3/16:9.
3. Membership **Rp99.900/tahun**; **2 poin per artikel approved** (1 poin = Rp1.000) → **50 approved/bulan = Rp100.000**; maks 10 approved/hari; redeem cash min 100 poin atau tukar produk di halaman Merchandise.
4. **PWA single-tenant**, satu organisasi; SaaS/multi-tenant di luar scope versi 3.0.
5. **Push notification hanya manual oleh Super Admin**; tidak ada trigger otomatis (terbit, viral, komentar).
6. **Semua binary media di Cloudinary**; Supabase hanya menyimpan data aplikasi dan metadata media.
7. Halaman legal default dibuat sistem, editable via Page Editor.
8. Free tier dipakai maksimal dengan monitoring kuota; production hosting wajib pada platform yang mengizinkan penggunaan komersial.

---

## 23. Gap & Spesifikasi Lanjutan (Hasil Audit)

Belum dispesifikasi penuh; butuh keputusan/detail sebelum atau selama development:

| # | Gap | Dampak | Prioritas |
|---|---|---|---|
| 1 | View-tracking belum didefinisikan (unik per sesi? anti-bot?) | Counter trending & terpopuler tidak akurat | **Tinggi** |
| 2 | Aturan BACA JUGA/merch saat artikel < 2 / < 4 paragraf | Edge case render artikel pendek | **Tinggi** |
| 3 | Payout cash ke member belum jelas metodenya (PAKASIR payout? transfer manual Admin?) | Blokir redeem cash | **Tinggi** |
| 4 | Email transaksional (verifikasi, reset password, notif status artikel) belum punya provider | Blokir registrasi | **Tinggi** |
| 5 | Widget beranda (cuaca/kurs) belum masuk roadmap manapun | Fitur yatim | Sedang |
| 6 | Sistem iklan detail (jenis slot, self-serve?) belum dirinci | Fitur yatim | Sedang |
| 7 | Scope dashboard analitik & event tracking belum dirinci | Fitur yatim | Sedang |
| 8 | Setup CI/CD, Sentry, Upstash, Cloudflare belum dijadwalkan di roadmap | Infrastruktur belum teralokasi | Sedang |
| 9 | Data retention & right-to-erasure (UU PDP) belum didefinisikan | Kepatuhan legal | Sedang |
| 10 | Kebijakan kuota free tier per layanan (ambang upgrade, owner monitoring) belum dirinci | Risiko layanan berhenti saat limit habis | Sedang |

**Usulan prioritas implementasi:** (1) Payout, (2) Email provider, (3) View tracking, (4) Edge case artikel pendek — sisanya menyusul di backlog.
