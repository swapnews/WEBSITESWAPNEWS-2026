/**
 * Upload WordPress media to Cloudinary preserving original filenames.
 * Usage: node scripts/import-wordpress-media.mjs --dry-run | --upload
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve, relative, basename, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MEDIA_ROOT = resolve(ROOT, "_import/images/uploads/2026");
const STAGING = resolve(ROOT, "_import/staging-articles.json");
const REPORT = resolve(ROOT, "_import/media-import-report.json");
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const SIZE_SUFFIX = /-\d+x\d+(?=\.[^.]+$)/i;

const mode = process.argv.includes("--upload") ? "upload" : "dry-run";
const required = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
for (const key of required) if (!process.env[key]) { console.error(`Missing ${key}`); process.exit(1); }
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function walk(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = resolve(dir, entry.name);
        return entry.isDirectory() ? walk(full) : IMAGE_EXT.has(extname(entry.name).toLowerCase()) ? [full] : [];
    });
}

function normalizeName(name) {
    return decodeURIComponent(name).toLowerCase().replace(/\?.*$/, "").replace(SIZE_SUFFIX, "");
}

function originalFiles(files) {
    const byNormalized = new Map();
    for (const file of files) {
        const rel = relative(MEDIA_ROOT, file).replace(/\\/g, "/");
        const key = `${dirname(rel).replace(/\\/g, "/")}/${normalizeName(basename(file))}`;
        if (!byNormalized.has(key)) byNormalized.set(key, []);
        byNormalized.get(key).push(file);
    }
    const originals = [];
    const derived = [];
    for (const group of byNormalized.values()) {
        const exact = group.find((f) => !SIZE_SUFFIX.test(basename(f)));
        originals.push(exact ?? group.sort((a, b) => statSync(b).size - statSync(a).size)[0]);
        derived.push(...group.filter((f) => f !== (exact ?? group[0])));
    }
    return { originals, derived };
}

function publicIdFor(file) {
    const rel = relative(MEDIA_ROOT, file).replace(/\\/g, "/");
    const parts = rel.split("/");
    const month = parts.length > 1 ? parts[0] : "unknown";
    return `swapnews/wordpress/2026/${month}/${basename(file, extname(file))}`;
}

function findLocal(url, originals, allFiles) {
    if (!url) return null;
    const raw = decodeURIComponent(url.split("?")[0]);
    const name = basename(raw);
    const monthMatch = raw.match(/\/2026\/(\d{2})\//);
    const month = monthMatch?.[1];
    const candidates = [...originals, ...allFiles].filter((f) => (!month || relative(MEDIA_ROOT, f).startsWith(month)) && normalizeName(basename(f)) === normalizeName(name));
    return candidates[0] ?? null;
}

async function getCreator() {
    const { data: privileged } = await supabase.from("profiles").select("id").in("role", ["super_admin", "admin"]).limit(1);
    if (privileged?.[0]?.id) return privileged[0].id;
    const { data: anyProfile } = await supabase.from("profiles").select("id").limit(1);
    return anyProfile?.[0]?.id ?? null;
}

async function uploadOne(file, creatorId) {
    const publicId = publicIdFor(file);
    const { data: existing } = await supabase.from("media_assets").select("id,public_id,secure_url").eq("public_id", publicId).maybeSingle();
    if (existing) return { status: "skipped", media: existing };
    try {
        const found = await cloudinary.api.resource(publicId, { resource_type: "image" });
        const media = await saveMedia(found, file, creatorId);
        return { status: "reconciled", media };
    } catch (error) {
        if (error?.error?.http_code !== 404 && error?.http_code !== 404) throw error;
    }
    const result = await cloudinary.uploader.upload(file, {
        public_id: publicId,
        use_filename: true,
        unique_filename: false,
        overwrite: false,
        resource_type: "image",
        type: "upload",
    });
    const media = await saveMedia(result, file, creatorId);
    return { status: "uploaded", media };
}

async function saveMedia(result, file, creatorId) {
    const payload = {
        public_id: result.public_id,
        secure_url: result.secure_url,
        format: result.format ?? extname(file).slice(1).toLowerCase(),
        width: result.width ?? null,
        height: result.height ?? null,
        bytes: result.bytes ?? statSync(file).size,
        alt_text: basename(file, extname(file)),
        title: basename(file),
        credit: "Migrasi WordPress",
        created_by: creatorId,
    };
    const { data, error } = await supabase.from("media_assets").insert(payload).select("id,public_id,secure_url").single();
    if (error) throw new Error(`media_assets ${result.public_id}: ${error.message}`);
    return data;
}

async function main() {
    const allFiles = walk(MEDIA_ROOT);
    const { originals, derived } = originalFiles(allFiles);
    const articles = JSON.parse(readFileSync(STAGING, "utf8"));
    const matches = articles.map((a) => ({ article: a, file: findLocal(a.thumbnail_url, originals, allFiles) }));
    const matched = matches.filter((x) => x.file);
    const uniqueMatchedFiles = [...new Set(matched.map((x) => x.file))];
    const report = { mode, total_files: allFiles.length, originals: originals.length, derived_skipped: derived.length, articles_with_thumbnail_ref: articles.filter((a) => a.thumbnail_url).length, featured_matches: matched.length, featured_missing: articles.filter((a) => a.thumbnail_url).length - matched.length, unique_files_to_upload: uniqueMatchedFiles.length, uploaded: 0, skipped: 0, reconciled: 0, linked: 0, errors: [] };
    console.log(JSON.stringify(report, null, 2));
    if (mode === "dry-run") { writeFileSync(REPORT, JSON.stringify(report, null, 2)); return; }

    const creatorId = await getCreator();
    if (!creatorId) throw new Error("Admin profile not found");
    const mediaByFile = new Map();
    for (let i = 0; i < uniqueMatchedFiles.length; i++) {
        const file = uniqueMatchedFiles[i];
        try {
            const result = await uploadOne(file, creatorId);
            report[result.status]++;
            mediaByFile.set(file, result.media);
        } catch (error) { report.errors.push({ file: relative(MEDIA_ROOT, file), error: error.message }); }
        process.stdout.write(`\rUpload ${i + 1}/${uniqueMatchedFiles.length} uploaded=${report.uploaded} skip=${report.skipped} errors=${report.errors.length}`);
    }
    console.log("");
    for (const { article, file } of matched) {
        const media = mediaByFile.get(file);
        if (!media) continue;
        const { error } = await supabase.from("articles").update({ featured_media_id: media.id }).eq("slug", article.slug);
        if (error) report.errors.push({ slug: article.slug, error: error.message }); else report.linked++;
    }
    writeFileSync(REPORT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
