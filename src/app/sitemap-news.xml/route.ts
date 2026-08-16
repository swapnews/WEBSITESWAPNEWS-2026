import { type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export async function GET(_request: NextRequest) {
    const supabase = await createClient();
    const { data: articles, error } = await supabase
        .from("articles")
        .select("slug,title,published_at,tags")
        .eq("status", "published")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(500);

    if (error) {
        return new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:news=\"http://www.google.com/schemas/sitemap-news/0.9\" />", {
            headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" },
        });
    }

    const now = Date.now();
    const recent = (articles ?? []).filter((article) => {
        const published = new Date(article.published_at).getTime();
        return Number.isFinite(published) && now - published < NEWS_WINDOW_MS;
    });

    const urls = recent
        .map((article) => {
            const loc = `https://swapnews.co.id/${article.slug}`;
            const title = escapeXml(article.title);
            const keywords = Array.isArray(article.tags) && article.tags.length
                ? escapeXml(article.tags.slice(0, 10).join(", "))
                : "berita indonesia";
            const publicationDate = new Date(article.published_at).toISOString();
            return `  <url>\n    <loc>${loc}</loc>\n    <news:news>\n      <news:publication>\n        <news:name>SwapNews</news:name>\n        <news:language>id</news:language>\n      </news:publication>\n      <news:publication_date>${publicationDate}</news:publication_date>\n      <news:title>${title}</news:title>\n      <news:keywords>${keywords}</news:keywords>\n    </news:news>\n  </url>`;
        })
        .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${urls}\n</urlset>`;

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=300",
        },
    });
}
