import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/get-profile";
import type { AppRole } from "@/lib/auth/roles";
import { isAdminRole } from "@/lib/auth/roles";

export type ArticleStatus = "draft" | "in_review" | "revision" | "scheduled" | "published" | "rejected" | "archived";

export type Article = {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    content: string;
    status: ArticleStatus;
    category_id: number | null;
    author_id: string;
    featured_media_id: string | null;
    published_at: string | null;
    scheduled_at: string | null;
    view_count: number;
    reading_time_minutes: number;
    is_exclusive: boolean;
    focus_keyword: string | null;
    seo_title: string | null;
    meta_description: string | null;
    tags: string[];
    created_at: string;
    updated_at: string;
    author_name?: string | null;
    category_name?: string | null;
    featured_media?: {
        public_id: string;
        secure_url: string;
        alt_text: string;
        title: string | null;
    } | null;
};

export type DashboardArticle = Pick<
    Article,
    | "id"
    | "slug"
    | "title"
    | "excerpt"
    | "status"
    | "category_id"
    | "author_id"
    | "featured_media_id"
    | "published_at"
    | "scheduled_at"
    | "view_count"
    | "created_at"
    | "updated_at"
> & Pick<Article, "author_name" | "category_name" | "featured_media">;

export type Category = {
    id: number;
    name: string;
    slug: string;
    parent_id: number | null;
    sort_order: number;
    is_active: boolean;
    parent_name?: string | null;
};

function slugify(text: string) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

export async function generateUniqueSlug(title: string) {
    const baseSlug = slugify(title) || "artikel";
    const supabase = await createClient();
    let slug = baseSlug;
    let counter = 2;

    while (true) {
        const { data } = await supabase.from("articles").select("id").eq("slug", slug).maybeSingle();
        if (!data) return slug;
        slug = `${baseSlug}-${counter}`;
        counter += 1;
    }
}

export const getCategories = cache(async (): Promise<Category[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,parent_id,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order");
    if (error) return [];

    const categories = data as Category[];
    const parentNames = new Map(categories.filter((category) => !category.parent_id).map((category) => [category.id, category.name]));
    return categories.map((category) => ({
        ...category,
        parent_name: category.parent_id ? parentNames.get(category.parent_id) ?? null : null,
    }));
});

export async function getArticlesForDashboard(profile: Profile, limit?: number): Promise<DashboardArticle[]> {
    const supabase = await createClient();
    const canViewAll = isAdminRole(profile.role as AppRole);

    let query = supabase
        .from("articles")
        .select(
            "id,slug,title,excerpt,status,category_id,author_id,featured_media_id,published_at,scheduled_at,view_count,created_at,updated_at",
        )
        .order("updated_at", { ascending: false });

    if (!canViewAll) {
        query = query.eq("author_id", profile.id);
    }

    if (limit) {
        query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) return [];

    const articles = data as Omit<DashboardArticle, "author_name" | "category_name" | "featured_media">[];

    const authorIds = [...new Set(articles.map((article) => article.author_id))];
    const categoryIds = [...new Set(articles.map((article) => article.category_id).filter(Boolean))] as number[];
    const mediaIds = [...new Set(articles.map((article) => article.featured_media_id).filter(Boolean))] as string[];

    const [authors, categories, media] = await Promise.all([
        authorIds.length
            ? supabase.from("profiles").select("id,full_name,email").in("id", authorIds)
            : Promise.resolve({ data: [], error: null }),
        categoryIds.length
            ? supabase.from("categories").select("id,name").in("id", categoryIds)
            : Promise.resolve({ data: [], error: null }),
        mediaIds.length
            ? supabase.from("media_assets").select("id,public_id,secure_url,alt_text,title").in("id", mediaIds)
            : Promise.resolve({ data: [], error: null }),
    ]);

    const authorMap = new Map((authors.data ?? []).map((author) => [author.id, author.full_name ?? author.email]));
    const categoryMap = new Map((categories.data ?? []).map((category) => [category.id, category.name]));
    const mediaMap = new Map((media.data ?? []).map((asset) => [asset.id, asset]));

    return articles.map((article) => ({
        ...article,
        author_name: authorMap.get(article.author_id) ?? null,
        category_name: article.category_id ? categoryMap.get(article.category_id) ?? null : null,
        featured_media: article.featured_media_id ? mediaMap.get(article.featured_media_id) ?? null : null,
    }));
}

export async function getArticleById(id: string, profile: Profile) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("articles")
        .select(
            "id,slug,title,excerpt,content,status,category_id,author_id,featured_media_id,published_at,scheduled_at,view_count,reading_time_minutes,is_exclusive,focus_keyword,seo_title,meta_description,tags,created_at,updated_at",
        )
        .eq("id", id)
        .single();

    if (error || !data) return null;

    const article = data as Omit<Article, "author_name" | "category_name" | "featured_media">;
    const canViewAll = isAdminRole(profile.role as AppRole);

    if (!canViewAll && article.author_id !== profile.id) {
        return null;
    }

    const [author, category, media] = await Promise.all([
        supabase.from("profiles").select("full_name,email").eq("id", article.author_id).single(),
        article.category_id
            ? supabase.from("categories").select("name").eq("id", article.category_id).single()
            : Promise.resolve({ data: null }),
        article.featured_media_id
            ? supabase.from("media_assets").select("public_id,secure_url,alt_text,title").eq("id", article.featured_media_id).single()
            : Promise.resolve({ data: null }),
    ]);

    return {
        ...article,
        author_name: author.data?.full_name ?? author.data?.email ?? null,
        category_name: category.data?.name ?? null,
        featured_media: media.data ?? null,
    } as Article;
}
