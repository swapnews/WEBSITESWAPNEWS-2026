import { cache } from "react";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getActiveAdSlots } from "@/lib/ads/data";
import type { AdSlot } from "@/lib/ads/types";
import { createPublicClient } from "@/lib/supabase/public";

/** Klien read-only tanpa cookie. Semua fungsi di file ini hanya membaca data
 *  publik, sehingga tidak boleh menyentuh cookies() — kalau menyentuh, seluruh
 *  halaman publik terpaksa dirender dinamis dan ISR mati. */
type ReadClient = ReturnType<typeof createPublicClient>;

export type PublicMedia = {
    secure_url: string;
    alt_text: string;
    title: string | null;
};

export type PublicArticle = {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    category_id: number | null;
    category_name: string;
    category_slug: string;
    author_name: string;
    is_exclusive: boolean;
    published_at: string;
    updated_at: string;
    view_count: number;
    reading_time_minutes: number;
    focus_keyword: string | null;
    seo_title: string | null;
    meta_description: string | null;
    tags: string[];
    featured_media: PublicMedia | null;
};

export type PublicSection = {
    title: string;
    slug: string;
    lead: PublicArticle;
    items: PublicArticle[];
};

export type SocialReel = { id: string; instagram_url: string; embed_url: string; title: string; caption: string | null };
export type HomepageSection = { section_key: string; title: string; is_enabled: boolean; sort_order: number; style_variant: string; category_slug: string | null };
export type BreakingNews = { id: string; headline: string; target_url: string; priority: number };

export type PublicHomeData = {
    articles: PublicArticle[];
    hero: PublicArticle;
    trending: PublicArticle[];
    sections: PublicSection[];
    games: PublicArticle[];
    sports: PublicArticle[];
    bali: PublicArticle[];
    reels: SocialReel[];
    homepageSections: HomepageSection[];
    breakingNews: BreakingNews[];
    ads: AdSlot[];
    isFallback: boolean;
};

type ArticleRow = {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    /** Hanya terisi pada query artikel tunggal. Query daftar sengaja tidak
     *  mengambil kolom ini karena isinya HTML penuh (bisa puluhan KB/artikel). */
    content?: string | null;
    category_id: number | null;
    author_id: string;
    featured_media_id: string | null;
    is_exclusive: boolean | null;
    published_at: string | null;
    updated_at: string;
    view_count: number | null;
    reading_time_minutes: number | null;
    focus_keyword: string | null;
    seo_title: string | null;
    meta_description: string | null;
    tags: string[] | null;
};

/** Kolom untuk KARTU/daftar (homepage, kanal, terkait).
 *  Tanpa `content` — inilah perubahan terbesar untuk ukuran payload. */
const CARD_COLUMNS =
    "id,slug,title,excerpt,category_id,author_id,featured_media_id,is_exclusive,published_at,updated_at,view_count,reading_time_minutes,focus_keyword,seo_title,meta_description,tags";

/** Kolom untuk halaman artikel tunggal (butuh isi lengkap). */
const FULL_COLUMNS = `${CARD_COLUMNS},content`;

/** Jumlah artikel yang diambil homepage. Grid topik memakai paginasi 9/halaman,
 *  jadi 60 memberi ~7 halaman tanpa mengirim ratusan artikel ke browser. */
const HOME_ARTICLE_LIMIT = 60;

const DEMO_IMAGES = ["/news/city.png", "/news/bali.png", "/news/sports.png"];

