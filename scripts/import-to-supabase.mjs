/**
 * Import WordPress articles into SwapNews Supabase.
 * Reads staging-articles.json produced by the dry-run parser.
 * Idempotent: skips articles whose slug already exists.
 *
 * Usage:
 *   node scripts/import-wordpress.mjs --import
 *   node scripts/import-wordpress.mjs --import --author=<uuid>
 *   node scripts/import-wordpress.mjs --import --dry-first
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const STAGING_PATH = resolve(ROOT, "_import/staging-articles.json");

// Supabase client setup
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// Category mapping: WordPress slug → SwapNews category name (create if missing)
const CATEGORY_MAP = {
    bali: "Bali", news: "News", porli: "Polri", nasional: "Nasional", hotnews: "Hot News",
    polri: "Polri", internasional: "Internasional", "hukum-kriminal": "Hukum & Kriminal",
    "hukum-keamanan": "Hukum & Keamanan", entertainment: "Entertainment", "tni-polri": "TNI & Polri",
    investigasi: "Investigasi", kamtibmas: "Kamtibmas", tni: "TNI", music: "Musik",
    lingkungan: "Lingkungan", musik: "Musik", psikologi: "Psikologi", peristiwa: "Peristiwa",
    politik: "Politik", uncategorized: "Umum", "hukum-lalu-lintas": "Hukum & Lalu Lintas",
    teknologi: "Teknologi", "musik-hiburan": "Musik & Hiburan", "sosial-masyarakat": "Sosial & Masyarakat",
    ekonomi: "Ekonomi", kontroversi: "Kontroversi", imigrasi: "Imigrasi", selebriti: "Selebriti",
    "bola-sports": "Olahraga", olahraga: "Olahraga", inovasi: "Inovasi", "bencana-alam": "Bencana Alam",
    banjir: "Bencana Alam", pariwisata: "Pariwisata", "fakta-unik": "Fakta Unik", hukum: "Hukum",
    "hukum-korupsi": "Hukum & Korupsi", pendidikan: "Pendidikan", komunitas: "Komunitas",
    pemerintahan: "Pemerintahan", hiburan: "Hiburan", "ekonomi-bisnis": "Ekonomi & Bisnis",
    bisnis: "Bisnis", collection: "Koleksi", "rock-metal": "Rock - Metal", "keamanan-lalu-lintas": "Keamanan & Lalu Lintas",
    "event-nasional": "Event Nasional", health: "Kesehatan", "kegiatan-daerah": "Kegiatan Daerah",
    "budaya-lokal": "Budaya Lokal", kementerian: "Kementerian", airsoftgun: "Airsoftgun",
    budaya: "Budaya", "editors-pick": "Editor's Pick", jakarta: "Jakarta", kesehatan: "Kesehatan",
    "ekonomi-digital": "Ekonomi Digital", finance: "Finance", "partai-politik": "Partai Politik",
    buzz: "Buzz", gadget: "Gadget", sains: "Sains", "tekno-sains": "Teknologi & Sains",
    geopolitik: "Geopolitik", sosial: "Sosial", skandal: "Skandal", humaniora: "Humaniora",
    "tokoh-inspirasi": "Tokoh Inspirasi", "hukum-korupsi-2": "Hukum & Korupsi", crypto: "Crypto",
    wna: "WNA", "aksi-mahasiswa": "Aksi Mahasiswa", demonstrasi: "Demonstrasi", viral: "Viral",
    edukasi: "Edukasi", movie: "Movie", penipuan: "Penipuan", "data-bocor": "Data Bocor",
    korupsi: "Korupsi", video: "Video", "hukum-keamana": "Hukum & Keamanan",
    "berita-musik-internasional": "Musik Internasional", "digital-marketing": "Digital Marketing",
    reggae: "Reggae", "reggae-2": "Reggae", "musik-lokal": "Musik Lokal", bola: "Olahraga",
    "food-travel": "Food & Travel", "sepak-bola-nasional": "Olahraga", woman: "Woman",
    "musik-sunda": "Musik Sunda", "band-indie": "Band Indie", "album-baru": "Album Baru",
    otomotif: "Otomotif", "bedah-lirik": "Bedah Lirik", ai: "AI", "k-pop": "K-Pop",
    blues: "Blues", pop: "Pop", punk: "Punk", keroncong: "Keroncong",
    "media-jurnalisme": "Media & Jurnalisme", kalimantan: "Kalimantan", "film-series": "Film & Series",
    "infrastruktur-transportasi": "Infrastruktur & Transportasi", palembang: "Palembang",
    papua: "Papua", "hak-asasi-manusia": "Hak Asasi Manusia", nigeria: "Nigeria",
    polair: "Polair", "telekomunikasi-indonesia": "Telekomunikasi Indonesia", transportasi: "Transportasi",
};

async function getOrCreateCategory(wpSlug, wpName) {
    const targetName = CATEGORY_MAP[wpSlug] ?? wpName;
    const { data: existing } = await supabase.from("categories").select("id").eq("name", targetName).maybeSingle();
    if (existing) return existing.id;

    const slug = wpSlug.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "umum";
    const { data: bySlug } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
    if (bySlug) return bySlug.id;

    const { data: maxSort } = await supabase.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const nextSort = (maxSort?.sort_order ?? 0) + 1;

    const { data, error } = await supabase.from("categories").insert({ name: targetName, slug, sort_order: nextSort }).select("id").single();
    if (error) {
        console.error(`Failed to create category "${targetName}":`, error.message);
        return null;
    }
    console.log(`  Created category: ${targetName} (${slug})`);
    return data.id;
}

async function slugExists(slug) {
    const { data } = await supabase.from("articles").select("id").eq("slug", slug).maybeSingle();
    return Boolean(data);
}

async function findAuthorId() {
    const args = process.argv.slice(2);
    const authorArg = args.find((a) => a.startsWith("--author="));
    if (authorArg) return authorArg.split("=")[1];

    const { data: profiles } = await supabase.from("profiles").select("id,role").eq("role", "admin").limit(1);
    if (profiles?.[0]?.id) return profiles[0].id;

    const { data: anyProfile } = await supabase.from("profiles").select("id").limit(1);
    if (anyProfile?.[0]?.id) return anyProfile[0].id;

    console.error("No user profile found. Pass --author=<uuid> to specify author.");
    process.exit(1);
}

async function main() {
    const args = process.argv.slice(2);
    const doImport = args.includes("--import");
    const dryFirst = args.includes("--dry-first");

    if (!doImport) {
        console.log("Run with --import to write to database.");
        process.exit(0);
    }

    if (!existsSync(STAGING_PATH)) {
        console.error(`Staging file not found: ${STAGING_PATH}`);
        console.error("Run the dry-run parser first: node scripts/import-wordpress.mjs --dry-run");
        process.exit(1);
    }

    const articles = JSON.parse(readFileSync(STAGING_PATH, "utf8"));
    console.log(`Loaded ${articles.length} articles from staging.`);

    if (dryFirst) {
        console.log("DRY FIRST mode: showing first 3 articles that would be imported.");
        articles.slice(0, 3).forEach((a, i) => {
            console.log(`\n--- Article ${i + 1} ---`);
            console.log(`Title: ${a.title}`);
            console.log(`Slug: ${a.slug}`);
            console.log(`Author: ${a.author_name}`);
            console.log(`Categories: ${a.categories.map((c) => c.name).join(", ")}`);
            console.log(`Status: ${a.status}`);
            console.log(`Words: ${a.word_count}`);
            console.log(`Has thumbnail: ${Boolean(a.thumbnail_url)}`);
        });
        console.log("\nRun without --dry-first to import.");
        process.exit(0);
    }

    const authorId = await findAuthorId();
    console.log(`Using author_id: ${authorId}`);

    // Build category map
    const categoryIds = new Map();
    const allCategories = new Set();
    for (const a of articles) for (const c of a.categories) allCategories.add(c.slug);

    console.log(`\nResolving ${allCategories.size} categories...`);
    for (const wpSlug of allCategories) {
        const sample = articles.find((a) => a.categories.some((c) => c.slug === wpSlug));
        const wpName = sample?.categories.find((c) => c.slug === wpSlug)?.name ?? wpSlug;
        const id = await getOrCreateCategory(wpSlug, wpName);
        if (id) categoryIds.set(wpSlug, id);
    }

    // Import articles
    let imported = 0, skipped = 0, errors = 0;
    const batchSize = 25;

    console.log(`\nImporting ${articles.length} articles in batches of ${batchSize}...`);

    for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        const toInsert = [];

        for (const article of batch) {
            if (await slugExists(article.slug)) { skipped++; continue; }

            const categoryId = article.categories[0] ? categoryIds.get(article.categories[0].slug) ?? null : null;
            const excerpt = article.excerpt?.slice(0, 500) ?? null;

            toInsert.push({
                title: article.title,
                slug: article.slug,
                excerpt,
                content: article.content,
                category_id: categoryId,
                author_id: authorId,
                status: article.status === "published" ? "published" : "draft",
                is_exclusive: false,
                featured_media_id: null,
                published_at: article.status === "published" ? article.published_at : null,
                updated_at: article.updated_at,
                view_count: 0,
                reading_time_minutes: article.reading_time_minutes,
                focus_keyword: article.focus_keyword,
                seo_title: article.seo_title,
                meta_description: article.meta_description,
                tags: article.tags ?? [],
            });
        }

        if (toInsert.length > 0) {
            const { error } = await supabase.from("articles").insert(toInsert);
            if (error) {
                console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
                errors += toInsert.length;
            } else {
                imported += toInsert.length;
            }
        }

        process.stdout.write(`\r  Progress: ${Math.min(i + batchSize, articles.length)}/${articles.length} (imported: ${imported}, skipped: ${skipped}, errors: ${errors})`);
    }

    console.log("\n\n--- Import Complete ---");
    console.log(`Imported: ${imported}`);
    console.log(`Skipped (already exists): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${articles.length}`);
}

main().catch((error) => { console.error("Import failed:", error); process.exit(1); });
