# Product Requirement Document (PRD)
**Product Name:** SWAPNEWS.CO.ID  
**Domain:** https://swapnews.co.id  
**Document Version:** 1.0.0 (Production Master Standard)  
**Status:** Approved for Production  
**Target Release:** 2026  

---

## 1. Executive Summary & Product Vision

### 1.1 Product Vision
SWAPNEWS.CO.ID dirancang untuk menjadi portal berita digital modern generasi baru yang memadukan **kecepatan akses (ultra-low latency)**, **jurnalisme berkualitas tinggi**, dan **ekosistem interaktif pembaca (gamifikasi poin & e-commerce)**. 

### 1.2 Target Audience & Personas
1. **Pembaca Berita Kasual & Loyal:** Mengakses informasi terkini (Nasional, Daerah Bali, Ekonomi, Sports, Games) dengan cepat tanpa lagging di perangkat seluler maupun desktop.
2. **Anggota / Member Komunitas:** Mengumpulkan poin dari aktivitas membaca, menukarkan reward, dan berpartisipasi dalam citizen journalism ("Kirim Berita").
3. **Wartawan & Kontributor:** Jurnalis lapangan yang membutuhkan CMS cepat, ringan, dan intuitif untuk menyusun berita dan mengunggah liputan media langsung dari HP/laptop.
4. **Redaktur / Editor:** Memeriksa akurasi berita, melakukan koreksi tata bahasa, dan memvalidasi kelayakan terbit (Editorial QC).
5. **Manajemen / Super Admin & Tim Iklan:** Mengontrol sirkulasi konten, mengoptimalkan pendapatan melalui iklan dinamis, menjual merchandise resmi, dan memantau performa trafik secara real-time.

---

## 2. Business Objectives & Success Metrics (KPIs)

| Objective | Key Performance Indicator (KPI) | Target 2026 |
| :--- | :--- | :--- |
| **Performance** | Core Web Vitals (LCP, FID, CLS) | Skor Google PageSpeed > 90 pada Mobile & Desktop |
| **Infra Efficiency** | Database Egress & Bandwidth Leak | Zero Egress Spillover (< 5 GB/bulan pada traffic normal via seleksi kolom & ISR) |
| **User Engagement** | Avg. Time on Site & Retention | Meningkat 40% melalui gamifikasi membaca & reels |
| **Monetization** | Ad CTR & Merchandise Sales | Konversi klik iklan meningkat 25% melalui smart paragraph injection |
| **Editorial Speed** | Time-to-Publish Breaking News | Kurang dari 2 menit dari draf wartawan hingga terbit di sitemap Google News |

---

## 3. Product Scope & Functional Requirements

### 3.1 Portal Publik (Reader Experience)
- **FR-PUB-01 (Responsive Home Shell):** Header adaptif, breaking news ticker darurat, navigasi kanal dinamis, hero highlight, dan floating share button.
- **FR-PUB-02 (Modular Content Sections):**
  - *Pilihan Kanal* (Tab filter kategori cepat).
  - *Reels Carousel* (Embed video vertikal Instagram/TikTok).
  - *Games Arena & Sports Focus* (Layout khusus topik esports dan sepak bola).
  - *Bali Kini* (Kanal khusus daerah dan pariwisata).
  - *Berita Terkini* (Infinite / Paginated editorial list).
- **FR-PUB-03 (Single Article Consumption):**
  - Typography ramah mata, estimasi waktu baca (*reading time*), nama jurnalis & editor.
  - Injeksi otomatis: Blok "Baca Juga", Kartu Merchandise Inline, Iklan HTML Paragraf N, dan Box Pesan Copy Proteksi.
  - Komentar artikel publik dengan moderasi.
  - Counter views otomatis tanpa memicu query berat.
- **FR-PUB-04 (Pencarian & Arsip):** Pencarian real-time berdasarkan kata kunci, rentang tanggal publikasi, dan kategori.
- **FR-PUB-05 (Social & SEO Sharing):** Dynamic OpenGraph (OG) Images generator otomatis per artikel (`/og-image/[id]`), JSON-LD Schema (NewsArticle).

### 3.2 Member Hub & Gamifikasi
- **FR-MEM-01 (Autentikasi & Profil):** Registrasi, login via email/password, upload foto profil, dan dashboard aktivitas.
- **FR-MEM-02 (Gamifikasi Poin):** Sistem pencatat waktu baca (*reading history*). Membaca artikel > 30 detik memberikan reward poin harian.
- **FR-MEM-03 (Redeem Store):** Katalog penukaran poin dengan merchandise resmi atau voucher.
- **FR-MEM-04 (Citizen Journalism):** Form "Kirim Berita" bagi pembaca untuk mengirim liputan komunitas langsung ke meja redaksi.