const fallbackArticles: PublicArticle[] = [
    {
        id: "demo-ihsg",
        slug: "ihsg-menguat-investor-asing-kembali",
        title: "IHSG Menguat, Investor Asing Kembali Borong Saham Blue Chip",
        excerpt: "Aksi beli selektif kembali menghidupkan pasar saham Indonesia setelah sentimen global mulai membaik.",
        content: [
            "Indeks Harga Saham Gabungan bergerak menguat pada awal perdagangan pekan ini. Investor asing tercatat kembali masuk ke saham-saham berkapitalisasi besar setelah pasar mendapat kepastian baru dari arah kebijakan global.",
            "Analis menilai penguatan ini masih perlu diuji oleh volume transaksi dan data ekonomi domestik. Sektor perbankan, konsumer, dan energi menjadi penggerak utama kenaikan indeks.",
            "Meski sentimen membaik, pelaku pasar tetap diminta selektif. Fundamental emiten, likuiditas, dan valuasi tetap menjadi acuan utama sebelum menambah posisi.",
        ].join("\n\n"),
        category_id: 1,
        category_name: "Ekonomi",
        category_slug: "ekonomi",
        author_name: "Redaksi SwapNews",
        is_exclusive: false,
        published_at: "2026-08-10T08:00:00+08:00",
        updated_at: "2026-08-10T08:00:00+08:00",
        view_count: 12450,
        reading_time_minutes: 4,
        focus_keyword: null,
        seo_title: null,
        meta_description: null,
        tags: [],
        featured_media: {
            secure_url: "/news/city.png",
            alt_text: "Gedung perkotaan saat matahari terbenam",
            title: "IHSG menguat",
        },
    },
    {
        id: "demo-bali",
        slug: "bali-masuk-destinasi-terbaik-dunia",
        title: "Bali Masuk 3 Besar Destinasi Terbaik Dunia 2026",
        excerpt: "Budaya, kuliner, dan pemulihan wisata berkualitas membuat Bali kembali menjadi perhatian dunia.",
        content: [
            "Bali kembali menempati posisi tiga besar destinasi terbaik dunia berkat kombinasi alam, budaya, dan layanan wisata yang terus membaik. Kunjungan wisatawan internasional menunjukkan tren stabil sepanjang tahun.",
            "Pemerintah daerah kini mendorong wisata berkualitas dengan penataan kawasan, pelestarian budaya, dan keterlibatan desa wisata. Arah ini dinilai penting agar manfaat pariwisata lebih merata.",
            "Pelaku usaha berharap momentum ini diikuti infrastruktur dan tata kelola lingkungan yang kuat. Bali diprediksi tetap menjadi magnet utama wisata Indonesia.",
        ].join("\n\n"),
        category_id: 2,
        category_name: "Bali",
        category_slug: "bali",
        author_name: "Nadia Prameswari",
        is_exclusive: false,
        published_at: "2026-08-10T07:30:00+08:00",
        updated_at: "2026-08-10T07:30:00+08:00",
        view_count: 9800,
        reading_time_minutes: 3,
        focus_keyword: null,
        seo_title: null,
        meta_description: null,
        tags: [],
        featured_media: {
            secure_url: "/news/bali.png",
            alt_text: "Pemandangan alam dan budaya Bali",
            title: "Bali destinasi terbaik",
        },
    },
    {
        id: "demo-timnas",
        slug: "timnas-indonesia-menang-tipis-lawan-vietnam",
        title: "Timnas Indonesia Menang Tipis Lawan Vietnam",
        excerpt: "Gol menit akhir membawa Indonesia mengamankan tiga poin penting di kandang.",
        content: [
            "Timnas Indonesia meraih kemenangan tipis atas Vietnam dalam laga yang berjalan ketat sejak menit awal. Gol penentu tercipta pada menit akhir melalui serangan cepat dari sisi kanan.",
            "Pelatih memuji disiplin para pemain dan dukungan penonton yang membuat tim tetap percaya diri. Kemenangan ini membuat posisi Indonesia makin kompetitif di klasemen.",
            "Evaluasi tetap dibutuhkan, terutama pada penyelesaian akhir dan transisi bertahan. Laga berikutnya akan menjadi ujian konsistensi tim.",
        ].join("\n\n"),
        category_id: 3,
        category_name: "Sports",
        category_slug: "sports",
        author_name: "Dimas Anggara",
        is_exclusive: false,
        published_at: "2026-08-09T22:00:00+08:00",
        updated_at: "2026-08-09T22:00:00+08:00",
        view_count: 15420,
        reading_time_minutes: 3,
        focus_keyword: null,
        seo_title: null,
        meta_description: null,
        tags: [],
        featured_media: {
            secure_url: "/news/sports.png",
            alt_text: "Suasana pertandingan sepak bola",
            title: "Timnas Indonesia menang",
        },
    },
    {
        id: "demo-umkm",
        slug: "insentif-baru-umkm-naik-kelas",
        title: "Pemerintah Siapkan Insentif Baru untuk UMKM Naik Kelas",
        excerpt: "Program baru menyasar digitalisasi, akses pembiayaan, dan perluasan pasar bagi usaha kecil.",
        content: [
            "Pemerintah menyiapkan paket insentif baru untuk membantu UMKM naik kelas. Fokus utama program mencakup digitalisasi, pembiayaan, sertifikasi, dan akses pasar.",
            "Pelaku usaha menilai dukungan paling dibutuhkan adalah pendampingan berkelanjutan, bukan sekadar pelatihan singkat. Data dan kolaborasi antarlembaga menjadi kunci efektivitas program.",
            "Jika berjalan tepat sasaran, insentif ini dapat memperkuat kontribusi UMKM terhadap penyerapan tenaga kerja dan ekonomi daerah.",
        ].join("\n\n"),
        category_id: 1,
        category_name: "Ekonomi",
        category_slug: "ekonomi",
        author_name: "Redaksi SwapNews",
        is_exclusive: false,
        published_at: "2026-08-09T18:30:00+08:00",
        updated_at: "2026-08-09T18:30:00+08:00",
        view_count: 7200,
        reading_time_minutes: 4,
        focus_keyword: null,
        seo_title: null,
        meta_description: null,
        tags: [],
        featured_media: {
            secure_url: "/news/city.png",
            alt_text: "Aktivitas ekonomi di kawasan kota",
            title: "UMKM naik kelas",
        },
    },
];

