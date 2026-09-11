/**
 * Verifikasi RLS media_assets.
 *
 * Tujuan: membuktikan apakah klien PUBLIK (anon key) — yaitu klien yang dipakai
 * halaman ISR di produksi — benar-benar bisa membaca baris media_assets untuk
 * artikel yang sudah published.
 *
 * Jalankan: node scripts/verify-media-rls.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnv() {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const env = {};
    for (const line of raw.split(/\r?\n/)) {
        if (!line || line.trimStart().startsWith("#")) continue;
        const idx = line.indexOf("=");
        if (idx === -1) continue;
        env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});
const service = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const { data: articles, error: articleError } = await anon
    .from("articles")
    .select("id,slug,featured_media_id")
    .eq("status", "published")
    .not("featured_media_id", "is", null)
    .order("published_at", { ascending: false })
    .limit(12);

if (articleError) {
    console.error("Gagal membaca articles via anon:", articleError.message);
    process.exit(1);
}

const ids = articles.map((a) => a.featured_media_id);
console.log(`Artikel published dengan featured_media_id : ${ids.length}`);

const anonMedia = await anon.from("media_assets").select("id,secure_url").in("id", ids);
const serviceMedia = await service.from("media_assets").select("id,secure_url").in("id", ids);

console.log(`media_assets terbaca via ANON         : ${anonMedia.data?.length ?? 0}` +
    (anonMedia.error ? ` (error: ${anonMedia.error.message})` : ""));
console.log(`media_assets terbaca via SERVICE ROLE : ${serviceMedia.data?.length ?? 0}` +
    (serviceMedia.error ? ` (error: ${serviceMedia.error.message})` : ""));

const anonOk = (anonMedia.data?.length ?? 0) === ids.length;
console.log(`\nHASIL: klien publik ${anonOk ? "BISA" : "TIDAK BISA"} membaca semua gambar artikel.`);

if (!anonOk) {
    console.log("=> Jalankan supabase/migrations/021_fix_public_media_rls.sql di Supabase SQL Editor.");
}

const sample = serviceMedia.data?.[0];
if (sample) console.log(`\nContoh URL Cloudinary: ${sample.secure_url}`);