### 3.3 Newsroom & Editorial Workflow
- **FR-EDT-01 (Tiptap Rich Text Editor):** Formatting teks lengkap, heading, kutipan, embed gambar dari media library dengan alt-text SEO.
- **FR-EDT-02 (Media Management Cloudinary):** Unggah gambar resolusi tinggi dengan kompresi otomatis WebP/AVIF ke Cloudinary.
- **FR-EDT-03 (Status Siklus Berita):**
  - `draft`: Draf pribadi wartawan.
  - `submitted`: Dikirim ke meja redaksi.
  - `published`: Disetujui editor dan tayang ke publik.
  - `rejected` / `revision`: Dikembalikan ke wartawan dengan catatan editorial.
- **FR-EDT-04 (SEO Assistant):** Input Focus Keyword, Meta Title, dan Meta Description dengan indikator skor optimal.

### 3.4 CMS Super Admin (Control Center)
- **FR-ADM-01 (Manajemen Artikel & Kategori):** CRUD artikel, pengaturan hierarki kanal, dan urutan menu.
- **FR-ADM-02 (Homepage Section Manager):** Toggle aktif/nonaktif dan ubah urutan section (Carousel, Scoreboard, Mosaic, Arena).
- **FR-ADM-03 (Ad Slots & Monetization Engine):** Pengaturan slot banner (Header, Sidebar, Sticky Bottom, In-Article).
- **FR-ADM-04 (Article Insertions Control):** Atur frekuensi paragraf untuk "Baca Juga", produk promosi, dan iklan HTML.
- **FR-ADM-05 (Merchandise & Order Tracking):** Manajemen stok barang, pemantauan transaksi masuk, dan status pembayaran Pakasir.
- **FR-ADM-06 (Traffic Spike & Waiting Room):** Kontrol kuota pengunjung antrean Upstash Redis saat terjadi lonjakan traffic berita viral.

---

## 4. Non-Functional Requirements (NFR)

### 4.1 Performance & Scalability
- **Incremental Static Regeneration (ISR):** Halaman publik di-cache di level CDN dan diperbarui otomatis pada latar belakang.
- **Selective Column Projections (Zero Wildcard):** Query database dilarang keras memakai `SELECT *` untuk mencegah pembengkakan egress dan memory buffer.
- **Image Optimization:** Format gambar responsif generasi baru (WebP/AVIF) dengan lazy loading.

### 4.2 Security & Data Protection
- **Row Level Security (RLS):** Seluruh tabel PostgreSQL Supabase diproteksi aturan RLS sesuai JWT role pengguna.
- **Webhook Signature Validation:** Integrasi pembayaran Pakasir divalidasi dengan cryptographic HMAC signature.
- **XSS & Content Sanitization:** Konten HTML dari Tiptap dan Iklan disanitasi sebelum di-render ke browser.

### 4.3 Availability & Reliability
- **Fallback Engine:** Jika database atau API eksternal mengalami kendala sementara, sistem menyajikan *fallback static cache* sehingga situs tidak pernah menampilkan halaman blank/rusak ke pembaca.

---

## 5. Third-Party Integrations & External Services

1. **Supabase (BaaS):** PostgreSQL Database, Auth Engine, Storage API.
2. **Upstash Redis:** Serverless KV untuk Rate Limiting dan Waiting Room Antrean.
3. **Cloudinary:** Media Hosting, CDN gambar, kompresi on-the-fly.
4. **Pakasir:** Payment Gateway lokal untuk transaksi QRIS, Virtual Account, dan E-Wallet.
5. **Nodemailer (SMTP):** Pengiriman notifikasi email transaksi dan pemberitahuan redaksi.

---

## 6. Release & Maintenance Roadmap

- **Phase 1 (Completed):** Core Engine, Anti-Egress DB Layer, Newsroom Tiptap, Cloudinary CDN, Pakasir Payment.
- **Phase 2 (Current Production):** Full Security RLS Audit, Dynamic Injections, Upstash Waiting Room, SEO Rich Snippets.
- **Phase 3 (Future Enhancements):** Push Notifications PWA, AI Automated Content Summarizer, Mobile App (React Native).
