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
    if (!value) return null;

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
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
    const canPublishDirect = profile.role === "super_admin" || profile.role === "wartawan";
    const requestedStatus = getString(formData, "status");
    if (requestedStatus === "publish_direct" && !canPublishDirect) {
        redirect("/dashboard/articles/new?error=Akses%20direct%20publish%20ditolak");
    }
    const directPublish = requestedStatus === "publish_direct";
    const status = directPublish ? "published" : requestedStatus === "in_review" ? "in_review" : "draft";
    const requestedSlug = normalizeSlug(getString(formData, "slug"));
    const focusKeyword = getString(formData, "focus_keyword").slice(0, 120);
    const seoTitle = getString(formData, "seo_title").slice(0, 70);
    const metaDescription = getString(formData, "meta_description").slice(0, 170);
    const tags = parseTags(getString(formData, "tags"));
    const featuredMediaId = getString(formData, "featured_media_id") || null;
    const publishedAt = directPublish ? new Date().toISOString() : null;

    if (!title || !content) redirect("/dashboard/articles/new?error=Judul%20dan%20konten%20wajib%20diisi");
    if (!requestedSlug || RESERVED_SLUGS.has(requestedSlug)) redirect("/dashboard/articles/new?error=Slug%20tidak%20valid%20atau%20dilarang");
    if ((directPublish || status === "in_review") && categoryId === null) {
        redirect("/dashboard/articles/new?error=Kategori%20wajib%20dipilih%20sebelum%20artikel%20dikirim%20atau%20diterbitkan");
    }
    if (await slugExists(requestedSlug)) redirect("/dashboard/articles/new?error=Slug%20sudah%20digunakan");

    const supabase = await createClient();
    const slug = requestedSlug;
    let categorySlug: string | null = null;

    if (categoryId !== null) {
        const { data: category, error: categoryError } = await supabase
            .from("categories")
            .select("slug")
            .eq("id", categoryId)
            .maybeSingle();

        if (categoryError || !category) {
            console.error("createArticleAction category lookup failed", { categoryId, categoryError });
            redirect("/dashboard/articles/new?error=Kategori%20tidak%20valid.%20Pilih%20kategori%20kembali");
        }
        categorySlug = category.slug;
    }

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
            published_at: publishedAt,
        })
        .select("id")
        .single();

    if (error || !data) {
        console.error("createArticleAction insert failed", {
            code: error?.code,
            message: error?.message,
            details: error?.details,
        });
        const code = error?.code ? ` (${error.code})` : "";
        redirect(`/dashboard/articles/new?error=${encodeURIComponent(`Gagal menyimpan artikel${code}. Silakan coba lagi.`)}`);
    }

    if (directPublish && profile.role === "wartawan") {
        const { error: pointsError } = await supabase.rpc("award_article_points", {
            p_article_id: data.id,
            p_points: 5,
            p_reviewer_id: profile.id,
        });
        if (pointsError) {
            console.error("createArticleAction direct-publish points failed", {
                articleId: data.id,
                code: pointsError.code,
                message: pointsError.message,
            });
        }
    }

    revalidatePath("/dashboard/articles");
    if (directPublish) {
        revalidatePath("/");
        revalidatePath(`/${slug}`);
        revalidatePath("/sitemap.xml");
        if (categorySlug) revalidatePath(`/kanal/${categorySlug}`);
        redirect(`/dashboard/articles?success=${encodeURIComponent(`Artikel “${title}” berhasil diterbitkan`)}`);
    }
    redirect(`/dashboard/articles/${data.id}?success=${encodeURIComponent("Draft artikel berhasil dibuat")}`);
}