function excerptFrom(content: string, excerpt: string | null) {
    const clean = excerpt?.trim() || content.replace(/\s+/g, " ").trim();
    return clean.length > 170 ? `${clean.slice(0, 167).trim()}...` : clean;
}

function publishedDate(value: string | null) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toISOString() : new Date().toISOString();
}

function createMediaServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fetchMediaMap(supabase: ReadClient, mediaIds: string[]) {
    if (!mediaIds.length) return new Map<string, PublicMedia>();

    const selectMedia = async (client: ReadClient) => {
        const result = await client.from("media_assets").select("id,secure_url,alt_text,title").in("id", mediaIds);
        if (result.error) throw result.error;
        return result.data ?? [];
    };

    let media: { id: string; secure_url: string; alt_text?: string | null; title?: string | null }[] = [];
    const serviceClient = createMediaServiceClient();
    const primaryClient = serviceClient ? (serviceClient as ReadClient) : supabase;

    try {
        media = await selectMedia(primaryClient);
    } catch {
        if (primaryClient !== supabase) {
            try {
                media = await selectMedia(supabase);
            } catch (error) {
                console.error("Failed to load media assets", error);
            }
        }
    }

    return new Map(
        media.map((item) => [item.id, {
            secure_url: item.secure_url,
            alt_text: item.alt_text || item.title || "Gambar artikel",
            title: item.title ?? null,
        }]),
    );
}

function normalizeArticle(
    row: ArticleRow,
    authorMap: Map<string, string>,
    categoryMap: Map<number, { name: string; slug: string }>,
    mediaMap: Map<string, PublicMedia>,
): PublicArticle {
    const category = row.category_id ? categoryMap.get(row.category_id) : undefined;
    // Query daftar tidak mengambil `content`, jadi excerpt dipilih berjenjang:
    // excerpt -> meta_description -> judul. Sebelumnya excerpt diturunkan dari
    // isi HTML penuh, yang memaksa kita mengunduh seluruh badan artikel.
    const excerptSource = row.excerpt?.trim() || row.meta_description?.trim() || row.content || row.title;
    const rawMedia = row.featured_media_id ? mediaMap.get(row.featured_media_id) ?? null : null;
    const featuredMedia: PublicMedia | null = rawMedia
        ? {
            ...rawMedia,
            secure_url: rawMedia.secure_url?.startsWith("data:")
                ? `/og-image/${row.slug}.jpg`
                : rawMedia.secure_url,
        }
        : null;

    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: excerptFrom(excerptSource, row.excerpt),
        content: row.content ?? "",
        category_id: row.category_id,
        category_name: category?.name ?? "Nasional",
        category_slug: category?.slug ?? "nasional",
        author_name: authorMap.get(row.author_id) ?? "Redaksi SwapNews",
        is_exclusive: Boolean(row.is_exclusive),
        published_at: publishedDate(row.published_at ?? row.updated_at),
        updated_at: publishedDate(row.updated_at),
        view_count: Math.max(row.view_count ?? 0, 182),
        reading_time_minutes: Math.max(row.reading_time_minutes ?? 1, 1),
        focus_keyword: row.focus_keyword,
        seo_title: row.seo_title,
        meta_description: row.meta_description,
        tags: row.tags ?? [],
        featured_media: featuredMedia,
    };
}

