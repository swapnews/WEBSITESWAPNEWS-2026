# System & Project Requirements Specification
**Project Name:** SWAPNEWS.CO.ID  
**Domain:** https://swapnews.co.id  
**Type:** Portal Berita Digital Modern, CMS Editorial Wartawan, Monetisasi & Ekosistem Member  
**Version:** 1.0.0 (Tahun 2026 Production Ready)  

---

## 1. Executive Overview
SWAPNEWS.CO.ID adalah portal berita digital skala enterprise berperforma tinggi yang dibangun dengan arsitektur modern Next.js 16 (Turbopack) & Supabase. Portal ini mengintegrasikan ekosistem jurnalisme lengkap: mulai dari pembaca publik, sistem keanggotaan (member & points), alur kerja redaksi/wartawan berjenjang, manajemen iklan fleksibel, hingga penjualan merchandise dan monetisasi digital.

---

## 2. Tech Stack & Dependencies

### Core Framework & Frontend
- **Framework:** Next.js 16.3.0 (App Router, Server Actions, Dynamic & Static Route Segments, Turbopack)
- **Language:** TypeScript 5.x
- **UI Library / React:** React 19.2.8 & React DOM 19.2.8
- **Styling:** Tailwind CSS 4.x & Modern Vanilla Custom CSS (Claymorphism, Glassmorphism, Micro-animations)
- **Icons:** `lucide-react`
- **Animation:** `framer-motion`
- **Rich Text Editor:** Tiptap Editor Suite (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-underline`)

### Backend & Infrastructure
- **Database & Auth:** Supabase (PostgreSQL 15+, Row Level Security (RLS), Supabase Auth via `@supabase/ssr` & `@supabase/supabase-js`)
- **Cache & Rate Limiting / Waiting Room:** Upstash Redis (`@upstash/redis`)
- **Media & Asset Storage:** Cloudinary (`cloudinary` API) & Supabase Storage
- **Transactional Email:** Nodemailer (`nodemailer` + `@types/nodemailer`)
- **Payment Gateway:** Pakasir API (Checkout & Webhook Integration)

---

## 3. System Architecture & Role-Based Access Control (RBAC)

Aplikasi menerapkan sistem otorisasi multi-role yang diamankan melalui Supabase Auth & Row Level Security:

1. **Public / Guest:**
   - Akses membaca portal berita tanpa login.
   - Fitur pencarian berita, filter kanal kategori, pembagian artikel (social share).
   - Widget kurs mata uang Bali (Bali Currency Converter) & Breaking News ticker.
   - Dynamic OpenGraph (OG) Images generator otomatis per artikel (`/og-image/[id]`).

2. **Member / Pembaca Terdaftar (`role: member`):**
   - Halaman profil member (`/member`, `/profile`).
   - Sistem poin membaca artikel (Gamifikasi Reading History).
   - Penukaran poin (Redeem rewards/merchandise).
   - Pembelian produk / merchandise portal berita melalui Pakasir Payment Gateway.
   - Fitur "Kirim Berita" (Citizen Journalism / Kontributor Komunitas).

3. **Wartawan / Penulis (`role: wartawan`):**
   - Ruang kerja khusus jurnalis (`/dashboard/wartawan`, `/dashboard/wartawan/workspace`).
   - Penulisan artikel dengan Rich Text Editor Tiptap (SEO metadata, cover media, tag, kategori).
   - Manajemen status draf artikel (`draft`, `submitted`).
   - Notifikasi artikel yang butuh revisi dari editor.

4. **Editor / Redaktur (`role: editor`):**
   - Editorial Quality Control & Review Workspace (`/dashboard/wartawan/review`).
   - Verifikasi berita, revisi catatan editorial, hingga penerbitan (`published`, `rejected`).

5. **Super Admin / Manajemen (`role: super_admin`):**
   - Akses penuh ke seluruh kontrol panel (`/dashboard`):
     - **Manajemen Artikel:** Semua artikel, draf, arsip, dan jadwal publikasi.
     - **Kategori & Taksonomi:** Pengaturan hierarki kanal dan sub-kanal.
     - **Homepage Controller:** Urutan section homepage (Carousel, Arena, Mosaic, Scoreboard).
     - **Manajemen Iklan (Ad Slots):** Pengaturan slot banner, popup, sticky, in-article ads.
     - **Sisipan Artikel (Article Insertions):** Konfigurasi otomatis "Baca Juga", produk inline, iklan HTML di sela paragraf.
     - **Social Reels & Video:** Kurasi feed Instagram/TikTok reels embed.
     - **Breaking News Manager:** Ticker berita darurat/headline prioritas.
     - **SEO & Webmaster Settings:** Meta tag global, robot indexing, Google News Sitemap.
     - **Merchandise & Transaksi:** Manajemen stok barang dan status order Pakasir.
     - **Sistem & Monitoring:** Waiting Room traffic limiter (Upstash Redis), log aktivitas.

---

## 4. Rincian Fitur Utama (Feature Breakdown)

### A. Portal Publik & Pembaca
- **Homepage Dinamis:** Hero banner, Breaking News ticker, Trending Top 10, Kanal Pilihan, Games Arena, Sports Focus, Bali Kini, Reels Carousel.
- **Kanal / Kategori:** Halaman per topik (`/kanal/[slug]`) dengan sub-kategori breadcrumbs.
- **Halaman Artikel (`/artikel/[slug]`):**
  - Render typography nyaman dengan estimasi waktu baca (reading time).
  - Sisipan dinamis: "Baca Juga", Rekomendasi Merchandise, Iklan In-article, Box Pesan Copy Proteksi.
  - Tracking views otomatis & sistem komentar.
- **Halaman Statis Dinamis (`/page/[slug]`):** Redaksi, Pedoman Media Siber, Kontak, Privacy Policy, Terms, dll.
- **Pencarian Cepat (`/cari`):** Filter pencarian artikel berdasarkan kata kunci, tanggal, dan kategori.

### B. Newsroom & Editorial Engine
- **Tiptap WYSIWYG Editor:** Dukungan format teks kaya, heading, link, embed gambar media library, dan clean HTML generation.
- **Media Asset Manager:** Integrasi Cloudinary untuk upload gambar tanpa membebani storage lokal, kompresi otomatis WebP/AVIF.
- **SEO Assistant Internal:** Kolom SEO Title, Focus Keyword, Meta Description, dan Live Slug preview.

### C. Monetisasi & E-Commerce
- **Slot Iklan Terstruktur:**
  - Header Banner, Sidebar Right Sticky, In-Content Paragraph 2/4/6, Bottom Sticky, Interstitial Popup.
- **Merchandise Store (`/merchandise`):**
  - Katalog kaos/souvenir resmi portal berita.
  - Checkout otomatis terintegrasi Payment Gateway Pakasir (QRIS, VA Bank, E-Wallet).
  - Webhook callback handler (`/api/pakasir/webhook`) untuk update status pembayaran otomatis.

### D. Infrastruktur & Performa (Anti-Overload & Anti-Egress)
- **Zero Wildcard Query:** Semua pemanggilan database memakai selected fields (menghindari memory overhead & egress spike).
- **React Server Components (RSC) + Cache & ISR:** Revalidasi pintar untuk halaman statis berita dan sitemap XML (`/sitemap.xml`, `/sitemap-news.xml`).
- **Waiting Room / Traffic Spike Controller:** Menggunakan Upstash Redis untuk mengantre pengunjung jika traffic server melonjak.

---

## 5. Environment Variables & Konfigurasi yang Diperlukan

Untuk menjalankan proyek ini secara lokal maupun production di cloud (Vercel / VPS), variabel berikut wajib diisi:

```env
# === Supabase Core ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# === Application URL ===
NEXT_PUBLIC_SITE_URL=https://swapnews.co.id

# === Cloudinary Media Storage ===
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# === Upstash Redis (Waiting Room & Rate Limit) ===
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# === Pakasir Payment Gateway ===
PAKASIR_API_KEY=your_pakasir_key
PAKASIR_PROJECT_ID=your_project_id
PAKASIR_WEBHOOK_SECRET=your_webhook_secret

# === SMTP / Email Notification (Nodemailer) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=redaksi@swapnews.co.id
SMTP_PASS=your_app_password
SMTP_FROM="SwapNews Redaksi <redaksi@swapnews.co.id>"
```

---

## 6. Database Schemas (Supabase / PostgreSQL)

Database mencakup tabel-tabel terstruktur berikut:
1. `profiles` (Data pengguna, role RBAC, poin member, avatar)
2. `categories` (Hierarki kategori, sub-kategori, SEO slug)
3. `articles` (Konten artikel, status editorial, slug, counter views, author, media)
4. `media_assets` (URL Cloudinary, dimensi, metadata ALT text)
5. `article_comments` (Komentar pembaca pada artikel)
6. `ad_slots` (Konfigurasi materi iklan, posisi slot, script/gambar, tracking)
7. `article_insertion_settings` (Pengaturan injeksi konten dinamis pada artikel)
8. `social_reels` (Kurasi video pendek vertikal)
9. `breaking_news` (Headline darurat/ticker berprioritas)
10. `homepage_sections` (Pengaturan tata letak dan visibilitas homepage)
11. `products` & `orders` (Katalog merchandise, transaksi, status pembayaran Pakasir)
12. `reading_history` & `point_transactions` (Gamifikasi pembaca & penukaran reward)
13. `pages` (Halaman statis reguler/legal portal)
14. `seo_settings` (Konfigurasi global webmaster & JSON-LD schema)

---

## 7. Cara Menjalankan Project (Deployment & Local Run)

### Local Development:
```bash
# 1. Install dependencies
npm install

# 2. Jalankan server lokal
npm run dev

# 3. Test Build Produksi
npm run build
```

### Production Deployment (Vercel):
1. Import repository GitHub `swapnews/WEBSITESWAPNEWS-2026`.
2. Masukkan semua **Environment Variables** di atas pada tab Project Settings Vercel.
3. Klik **Deploy**.
