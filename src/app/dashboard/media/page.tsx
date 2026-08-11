import { redirect } from "next/navigation";
import Image from "next/image";
import { ImagePlus, Search } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isEditorialRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { buildImageUrl } from "@/lib/cloudinary";
import { DashboardLayout } from "@/components/dashboard-layout";
import { MediaSeoEditor } from "@/components/media-seo-editor";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Media Library",
    description: "Media library Cloudinary SwapNews.",
};

type MediaAsset = {
    id: string;
    public_id: string;
    secure_url: string;
    alt_text: string;
    title: string | null;
    caption: string | null;
    description: string | null;
    credit: string | null;
    width: number | null;
    height: number | null;
    bytes: number | null;
    created_at: string;
};

type MediaPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

function formatBytes(bytes: number | null) {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function escapeSearchTerm(value: string) {
    return value.replace(/[\\%_(),."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export default async function MediaPage({ searchParams }: MediaPageProps) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/login?next=/dashboard/media");
    if (!isEditorialRole(profile.role)) redirect("/dashboard");

    const params = await searchParams;
    const search = escapeSearchTerm(getParam(params, "search") ?? "");

    const supabase = await createClient();
    let query = supabase
        .from("media_assets")
        .select("id,public_id,secure_url,alt_text,title,caption,description,credit,width,height,bytes,created_at")
        .order("created_at", { ascending: false });

    if (search) {
        query = query.or(`title.ilike.%${search}%,alt_text.ilike.%${search}%,public_id.ilike.%${search}%`);
    }

    const { data, error } = await query;
    const assets = (data ?? []) as MediaAsset[];
    const totalBytes = assets.reduce((sum, asset) => sum + (asset.bytes ?? 0), 0);

    return (
        <DashboardLayout profile={profile}>
            <section className="dashboard-hero clay-card">
                <div>
                    <span className="eyebrow">Cloudinary Storage</span>
                    <h1>Galeri Media & Aset</h1>
                    <p>Semua gambar terkompresi otomatis 40% (Quality 60) dan dikonversi ke format WebP.</p>
                </div>

                <div className="media-summary" aria-label="Ringkasan media">
                    <strong>{assets.length}</strong><span>Aset</span>
                    <strong>{formatBytes(totalBytes)}</strong><span>Storage</span>
                </div>
            </section>

            <section className="dashboard-panel clay-card">
                <form method="get" className="cms-filter">
                    <div className="cms-filter-row">
                        <label className="cms-search">
                            Cari aset gambar
                            <input name="search" type="search" placeholder="Judul, alt text, atau public ID..." defaultValue={search} />
                        </label>
                        <button type="submit" className="secondary-button">
                            <Search size={16} />
                            Cari
                        </button>
                    </div>
                </form>

                {error ? (
                    <div className="auth-alert error">Gagal memuat media: {error.message}</div>
                ) : assets.length === 0 ? (
                    <div className="cms-empty-state">
                        <ImagePlus size={36} />
                        <h2>Belum ada media</h2>
                        <p>Upload gambar pertama kamu dari form artikel menggunakan Media Picker. Semua file otomatis diproses ke WebP oleh Cloudinary.</p>
                    </div>
                ) : (
                    <div className="media-grid">
                        {assets.map((asset) => {
                            const thumb = buildImageUrl(asset.public_id, { width: 400, height: 300, crop: "fill", format: "webp", quality: "60" });
                            return (
                                <article className="media-card clay-card" key={asset.id}>
                                    <div className="media-thumb">
                                        <Image src={thumb} alt={asset.alt_text || asset.title || asset.public_id} width={400} height={300} loading="lazy" />
                                    </div>
                                    <div className="media-info">
                                        <strong>{asset.title || asset.public_id}</strong>
                                        <small>{asset.alt_text || "Tanpa alt text"}</small>
                                        <div className="media-meta">
                                            <span>{asset.width ?? "?"}×{asset.height ?? "?"}</span>
                                            <span>{formatBytes(asset.bytes)}</span>
                                            <span>{asset.credit ?? "—"}</span>
                                        </div>
                                        <MediaSeoEditor asset={asset} />
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </DashboardLayout>
    );
}
