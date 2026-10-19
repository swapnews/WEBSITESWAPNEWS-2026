import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { queryPublishedSitemapArticles } from "@/lib/public-articles";

export const dynamic = "force-dynamic";

/**
 * Endpoint IndexNow untuk submit sitemap/URL artikel secara instan ke Bing, Yandex, Naver, Seznam.
 */
export async function POST(request: NextRequest) {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const body = (await request.json().catch(() => ({}))) as { urlList?: string[] };
        const host = "swapnews.co.id";
        const key = "swapnews2026indexnow";
        const keyLocation = `https://${host}/indexnow-key.txt`;

        let urlList = body.urlList;
        if (!urlList || !urlList.length) {
            const articles = await queryPublishedSitemapArticles();
            urlList = [
                `https://${host}`,
                ...articles.slice(0, 50).map((a) => `https://${host}/${a.slug}`),
            ];
        }

        const payload = {
            host,
            key,
            keyLocation,
            urlList,
        };

        // Kirim ke IndexNow endpoint resmi Bing/IndexNow
        const response = await fetch("https://api.indexnow.org/indexnow", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify(payload),
        });

        return NextResponse.json({
            success: true,
            submittedCount: urlList.length,
            indexNowStatus: response.status,
            message: `Berhasil mengirim ${urlList.length} URL ke protokol IndexNow (Bing/Yandex/Seznam).`,
        });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Gagal submit IndexNow" },
            { status: 500 }
        );
    }
}