export async function updateArticleAction(formData: FormData) {
    const profile = await getCurrentProfile();
    if (!profile || !isEditorialRole(profile.role as AppRole)) {
        redirect("/panelswap");
    }

    const id = getString(formData, "id");
    if (!id) redirect("/dashboard/articles");

    const supabase = await createClient();
    const { data: existing, error: fetchError } = await supabase.from("articles").select("author_id,status,slug").eq("id", id).maybeSingle();

    if (fetchError) {
        console.error("updateArticleAction article lookup failed", { id, code: fetchError.code, message: fetchError.message });
        redirect(`/dashboard/articles?error=${encodeURIComponent(`Gagal membaca artikel (${fetchError.code}). Silakan coba lagi.`)}`);
    }
    if (!existing) {
        redirect("/dashboard/articles?error=Artikel%20tidak%20ditemukan");
    }

    // Every editorial role can edit every article. Database RLS mirrors this check.
    // Changing author_id remains protected by a SuperAdmin-only database trigger.

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

    const isAdmin = isAdminRole(profile.role as AppRole);
    const isSuperAdmin = profile.role === "super_admin";
    const canPublishDirect = isSuperAdmin || profile.role === "wartawan";
    if (action === "publish_direct" && !canPublishDirect) {
        redirect(`/dashboard/articles/${id}?error=Akses%20direct%20publish%20ditolak`);
    }
    if (action === "submit_review" && ["draft", "revision", "rejected"].includes(status)) status = "in_review";
    if (action === "publish_direct") {
        status = "published";
        publishedAt = new Date().toISOString();
        scheduledAt = null;
    }
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

    if (["published", "in_review", "scheduled"].includes(status) && categoryId === null) {
        redirect(`/dashboard/articles/${id}?error=Kategori%20wajib%20dipilih%20sebelum%20artikel%20dikirim%20atau%20diterbitkan`);
    }

    let categorySlug: string | null = null;
    if (categoryId !== null) {
        const { data: category, error: categoryError } = await supabase
            .from("categories")
            .select("slug")
            .eq("id", categoryId)
            .maybeSingle();

        if (categoryError || !category) {
            console.error("updateArticleAction category lookup failed", { id, categoryId, categoryError });
            redirect(`/dashboard/articles/${id}?error=Kategori%20tidak%20valid.%20Pilih%20kategori%20kembali`);
        }
        categorySlug = category.slug;
    }

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
        console.error("updateArticleAction update failed", { id, code: error.code, message: error.message, details: error.details });
        redirect(`/dashboard/articles/${id}?error=${encodeURIComponent(`Gagal menyimpan artikel (${error.code}). Silakan coba lagi.`)}`);
    }

    if (action === "publish_direct" && profile.role === "wartawan") {
        const { error: pointsError } = await supabase.rpc("award_article_points", {
            p_article_id: id,
            p_points: 5,
            p_reviewer_id: profile.id,
        });
        if (pointsError) {
            console.error("updateArticleAction direct-publish points failed", {
                articleId: id,
                code: pointsError.code,
                message: pointsError.message,
            });
        }
    }

    // Award dynamic points to author when article is published with rating >= 5.
    if (pointsToAward && pointsToAward >= 5 && status === "published") {
        const { error: pointsError } = await supabase.rpc("award_article_points", {
            p_article_id: id,
            p_points: pointsToAward,
            p_reviewer_id: profile.id,
        });
        if (pointsError) {
            console.error("updateArticleAction review points failed", {
                articleId: id,
                code: pointsError.code,
                message: pointsError.message,
            });
        }
    }

    if (editorialNote) {
        const { error: noteError } = await supabase.from("editorial_notes").insert({ article_id: id, author_id: profile.id, note: editorialNote });
        if (noteError) redirect(`/dashboard/articles/${id}?error=${encodeURIComponent(noteError.message)}`);
    }

    revalidatePath("/dashboard/articles");
    revalidatePath(`/dashboard/articles/${id}`);
    if (status === "published" || existing.status === "published") {
        revalidatePath("/");
        revalidatePath(`/${existing.slug}`);
        revalidatePath("/sitemap.xml");
        if (slug !== existing.slug) revalidatePath(`/${slug}`);
        if (categorySlug) revalidatePath(`/kanal/${categorySlug}`);
    }
    if (action === "publish_direct") {
        redirect(`/dashboard/articles?success=${encodeURIComponent(`Artikel “${title}” berhasil diterbitkan`)}`);
    }
    redirect(`/dashboard/articles/${id}?success=${encodeURIComponent("Perubahan artikel berhasil disimpan")}`);
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

export async function transferArticleAuthorshipAction(formData: FormData) {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin") {
        redirect("/dashboard/articles?error=Akses%20transfer%20penulis%20ditolak");
    }

    const newAuthorId = getString(formData, "new_author_id");
    const mode = getString(formData, "mode");
    const ids = getString(formData, "ids").split(",").map((id) => id.trim()).filter(Boolean);
    const categoryId = getNumber(formData, "category_id");

    if (!newAuthorId) {
        redirect("/dashboard/articles?error=Pilih%20wartawan%20tujuan");
    }
    if (mode === "selected" && ids.length === 0) {
        redirect("/dashboard/articles?error=Pilih%20minimal%20satu%20artikel");
    }
    if (mode === "category" && categoryId === null) {
        redirect("/dashboard/articles?error=Pilih%20kategori%20yang%20akan%20dipindahkan");
    }
    if (!new Set(["selected", "category"]).has(mode)) {
        redirect("/dashboard/articles?error=Mode%20transfer%20tidak%20valid");
    }

    const supabase = await createClient();
    const { data: affected, error } = await supabase.rpc("transfer_article_authorship", {
        p_new_author_id: newAuthorId,
        p_article_ids: mode === "selected" ? ids : null,
        p_category_id: mode === "category" ? categoryId : null,
    });

    if (error) {
        console.error("transferArticleAuthorshipAction failed", {
            actorId: profile.id,
            mode,
            code: error.code,
            message: error.message,
        });
        redirect(`/dashboard/articles?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/", "layout");
    revalidatePath("/dashboard/articles");
    revalidatePath("/dashboard/wartawan");
    revalidatePath("/sitemap.xml");
    redirect(`/dashboard/articles?success=${encodeURIComponent(`${Number(affected) || 0} artikel berhasil dipindahkan ke wartawan baru`)}`);
}

