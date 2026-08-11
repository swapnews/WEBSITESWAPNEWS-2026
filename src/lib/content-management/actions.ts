"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
    const item = formData.get(key);
    return typeof item === "string" ? item.trim() : "";
}

function slugify(input: string) {
    return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}

async function requireSuperAdmin(next = "/dashboard") {
    const profile = await getCurrentProfile();
    if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`);
    if (profile.role !== "super_admin") redirect("/dashboard?error=Akses%20khusus%20Super%20Admin");
    return profile;
}

export async function saveCategoryAction(formData: FormData) {
    await requireSuperAdmin("/dashboard/categories");
    const id = Number(value(formData, "id")) || null;
    const name = value(formData, "name");
    const slug = slugify(value(formData, "slug") || name);
    const description = value(formData, "description") || null;
    const parentId = Number(value(formData, "parent_id")) || null;
    const sortOrder = Number(value(formData, "sort_order")) || 0;
    const isActive = formData.get("is_active") === "on";
    if (!name || !slug || (id && parentId === id)) redirect("/dashboard/categories?error=Data%20kategori%20tidak%20valid");

    const supabase = await createClient();
    const payload = { name, slug, description, parent_id: parentId, sort_order: sortOrder, is_active: isActive };
    const result = id
        ? await supabase.from("categories").update(payload).eq("id", id)
        : await supabase.from("categories").insert(payload);
    if (result.error) redirect(`/dashboard/categories?error=${encodeURIComponent(result.error.message)}`);
    revalidatePath("/dashboard/categories");
    revalidatePath("/");
    redirect("/dashboard/categories?success=Kategori%20tersimpan");
}

export async function deleteCategoryAction(formData: FormData) {
    await requireSuperAdmin("/dashboard/categories");
    const id = Number(value(formData, "id"));
    if (!id) redirect("/dashboard/categories");
    const supabase = await createClient();
    const [{ count: articleCount }, { count: childCount }] = await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }).eq("category_id", id),
        supabase.from("categories").select("id", { count: "exact", head: true }).eq("parent_id", id),
    ]);
    if ((articleCount ?? 0) > 0 || (childCount ?? 0) > 0) redirect("/dashboard/categories?error=Kategori%20masih%20dipakai%20artikel%20atau%20subkategori");
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) redirect(`/dashboard/categories?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/dashboard/categories");
    redirect("/dashboard/categories?success=Kategori%20dihapus");
}

export async function savePageAction(formData: FormData) {
    const profile = await requireSuperAdmin("/dashboard/pages");
    const id = value(formData, "id") || null;
    const title = value(formData, "title");
    const slug = slugify(value(formData, "slug") || title);
    const content = value(formData, "content");
    const status = value(formData, "status") === "published" ? "published" : "draft";
    if (!title || !slug || !content) redirect(`/dashboard/pages/${id || "new"}?error=Judul,%20slug,%20dan%20konten%20wajib%20diisi`);
    const payload = {
        title, slug, content, status,
        excerpt: value(formData, "excerpt") || null,
        featured_media_id: value(formData, "featured_media_id") || null,
        focus_keyword: value(formData, "focus_keyword") || null,
        seo_title: value(formData, "seo_title") || null,
        meta_description: value(formData, "meta_description") || null,
        tags: [...new Set(value(formData, "tags").split(",").map((tag) => tag.trim()).filter(Boolean))],
        published_at: status === "published" ? new Date().toISOString() : null,
    };
    const supabase = await createClient();
    const result = id
        ? await supabase.from("pages").update(payload).eq("id", id).select("id").single()
        : await supabase.from("pages").insert({ ...payload, author_id: profile.id }).select("id").single();
    if (result.error || !result.data) redirect(`/dashboard/pages/${id || "new"}?error=${encodeURIComponent(result.error?.message ?? "Gagal menyimpan page")}`);
    revalidatePath("/dashboard/pages");
    revalidatePath(`/page/${slug}`);
    redirect(`/dashboard/pages/${result.data.id}?success=Page%20tersimpan`);
}

export async function deletePageAction(formData: FormData) {
    await requireSuperAdmin("/dashboard/pages");
    const id = value(formData, "id");
    if (!id) redirect("/dashboard/pages");
    const supabase = await createClient();
    const { error } = await supabase.from("pages").delete().eq("id", id);
    if (error) redirect(`/dashboard/pages?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/dashboard/pages");
    redirect("/dashboard/pages?success=Page%20dihapus");
}

function instagramEmbedUrl(input: string) {
    try {
        const url = new URL(input);
        const host = url.hostname.toLowerCase().replace(/^www\./, "");
        if (url.protocol !== "https:" || host !== "instagram.com") return null;
        const match = url.pathname.match(/^\/(reel|p)\/([A-Za-z0-9_-]+)\/?/);
        if (!match) return null;
        return `https://www.instagram.com/${match[1]}/${match[2]}/embed/`;
    } catch {
        return null;
    }
}