function buildSections(articles: PublicArticle[]) {
    const used = new Set<string>();
    const sections: PublicSection[] = [];

    for (const article of articles) {
        if (used.has(article.id) || sections.some((section) => section.slug === article.category_slug)) continue;
        const group = articles.filter((item) => item.category_slug === article.category_slug && !used.has(item.id));
        if (!group.length) continue;
        const lead = group[0];
        sections.push({ title: article.category_name, slug: article.category_slug, lead, items: group.slice(1, 4) });
        group.forEach((item) => used.add(item.id));
    }

    return sections.slice(0, 5);
}

/** Lengkapi baris artikel dengan nama penulis, kategori, dan media.
 *  Dipakai bersama oleh query homepage dan query artikel terkait. */
async function hydrateArticleRows(supabase: ReadClient, rows: ArticleRow[]) {
    if (!rows.length) return [];

    const authorIds = [...new Set(rows.map((row) => row.author_id))];
    const categoryIds = [...new Set(rows.map((row) => row.category_id).filter(Boolean))] as number[];
    const mediaIds = [...new Set(rows.map((row) => row.featured_media_id).filter(Boolean))] as string[];

    const [authors, categories] = await Promise.all([
        authorIds.length ? supabase.from("profiles").select("id,full_name,email").in("id", authorIds) : Promise.resolve({ data: [], error: null }),
        categoryIds.length ? supabase.from("categories").select("id,name,slug").in("id", categoryIds) : Promise.resolve({ data: [], error: null }),
    ]);
    const mediaMap = await fetchMediaMap(supabase, mediaIds);

    if (authors.error || categories.error) throw authors.error ?? categories.error;

    const authorMap = new Map<string, string>((authors.data ?? []).map((author) => [author.id, author.full_name ?? author.email ?? "Redaksi SwapNews"]));
    const categoryMap = new Map<number, { name: string; slug: string }>((categories.data ?? []).map((category) => [category.id, { name: category.name, slug: category.slug }]));

    return rows.map((row) => normalizeArticle(row, authorMap, categoryMap, mediaMap));
}

/** Kandidat artikel terkait, dipersempit ke kategori yang sama supaya cukup
 *  mengambil sedikit baris ringan alih-alih menyapu tabel artikel. */
const queryRelatedCandidates = cache(async (categoryId: number | null, limit = 24): Promise<PublicArticle[]> => {
    try {
        const supabase = createPublicClient();
        let query = supabase.from("articles").select(CARD_COLUMNS).eq("status", "published");
        if (categoryId) query = query.eq("category_id", categoryId);
        const { data, error } = await query.order("published_at", { ascending: false }).limit(limit);
        if (error) throw error;

        const rows = (data ?? []) as unknown as ArticleRow[];
        // Kanal yang masih sepi tidak boleh membuat blok "Berita terkait" kosong.
        if (rows.length < 4) return await queryPublishedArticles(limit);
        return await hydrateArticleRows(supabase, rows);
    } catch (error) {
        console.error("Failed to load related candidates", error);
        return [];
    }
});

async function queryPublishedArticles(limit = HOME_ARTICLE_LIMIT): Promise<PublicArticle[]> {
    try {
        const supabase = createPublicClient();
        const { data, error } = await supabase
            .from("articles")
            .select(CARD_COLUMNS)
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(limit);

        if (error) throw error;
        return await hydrateArticleRows(supabase, (data ?? []) as unknown as ArticleRow[]);
    } catch (error) {
        console.error("Failed to load public articles", error);
        return [];
    }
}

export function getFallbackArticles() {
    return fallbackArticles;
}

