# System Architecture & Complete Workflow Specification
**Project:** SWAPNEWS.CO.ID  
**Doc Version:** 1.0.0 (End-to-End Execution & Database Flow)

---

## 1. High-Level System Architecture Diagram

```mermaid
graph TD
    Client[Browser / User Device] --> Edge[Cloudflare / Edge CDN]
    Edge --> MW[Next.js Middleware & Waiting Room]
    
    subgraph "Next.js 16 Application Layer"
        MW --> PublicRoutes["Public Pages (/artikel, /kanal, /cari)"]
        MW --> MemberRoutes["Member Area (/member, /profile)"]
        MW --> WartawanRoutes["Newsroom (/dashboard/wartawan)"]
        MW --> AdminRoutes["CMS Super Admin (/dashboard/*)"]
        MW --> API["API Endpoints & Server Actions"]
    end

    subgraph "State, Cache & Media Services"
        API --> Redis[Upstash Redis: Waiting Room / Rate Limit]
        API --> Cloudinary[Cloudinary CDN: Optimized Images]
        API --> Mail[Nodemailer: SMTP Dispatcher]
        API --> Pakasir[Pakasir Payment Gateway]
    end

    subgraph "Database & Auth Layer (Supabase)"
        API --> Auth[Supabase Auth: JWT Session]
        API --> DB[(PostgreSQL 15 + RLS)]
    end
```

---

## 2. Comprehensive Feature Workflows (End-to-End)

### Flow 1: Public Traffic, Waiting Room & Article Consumption

```mermaid
sequenceDiagram
    autonumber
    actor Reader as Pembaca (Guest/Public)
    participant MW as Middleware (Proxy)
    participant Redis as Upstash Redis
    participant Page as Next.js Server (RSC)
    participant DB as Supabase Database

    Reader->>MW: Akses /artikel/[slug]
    MW->>Redis: Cek Status Traffic (Waiting Room)
    alt Traffic Normal
        MW->>Page: Teruskan Request
    else Traffic Spike
        MW-->>Reader: Redirect /waiting-room (Antrean)
    end

    Page->>DB: Query `articles` (Selected Columns) WHERE slug = [slug]
    Page->>DB: Query `categories`, `media_assets`, `article_insertion_settings`
    DB-->>Page: Return Data Terpilih (No Wildcard)
    Page-->>Reader: Render HTML Artikel + Ads + Inline Products + Reading Time
    
    Reader->>DB: Trigger View Count via Server Action / RPC
    DB-->>DB: Increment `view_count` on `articles`
```

---

### Flow 2: Authentication, RBAC & Role Routing

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Admin / Wartawan
    participant UI as Login Page (/panelswap /login)
    participant Auth as Supabase Auth
    participant DB as Supabase Profiles Table
    participant Router as Next.js Redirect Engine

    User->>UI: Input Email & Password (atau OTP)
    UI->>Auth: signInWithPassword()
    Auth-->>UI: Return JWT Session Cookie
    UI->>DB: Query `profiles` WHERE id = auth.uid()
    DB-->>UI: Return { role: "super_admin" | "editor" | "wartawan" | "member" }
    
    alt role == "super_admin"
        Router-->>User: Redirect ke /dashboard
    else role == "wartawan"
        Router-->>User: Redirect ke /dashboard/wartawan
    else role == "member"
        Router-->>User: Redirect ke /member
    end
```

---

### Flow 3: Editorial & Newsroom Lifecycle (Wartawan -> Editor -> Published)

```mermaid
sequenceDiagram
    autonumber
    actor Wartawan as Wartawan / Penulis
    actor Editor as Redaktur / Editor
    participant EditorUI as Tiptap Workspace
    participant Cloudinary as Cloudinary API
    participant DB as Supabase `articles` & `media_assets`
    participant Public as Portal SwapNews Publik

    Wartawan->>EditorUI: Tulis Berita & Upload Foto
    EditorUI->>Cloudinary: Direct Upload Media
    Cloudinary-->>EditorUI: Return `secure_url` (WebP/AVIF)
    EditorUI->>DB: INSERT into `media_assets`
    Wartawan->>DB: INSERT / UPDATE `articles` (status = "draft")
    Wartawan->>DB: Submit Artikel (status = "submitted")

    Editor->>DB: Ambil List Review (`/dashboard/wartawan/review`)
    alt Butuh Revisi
        Editor->>DB: UPDATE status = "draft" + Isi `editorial_notes`
        DB-->>Wartawan: Tampil Notifikasi Revisi di Workspace
    else Disetujui
        Editor->>DB: UPDATE status = "published", `published_at` = NOW()
        DB-->>Public: Artikel Muncul di Homepage, Kanal, & Sitemap News
    end
