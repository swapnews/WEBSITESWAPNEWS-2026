"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isAdminRole, isEditorialRole } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/auth/roles";

function getString(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string) {
    const value = getString(formData, key);
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function getBool(formData: FormData, key: string) {
    return formData.get(key) === "on" || formData.get(key) === "true";
}

const RESERVED_SLUGS = new Set(["dashboard", "member", "membership", "merchandise", "login", "panelswap", "cari", "api", "artikel", "auth", "robots.txt", "sitemap.xml", "manifest.webmanifest", "news", "_next"]);

function normalizeSlug(value: string) {
    return value.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

function parseTags(value: string) {
    return [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
}

function readingTime(html: string) {
    const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
}

async function slugExists(slug: string, excludeId?: string) {
    const supabase = await createClient();
    let query = supabase.from("articles").select("id").eq("slug", slug);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.maybeSingle();
    return Boolean(data);
}

export async function createArticleAction(formData: FormData) {
    const profile = await getCurrentProfile();
    if (!profile || !isEditorialRole(profile.role as AppRole)) {
        redirect("/panelswap?next=/dashboard/articles/new");
    }

    const title = getString(formData, "title");
    const excerpt = getString(formData, "excerpt");
    const content = getString(formData, "content");
    const categoryId = getNumber(formData, "category_id");
    const isExclusive = getBool(formData, "is_exclusive");
    const status = getString(formData, "status") === "in_review" ? "in_review" : "draft";
    const requestedSlug = normalizeSlug(getString(formData, "slug"));
    const focusKeyword = getString(formData, "focus_keyword").slice(0, 120);
    const seoTitle = getString(formData, "seo_title").slice(0, 70);
    const metaDescription = getString(formData, "meta_description").slice(0, 170);
    const tags = parseTags(getString(formData, "tags"));
    const featuredMediaId = getString(formData, "featured_media_id") || null;

    if (!title || !content) redirect("/dashboard/articles/new?error=Judul%20dan%20konten%20wajib%20diisi");
    if (!requestedSlug || RESERVED_SLUGS.has(requestedSlug)) redirect("/dashboard/articles/new?error=Slug%20tidak%20valid%20atau%20dilarang");
    if (await slugExists(requestedSlug)) redirect("/dashboard/articles/new?error=Slug%20sudah%20digunakan");

    const supabase = await createClient();
    const slug = requestedSlug;

    const { data, error } = await supabase
        .from("articles")
        .insert({
            title,
            excerpt: excerpt || null,
            content,
            category_id: categoryId,
            author_id: profile.id,
            status,
            is_exclusive: isExclusive,
            slug,
            focus_keyword: focusKeyword || null,
            seo_title: seoTitle || null,
            meta_description: metaDescription || null,
            tags,
            featured_media_id: featuredMediaId,
            reading_time_minutes: readingTime(content),
        })
        .select("id")
        .single();

    if (error || !data) {
        redirect(`/dashboard/articles/new?error=${encodeURIComponent(error?.message ?? "Gagal membuat artikel")}`);
    }

    revalidatePath("/dashboard/articles");
    redirect(`/dashboard/articles/${data.id}`);
}

export async function updateArticleAction(formData: FormData) {
    const profile = await getCurrentProfile();
    if (!profile || !isEditorialRole(profile.role as AppRole)) {
        redirect("/panelswap");
    }

    const id = getString(formData, "id");
    if (!id) redirect("/dashboard/articles");

    const supabase = await createClient();
    const { data: existing, error: fetchError } = await supabase.from("articles").select("author_id,status").eq("id", id).single();

    if (fetchError || !existing) {
        redirect("/dashboard/articles?error=Artikel%20tidak%20ditemukan");
    }

    const isAdmin = isAdminRole(profile.role as AppRole);
    if (!isAdmin && existing.author_id !== profile.id) {
        redirect("/dashboard/articles?error=Akses%20ditolak");
    }

    const title = getString(formData, "title");
    const excerpt = getString(formData, "excerpt");
    const content = getString(formData, "content");
    const categoryId = getNumber(formData, "category_id");
    const isExclusive = getBool(formData, "is_exclusive");
    const action = getString(formData, "action") || "save";
    const slug = normalizeSlug(getString(formData, "slug"));
    const focusKeyword = getString(formData, "focus_keyword").slice(0, 120);
    const seoTitle = getString(formData, "seo_title").slice(0, 70);
    const metaDescription = getString(formData, "meta_description").slice(0, 170);
    const tags = parseTags(getString(formData, "tags"));
    const featuredMediaId = getString(formData, "featured_media_id") || null;

    if (!title || !content || !slug || RESERVED_SLUGS.has(slug)) redirect(`/dashboard/articles/${id}?error=Judul,%20konten,%20dan%20slug%20valid%20wajib%20diisi`);
    if (await slugExists(slug, id)) redirect(`/dashboard/articles/${id}?error=Slug%20sudah%20digunakan`);

    const editorialNote = getString(formData, "editorial_note").slice(0, 2000);
    let status = existing.status;
    let publishedAt: string | null | undefined;
    let scheduledAt: string | null | undefined;
    let pointsToAward: number | undefined;

    if (action === "submit_review" && ["draft", "revision", "rejected"].includes(status)) status = "in_review";
    if (action === "publish" && isAdmin) {
        const awardPoints = Math.floor(Number(getString(formData, "award_points")) || 0);
        if (awardPoints < 5) {
            // Points < 5 means article is not good enough → rejected
            status = "rejected";
        } else {
            // Points 5-10 → publish and award points to author
            pointsToAward = Math.min(awardPoints, 10);
            status = "published";
            publishedAt = new Date().toISOString();
            scheduledAt = null;
        }
    }
    if (action === "revision" && isAdmin) status = "revision";
    if (action === "archive" && isAdmin) status = "archived";
    if (action === "schedule" && isAdmin) {
        const requestedSchedule = getString(formData, "scheduled_at");
        const scheduleDate = new Date(requestedSchedule);
        if (!requestedSchedule || Number.isNaN(scheduleDate.getTime()) || scheduleDate.getTime() <= new Date().getTime()) redirect(`/dashboard/articles/${id}?error=Jadwal%20harus%20di%20masa%20depan`);
        status = "scheduled";
        scheduledAt = scheduleDate.toISOString();
    }
    if (action === "reject" && isAdmin) status = "rejected";

    const updates: Record<string, unknown> = {
        title,
        excerpt: excerpt || null,
        content,
        category_id: categoryId,
        is_exclusive: isExclusive,
        status,
        slug,
        focus_keyword: focusKeyword || null,
        seo_title: seoTitle || null,
        meta_description: metaDescription || null,
        tags,
        featured_media_id: featuredMediaId,
        reading_time_minutes: readingTime(content),
    };
    if (publishedAt) updates.published_at = publishedAt;
    if (scheduledAt !== undefined) updates.scheduled_at = scheduledAt;
    if (isAdmin && action !== "save") {
        updates.reviewed_by = profile.id;
        updates.reviewed_at = new Date().toISOString();
    }

    const { error } = await supabase.from("articles").update(updates).eq("id", id);

    if (error) {
        redirect(`/dashboard/articles/${id}?error=${encodeURIComponent(error.message)}`);
    }

    // Award dynamic points to author when article is published with rating >= 5
    if (pointsToAward && pointsToAward >= 5 && status === "published") {
        await supabase.rpc("award_article_points", {
            p_article_id: id,
            p_points: pointsToAward,
            p_reviewer_id: profile.id,
        });
    }

    if (editorialNote) {
        const { error: noteError } = await supabase.from("editorial_notes").insert({ article_id: id, author_id: profile.id, note: editorialNote });
        if (noteError) redirect(`/dashboard/articles/${id}?error=${encodeURIComponent(noteError.message)}`);
    }

    revalidatePath("/dashboard/articles");
    revalidatePath(`/dashboard/articles/${id}`);
    redirect(`/dashboard/articles/${id}`);
}

export async function deleteArticleAction(formData: FormData) {
    const profile = await getCurrentProfile();
    if (!profile || !isAdminRole(profile.role as AppRole)) {
        redirect("/panelswap");
    }

    const id = getString(formData, "id");
    if (!id) redirect("/dashboard/articles");

    const supabase = await createClient();
    const { error } = await supabase.from("articles").delete().eq("id", id);

    if (error) {
        redirect(`/dashboard/articles/${id}?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/dashboard/articles");
    redirect("/dashboard/articles");
}

export async function deleteBulkArticlesAction(formData: FormData) {
    const profile = await getCurrentProfile();
    if (!profile || !isAdminRole(profile.role as AppRole)) {
        redirect("/panelswap");
    }

    const idsRaw = formData.get("ids") as string;
    if (!idsRaw) redirect("/dashboard/articles?error=Tidak%20ada%20artikel%20terpilih");

    const ids = idsRaw.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) redirect("/dashboard/articles?error=Tidak%20ada%20artikel%20terpilih");

    const supabase = await createClient();
    const { error } = await supabase.from("articles").delete().in("id", ids);

    if (error) {
        redirect(`/dashboard/articles?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/dashboard/articles");
    redirect(`/dashboard/articles?success=${encodeURIComponent(`${ids.length} artikel berhasil dihapus`)}`);
}