export const getPublicHomeData = cache(async (): Promise<PublicHomeData> => {
    const [articles, ads] = await Promise.all([
        queryPublishedArticles(HOME_ARTICLE_LIMIT),
        getActiveAdSlots(),
    ]);
    const usable = articles.length ? articles : fallbackArticles;
    const trending = [...usable].sort((a, b) => b.view_count - a.view_count).slice(0, 10);
    const hero = trending[0] ?? usable[0];
    const sections = buildSections(usable);
    const categoryFeed = (slugs: string[]) => usable.filter((article) => slugs.includes(article.category_slug)).slice(0, 8);
    const gameSlugs = ["games", "game-news", "esports", "mobile-games", "pc-games", "console-games", "review-games", "tips-trik-games", "komunitas-gaming"];
    const sportSlugs = ["sport", "sepak-bola", "liga-indonesia", "liga-inggris", "liga-italia", "liga-spanyol", "motogp", "f1", "basket", "sport-lain"];
    let reels: SocialReel[] = [];
    let homepageSections: HomepageSection[] = [
        { section_key: "topics", title: "Pilihan Kanal", is_enabled: true, sort_order: 10, style_variant: "compact", category_slug: null },
        { section_key: "reels", title: "Reels Pilihan", is_enabled: true, sort_order: 20, style_variant: "carousel", category_slug: null },
        { section_key: "games", title: "Games Arena", is_enabled: true, sort_order: 30, style_variant: "arena", category_slug: "games" },
        { section_key: "sports", title: "Sports Focus", is_enabled: true, sort_order: 40, style_variant: "scoreboard", category_slug: "sport" },
        { section_key: "bali", title: "Bali Kini", is_enabled: true, sort_order: 50, style_variant: "mosaic", category_slug: "bali" },
        { section_key: "latest", title: "Berita Terkini", is_enabled: true, sort_order: 60, style_variant: "editorial", category_slug: null },
    ];
    let breakingNews: BreakingNews[] = [];
    try {
        const supabase = createPublicClient();
        const [reelResult, sectionResult, breakingResult] = await Promise.all([
            supabase.from("social_reels").select("id,instagram_url,embed_url,title,caption").eq("is_active", true).order("sort_order").limit(10),
            supabase.from("homepage_sections").select("section_key,title,is_enabled,sort_order,style_variant,category_slug").order("sort_order"),
            supabase.from("breaking_news").select("id,headline,target_url,priority").eq("is_active", true).lte("starts_at", new Date().toISOString()).order("priority", { ascending: false }).limit(5),
        ]);
        if (!reelResult.error) reels = (reelResult.data ?? []) as SocialReel[];
        if (!sectionResult.error && sectionResult.data?.length) homepageSections = sectionResult.data as HomepageSection[];
        if (!breakingResult.error) breakingNews = (breakingResult.data ?? []) as BreakingNews[];
    } catch {
        // New control tables may not be migrated yet. Defaults keep homepage available.
    }
    return {
        articles: usable, hero, trending, sections,
        games: categoryFeed(gameSlugs),
        sports: categoryFeed(sportSlugs),
        bali: categoryFeed(["bali", "denpasar", "badung", "gianyar", "tabanan", "buleleng", "karangasem", "jembrana", "klungkung", "bangli"]),
        reels, homepageSections, breakingNews, ads,
        isFallback: articles.length === 0,
    };
});

export const getPublicArticleBySlug = cache(async (slug: string) => {
    try {
        const supabase = createPublicClient();
        const { data, error } = await supabase
            .from("articles")
            .select(FULL_COLUMNS)
            .eq("status", "published")
            .eq("slug", slug)
            .maybeSingle();

        if (error || !data) return null;

        const row = data as unknown as ArticleRow;
        const [authorResult, categoryResult] = await Promise.all([
            row.author_id
                ? supabase.from("profiles").select("id,full_name,email").eq("id", row.author_id).maybeSingle()
                : Promise.resolve({ data: null, error: null }),
            row.category_id
                ? supabase.from("categories").select("id,name,slug").eq("id", row.category_id).maybeSingle()
                : Promise.resolve({ data: null, error: null }),
        ]);
        const mediaMap = row.featured_media_id ? await fetchMediaMap(supabase, [row.featured_media_id]) : new Map<string, PublicMedia>();

        if (authorResult.error || categoryResult.error) throw authorResult.error ?? categoryResult.error;

        const authorMap = new Map(authorResult.data ? [[authorResult.data.id, authorResult.data.full_name ?? authorResult.data.email ?? "Redaksi SwapNews"]] : []);
        const categoryMap = new Map(categoryResult.data ? [[categoryResult.data.id, { name: categoryResult.data.name, slug: categoryResult.data.slug }]] : []);

        return normalizeArticle(row, authorMap, categoryMap, mediaMap);
    } catch (error) {
        console.error("Failed to load article by slug", error);
        return null;
    }
});

export async function queryPublishedSitemapArticles() {
    try {
        const supabase = createPublicClient();
        const { data, error } = await supabase
            .from("articles")
            .select("slug,updated_at")
            .eq("status", "published")
            .order("updated_at", { ascending: false })
            .limit(500);
        if (error) throw error;
        return (data ?? []) as { slug: string; updated_at: string }[];
    } catch (error) {
        console.error("Failed to load sitemap articles", error);
        return [];
    }
}