export async function saveReelAction(formData: FormData) {
    await requireSuperAdmin("/dashboard/reels");
    const id = value(formData, "id") || null;
    const instagramUrl = value(formData, "instagram_url");
    const embedUrl = instagramEmbedUrl(instagramUrl);
    const title = value(formData, "title");
    if (!embedUrl || !title) redirect("/dashboard/reels?error=URL%20Instagram%20atau%20judul%20tidak%20valid");
    const payload = {
        instagram_url: instagramUrl,
        embed_url: embedUrl,
        title,
        caption: value(formData, "caption") || null,
        sort_order: Number(value(formData, "sort_order")) || 0,
        is_active: formData.get("is_active") === "on",
    };
    const supabase = await createClient();
    const result = id ? await supabase.from("social_reels").update(payload).eq("id", id) : await supabase.from("social_reels").insert(payload);
    if (result.error) redirect(`/dashboard/reels?error=${encodeURIComponent(result.error.message)}`);
    revalidatePath("/dashboard/reels");
    revalidatePath("/");
    redirect("/dashboard/reels?success=Reel%20tersimpan");
}

export async function deleteReelAction(formData: FormData) {
    await requireSuperAdmin("/dashboard/reels");
    const id = value(formData, "id");
    if (!id) redirect("/dashboard/reels");
    const supabase = await createClient();
    const { error } = await supabase.from("social_reels").delete().eq("id", id);
    if (error) redirect(`/dashboard/reels?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/dashboard/reels");
    revalidatePath("/");
    redirect("/dashboard/reels?success=Reel%20dihapus");
}

export async function saveHomepageSectionAction(formData: FormData) {
    await requireSuperAdmin("/dashboard/homepage");
    const id = value(formData, "id");
    if (!id) redirect("/dashboard/homepage?error=Modul%20tidak%20valid");
    const payload = {
        title: value(formData, "title"),
        is_enabled: formData.get("is_enabled") === "on",
        sort_order: Number(value(formData, "sort_order")) || 0,
        style_variant: value(formData, "style_variant") || "default",
        category_slug: value(formData, "category_slug") || null,
    };
    const supabase = await createClient();
    const { error } = await supabase.from("homepage_sections").update(payload).eq("id", id);
    if (error) redirect(`/dashboard/homepage?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/dashboard/homepage");
    revalidatePath("/");
    redirect("/dashboard/homepage?success=Modul%20homepage%20diperbarui");
}

export async function saveBreakingNewsAction(formData: FormData) {
    await requireSuperAdmin("/dashboard/homepage");
    const id = value(formData, "id") || null;
    const headline = value(formData, "headline");
    const targetUrl = value(formData, "target_url") || "/";
    const startsAt = value(formData, "starts_at");
    const endsAt = value(formData, "ends_at");
    if (headline.length < 5 || (!targetUrl.startsWith("/") && !targetUrl.startsWith("https://"))) redirect("/dashboard/homepage?error=Headline%20atau%20link%20tidak%20valid");
    const payload = {
        headline, target_url: targetUrl,
        priority: Number(value(formData, "priority")) || 0,
        starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        is_active: formData.get("is_active") === "on",
    };
    if (payload.ends_at && payload.ends_at <= payload.starts_at) redirect("/dashboard/homepage?error=Waktu%20selesai%20harus%20setelah%20mulai");
    const supabase = await createClient();
    const result = id ? await supabase.from("breaking_news").update(payload).eq("id", id) : await supabase.from("breaking_news").insert(payload);
    if (result.error) redirect(`/dashboard/homepage?error=${encodeURIComponent(result.error.message)}`);
    revalidatePath("/dashboard/homepage");
    revalidatePath("/");
    redirect("/dashboard/homepage?success=Breaking%20news%20tersimpan");
}

export async function deleteBreakingNewsAction(formData: FormData) {
    await requireSuperAdmin("/dashboard/homepage");
    const id = value(formData, "id");
    if (!id) redirect("/dashboard/homepage");
    const supabase = await createClient();
    const { error } = await supabase.from("breaking_news").delete().eq("id", id);
    if (error) redirect(`/dashboard/homepage?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/dashboard/homepage");
    revalidatePath("/");
    redirect("/dashboard/homepage?success=Breaking%20news%20dihapus");
}
