import type { MetadataRoute } from "next";

import { queryPublishedSitemapArticles } from "@/lib/public-articles";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = "https://swapnews.co.id";
    const articles = await queryPublishedSitemapArticles();
    const latestDate = articles[0]?.updated_at ? new Date(articles[0].updated_at) : new Date("2026-01-01T00:00:00Z");
    return [
        { url: base, lastModified: latestDate, changeFrequency: "hourly", priority: 1 },
        ...articles.map((article) => ({
            url: `${base}/${article.slug}`,
            lastModified: new Date(article.updated_at),
            changeFrequency: "daily" as const,
            priority: 0.8,
        })),
    ];
}
