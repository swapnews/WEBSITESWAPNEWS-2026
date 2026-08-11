import type { MetadataRoute } from "next";

import { queryPublishedSitemapArticles } from "@/lib/public-articles";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = "https://swapnews.co.id";
    const articles = await queryPublishedSitemapArticles();
    return [
        { url: base, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
        ...articles.map((article) => ({
            url: `${base}/${article.slug}`,
            lastModified: new Date(article.updated_at),
            changeFrequency: "daily" as const,
            priority: 0.8,
        })),
    ];
}
