/** Migrasi media_assets berisi data URI menjadi asset Cloudinary sungguhan.
 *  Idempotent: asset Cloudinary yang sudah ada di-reconcile, bukan di-upload ulang.
 *  Baris lama di-backup ke _import/datauri-backup.json sebelum di-update (reversibel).
 *  Usage: node scripts/migrate-datauri-media.mjs            (dry-run)
 *         node scripts/migrate-datauri-media.mjs --apply    (eksekusi) */
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT = resolve(ROOT, "_import/datauri-migration-report.json");
const BACKUP = resolve(ROOT, "_import/datauri-backup.json");
const apply = process.argv.includes("--apply");

for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[key]) throw new Error(`Missing env ${key}`);
}
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: badMedia, error } = await supabase.from("media_assets").select("id,public_id,secure_url,alt_text,title,created_by").like("secure_url", "data:%");
if (error) throw error;
if (!badMedia?.length) {
    console.log("Tidak ada media data URI. Tidak ada yang perlu dimigrasi.");
    process.exit(0);
}
console.log(`Ditemukan ${badMedia.length} media data URI. Mode: ${apply ? "APPLY" : "DRY-RUN"}`);

const report = { mode: apply ? "apply" : "dry-run", total: badMedia.length, uploaded: 0, reconciled: 0, linked: 0, errors: [] };
const backupRows = [];

for (const media of badMedia) {
    const publicId = media.public_id || `swapnews/media/datauri-${media.id}`;
    console.log(`\n→ ${publicId}`);

    let asset;
    try {
        asset = await cloudinary.api.resource(publicId);
        console.log("  sudah ada di Cloudinary, reconcile");
        report.reconciled++;
    } catch (resourceError) {
        const httpCode = resourceError?.error?.http_code ?? resourceError?.http_code;
        if (httpCode !== 404) throw resourceError;
        if (!apply) {
            console.log(`  [dry-run] akan upload ${(media.secure_url.length * 3) / 4 / 1024 | 0} KB`);
            continue;
        }
        // Cloudinary uploader.upload menerima data URI secara langsung
        asset = await cloudinary.uploader.upload(media.secure_url, {
            public_id: publicId,
            overwrite: false,
            resource_type: "image",
            format: "webp",
            quality: 60,
            transformation: [{ width: 2400, height: 2400, crop: "limit" }],
            context: { alt: media.alt_text || media.title || "", caption: media.title || "" },
        });
        console.log(`  uploaded: ${asset.secure_url.slice(0, 90)}…`);
        report.uploaded++;
    }

    backupRows.push({ id: media.id, public_id: media.public_id, secure_url: media.secure_url });
    const { error: updateError } = await supabase
        .from("media_assets")
        .update({
            public_id: asset.public_id ?? publicId,
            secure_url: asset.secure_url,
            format: asset.format ?? null,
            width: asset.width ?? null,
            height: asset.height ?? null,
            bytes: asset.bytes ?? 0,
        })
        .eq("id", media.id);
    if (updateError) throw updateError;
    report.linked++;
    console.log("  media_assets di-update");
}

if (apply) {
    if (existsSync(BACKUP)) backupRows.unshift(...JSON.parse(readFileSync(BACKUP, "utf8")));
    writeFileSync(BACKUP, JSON.stringify(backupRows, null, 2));
}
writeFileSync(REPORT, JSON.stringify(report, null, 2));
console.log("\n" + JSON.stringify(report, null, 2));
console.log(apply ? `Backup data URI lama: ${BACKUP}` : "Jalankan dengan --apply untuk eksekusi.");