```

---

### Flow 4: Member Gamifikasi (Reading History, Poin & Penukaran)

```mermaid
sequenceDiagram
    autonumber
    actor Member as Member Login
    participant Client as Web Browser
    participant API as /api/member/*
    participant DB as Supabase (`reading_history`, `profiles`, `point_transactions`)

    Member->>Client: Membaca Artikel selama > 30 Detik
    Client->>API: POST /api/member/reading-history { article_id }
    API->>DB: Cek apakah hari ini sudah dapat poin dari artikel ini
    alt Belum Tercatat
        API->>DB: INSERT into `reading_history`
        API->>DB: UPDATE `profiles` SET points = points + 10
        API->>DB: INSERT into `point_transactions` (type: "earn_reading")
    end

    Member->>Client: Buka Menu Redeem (/member/redeem)
    Member->>API: POST /api/member/redeem { reward_id, points_cost }
    API->>DB: Validasi Saldo Poin Member
    API->>DB: DEDUCE `profiles.points` & INSERT `point_transactions` (type: "redeem")
```

---

### Flow 5: Merchandise E-Commerce & Pakasir Payment Gateway

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Pembeli (Member/Guest)
    participant Store as Halaman /merchandise
    participant CheckoutAPI as /api/pakasir/checkout
    participant Pakasir as Pakasir Payment Gateway
    participant WebhookAPI as /api/pakasir/webhook
    participant DB as Supabase (`orders`, `products`)

    Buyer->>Store: Pilih Merchandise & Input Alamat Kirim
    Store->>CheckoutAPI: POST Checkout { product_id, qty, buyer_info }
    CheckoutAPI->>DB: INSERT into `orders` (status = "pending")
    CheckoutAPI->>Pakasir: Create Transaction Payload
    Pakasir-->>Store: Return Payment URL / QRIS
    Store-->>Buyer: Tampilkan QRIS / Halaman Bayar

    Buyer->>Pakasir: Selesaikan Pembayaran (QRIS/VA)
    Pakasir->>WebhookAPI: POST Webhook { order_id, status: "completed", signature }
    WebhookAPI->>WebhookAPI: Validasi Secret Signature
    WebhookAPI->>DB: UPDATE `orders` SET status = "paid"
    WebhookAPI->>DB: UPDATE `products` SET stock = stock - qty
```

---

### Flow 6: CMS Super Admin & Dynamic Injections

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Super Admin
    participant CMS as /dashboard/*
    participant DB as Supabase Settings Tables
    participant ArticlePage as /artikel/[slug]

    Admin->>CMS: Konfigurasi Slot Iklan (`ad_slots`) & Homepage Section
    Admin->>CMS: Konfigurasi Sisipan Paragraf (`article_insertion_settings`):
    Note over Admin,CMS: Atur 'Baca Juga', Produk Inline, Iklan HTML, Pesan Copy
    CMS->>DB: UPSERT `article_insertion_settings`
    
    ArticlePage->>DB: Ambil Settings Sekali (React Server Cache)
    ArticlePage-->>ArticlePage: Injeksi otomatis komponen ke Paragraf N
```

---

## 3. Database Entity Relationship & Data Flow

```mermaid
erDiagram
    PROFILES ||--o{ ARTICLES : "writes (author_id)"
    CATEGORIES ||--o{ ARTICLES : "belongs_to (category_id)"
    CATEGORIES ||--o{ CATEGORIES : "parent_category (parent_id)"
    MEDIA_ASSETS ||--o{ ARTICLES : "featured_image (featured_media_id)"
    ARTICLES ||--o{ ARTICLE_COMMENTS : "has_comments"
    PROFILES ||--o{ ARTICLE_COMMENTS : "writes_comment"
    
    PROFILES ||--o{ READING_HISTORY : "tracks"
    ARTICLES ||--o{ READING_HISTORY : "read_by"
    PROFILES ||--o{ POINT_TRANSACTIONS : "has_points_ledger"
    
    PRODUCTS ||--o{ ORDERS : "ordered_in"
    PROFILES ||--o{ ORDERS : "purchased_by"
    
    ARTICLE_INSERTION_SETTINGS ||--o| PRODUCTS : "inlines_product (product_id)"
    
    HOMEPAGE_SECTIONS {
        string section_key PK
        string title
        boolean is_enabled
        int sort_order
        string style_variant
    }

    AD_SLOTS {
        string id PK
        string name
        string position
        text html_code
        boolean is_active
    }

    BREAKING_NEWS {
        uuid id PK
        string headline
        string target_url
        int priority
        boolean is_active
    }
```

---

## 4. Keamanan & Efisiensi Data (2026 Standard)

1. **Anti-Egress Query Architecture:**
   - Semua read list memakai selective projections (`id, slug, title, excerpt, ...`).
   - Body HTML penuh (`content`) hanya ditarik saat single article route dibuka.
2. **PostgreSQL Row Level Security (RLS):**
   - Publik hanya bisa `SELECT` artikel berstatus `published`.
   - Wartawan hanya bisa `UPDATE` artikel miliknya yang berstatus `draft`.
   - Super Admin memiliki bypass policy penuh melalui `auth.jwt() -> role = 'super_admin'`.
3. **Webhook Idempotency:**
   - Webhook Pakasir diverifikasi dengan secret signature dan pengecekan status order sebelum memotong stok barang.
