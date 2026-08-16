import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SeoSettings = {
    id: boolean;
    site_name: string;
    tagline: string;
    default_og_image: string | null;
    organization_name: string;
    organization_url: string;
    organization_logo: string | null;
    same_as: string[];
    google_site_verification: string | null;
    yandex_verification: string | null;
    bing_site_verification: string | null;
    robots_policy: string;
    ai_crawler_policy: string;
    llms_txt_enabled: boolean;
    indexnow_enabled: boolean;
    default_schema_type: string;
    updated_at: string;
};

type ArticleAuditRow = {
    id: string;
    slug: string;
    title: string;
    status: string;
    seo_title: string | null;
    meta_description: string | null;
    focus_keyword: string | null;
    tags: string[] | null;
    published_at: string | null;
    updated_at: string;
    featured_media_id: string | null;
    score: number;
    issues: string[];
};

const defaultSettings: SeoSettings = {
    id: true,
    site_name: "SwapNews",
    tagline: "Bukan Berita Biasa",
    default_og_image: null,
    organization_name: "SwapNews",
    organization_url: "https://swapnews.co.id",
    organization_logo: "https://swapnews.co.id/swapnews-logo.png",
    same_as: [],
    google_site_verification: null,
    yandex_verification: null,
    bing_site_verification: null,
    robots_policy: "index,follow",
    ai_crawler_policy: "search-allowed-training-review",
    llms_txt_enabled: false,
    indexnow_enabled: false,
    default_schema_type: "NewsArticle",
    updated_at: new Date(0).toISOString(),
};

async function guard() {
    const profile = await getCurrentProfile();
    return profile?.role === "super_admin" ? profile : null;
}

function auditArticle(row: Record<string, unknown>): ArticleAuditRow {
    const issues: string[] = [];
    const title = typeof row.title === "string" ? row.title : "";
    const seoTitle = typeof row.seo_title === "string" && row.seo_title.trim() ? row.seo_title.trim() : null;
    const description = typeof row.meta_description === "string" && row.meta_description.trim() ? row.meta_description.trim() : null;
    if (!seoTitle) issues.push("SEO title kosong");
    else if (seoTitle.length < 30 || seoTitle.length > 65) issues.push("Panjang SEO title perlu ditinjau");
    if (!description) issues.push("Meta description kosong");
    else if (description.length < 100 || description.length > 170) issues.push("Panjang meta description perlu ditinjau");
    if (!row.featured_media_id) issues.push("Belum ada featured image/alt text");
    if (!row.focus_keyword) issues.push("Focus keyword belum diisi");
    if (!Array.isArray(row.tags) || row.tags.length === 0) issues.push("Tag belum diisi");
    if (!title || title.length < 20) issues.push("Headline terlalu pendek");
    const checks = 6 - Math.min(issues.length, 6);
    return {
        id: String(row.id), slug: String(row.slug), title, status: String(row.status), seo_title: seoTitle,
        meta_description: description, focus_keyword: typeof row.focus_keyword === "string" ? row.focus_keyword : null,
        tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
        published_at: typeof row.published_at === "string" ? row.published_at : null,
        updated_at: String(row.updated_at), featured_media_id: typeof row.featured_media_id === "string" ? row.featured_media_id : null,
        score: Math.round((checks / 6) * 100), issues,
    };
}

export async function GET() {
    if (!await guard()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const supabase = await createClient();
    const [{ data: rows, error: articlesError }, { data: settings }] = await Promise.all([
        supabase.from("articles").select("id,slug,title,status,seo_title,meta_description,focus_keyword,tags,published_at,updated_at,featured_media_id").order("updated_at", { ascending: false }).limit(1000),
        supabase.from("site_seo_settings").select("id,site_name,tagline,default_og_image,organization_name,organization_url,organization_logo,same_as,google_site_verification,yandex_verification,bing_site_verification,robots_policy,ai_crawler_policy,llms_txt_enabled,indexnow_enabled,default_schema_type,updated_at").eq("id", true).maybeSingle(),
    ]);
    if (articlesError) return NextResponse.json({ error: articlesError.message }, { status: 500 });
    const articles = (rows ?? []).map((row) => auditArticle(row as Record<string, unknown>));
    const published = articles.filter((article) => article.status === "published");
    const scores = published.map((article) => article.score);
    return NextResponse.json({
        settings: settings ? { ...defaultSettings, ...settings, same_as: Array.isArray(settings.same_as) ? settings.same_as : [] } : defaultSettings,
        articles,
        stats: {
            total: articles.length, published: published.length,
            missing_title: published.filter((article) => !article.seo_title).length,
            missing_description: published.filter((article) => !article.meta_description).length,
            missing_media: published.filter((article) => !article.featured_media_id).length,
            average_score: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
            fresh_48h: published.filter((article) => article.published_at && Date.now() - new Date(article.published_at).getTime() < 48 * 60 * 60 * 1000).length,
        },
    });
}

export async function PATCH(request: NextRequest) {
    const profile = await guard();
    if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const allowed = ["site_name", "tagline", "default_og_image", "organization_name", "organization_url", "organization_logo", "same_as", "google_site_verification", "yandex_verification", "bing_site_verification", "robots_policy", "ai_crawler_policy", "llms_txt_enabled", "indexnow_enabled", "default_schema_type"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) if (key in body) updates[key] = body[key];
    if (typeof updates.organization_url === "string" && !/^https:\/\//i.test(updates.organization_url)) return NextResponse.json({ error: "Organization URL wajib HTTPS" }, { status: 400 });
    if ("same_as" in updates && (!Array.isArray(updates.same_as) || updates.same_as.some((value) => typeof value !== "string" || value.length > 300))) return NextResponse.json({ error: "same_as harus array URL valid" }, { status: 400 });
    updates.updated_by = profile.id;
    updates.updated_at = new Date().toISOString();
    const supabase = await createClient();
    const { data, error } = await supabase.from("site_seo_settings").upsert({ id: true, ...updates }).select("id,site_name,tagline,default_og_image,organization_name,organization_url,organization_logo,same_as,google_site_verification,yandex_verification,bing_site_verification,robots_policy,ai_crawler_policy,llms_txt_enabled,indexnow_enabled,default_schema_type,updated_at").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, settings: data });
}