/** Slug artikel terpopuler untuk generateStaticParams — prebuild saat deploy. */
export async function getPopularArticleSlugs(limit = 30): Promise<string[]> {
    try {
        const supabase = createPublicClient();
        const { data, error } = await supabase
            .from("articles")
            .select("slug")
            .eq("status", "published")
            .order("view_count", { ascending: false })
            .limit(limit);
        if (error) throw error;
        return (data ?? []).map((row) => row.slug as string);
    } catch (error) {
        console.error("Failed to load popular slugs", error);
        return [];
    }
}

export type PublicChannelData = {
    category: { id: number; name: string; slug: string; description: string | null; parent_id: number | null };
    children: { id: number; name: string; slug: string }[];
    articles: PublicArticle[];
    trending: PublicArticle[];
};

export const getPublicChannelData = cache(async (slug: string): Promise<PublicChannelData | null> => {
    try {
        const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
        const supabase = createPublicClient();
        const { data: category, error } = await supabase.from("categories").select("id,name,slug,description,parent_id").eq("slug", safeSlug).maybeSingle();
        if (error || !category) return null;
        const { data: children = [] } = await supabase.from("categories").select("id,name,slug").eq("parent_id", category.id).order("sort_order");
        const categoryIds = [category.id, ...(children ?? []).map((item) => item.id)];
        const { data: rows, error: articleError } = await supabase.from("articles")
            .select(CARD_COLUMNS)
            .eq("status", "published").in("category_id", categoryIds).order("published_at", { ascending: false }).limit(40);
        if (articleError) throw articleError;
        const articleRows = (rows ?? []) as unknown as ArticleRow[];
        const authorIds = [...new Set(articleRows.map((row) => row.author_id))];
        const mediaIds = [...new Set(articleRows.map((row) => row.featured_media_id).filter(Boolean))] as string[];
        const [authors] = await Promise.all([
            authorIds.length ? supabase.from("profiles").select("id,full_name,email").in("id", authorIds) : Promise.resolve({ data: [], error: null }),
        ]);
        const mediaMap = await fetchMediaMap(supabase, mediaIds);
        const allCategories = [category, ...(children ?? [])];
        const categoryMap = new Map(allCategories.map((item) => [item.id, { name: item.name, slug: item.slug }]));
        const authorMap = new Map((authors.data ?? []).map((item) => [item.id, item.full_name ?? item.email ?? "Redaksi SwapNews"]));
        const articles = articleRows.map((row) => normalizeArticle(row, authorMap, categoryMap, mediaMap));
        return { category, children: children ?? [], articles, trending: [...articles].sort((a, b) => b.view_count - a.view_count).slice(0, 6) };
    } catch (error) {
        console.error("Failed to load channel", error);
        return null;
    }
});

export async function getRelatedPublicArticles(article: PublicArticle, limit = 3) {
    // Sebelumnya menarik 24 artikel LENGKAP (dengan HTML) hanya untuk memilih 3.
    // Sekarang: kartu ringan, diprioritaskan dari kategori yang sama.
    const articles = await queryRelatedCandidates(article.category_id, 24);
    const scored = articles.filter((item) => item.id !== article.id).map((item) => {
        const sharedTags = item.tags.filter((tag) => article.tags.includes(tag)).length;
        const sameCategory = item.category_slug === article.category_slug ? 4 : 0;
        const keyword = item.focus_keyword && article.focus_keyword && item.focus_keyword === article.focus_keyword ? 2 : 0;
        return { item, score: sameCategory + sharedTags * 2 + keyword };
    });
    return scored.sort((a, b) => b.score - a.score || new Date(b.item.published_at).getTime() - new Date(a.item.published_at).getTime()).slice(0, limit).map(({ item }) => item);
}

export function formatPublishedDate(value: string) {
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

export function formatRelativeDate(value: string) {
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.max(Math.floor(diff / 60000), 1);
    if (minutes < 60) return `${minutes} menit yang lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari yang lalu`;
    return formatPublishedDate(value);
}

export function articleImage(article: PublicArticle, index = 0) {
    return article.featured_media?.secure_url ?? DEMO_IMAGES[index % DEMO_IMAGES.length];
}
