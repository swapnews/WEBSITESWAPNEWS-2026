import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { transformOgImage } from "@/lib/seo/metadata";

function getServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: rawId } = await params;
    const cleanId = rawId.replace(/\.(jpg|jpeg|png|webp)$/i, "");
    const supabase = getServiceClient();

    if (!supabase) {
        return NextResponse.redirect("https://swapnews.co.id/og-default.jpg", 302);
    }

    try {
        let imageUrl: string | null = null;

        // 1. Coba cari di media_assets berdasarkan ID jika valid UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

        if (isUuid) {
            const { data: media } = await supabase
                .from("media_assets")
                .select("secure_url")
                .eq("id", cleanId)
                .maybeSingle();

            if (media?.secure_url) {
                imageUrl = media.secure_url;
            }
        }

        // 2. Cari di articles berdasarkan slug (atau ID jika UUID)
        if (!imageUrl) {
            let articleQuery = supabase
                .from("articles")
                .select("featured_media_id, content");

            if (isUuid) {
                articleQuery = articleQuery.or(`slug.eq.${cleanId},id.eq.${cleanId}`);
            } else {
                articleQuery = articleQuery.eq("slug", cleanId);
            }

            const { data: article } = await articleQuery.maybeSingle();

            if (article?.featured_media_id) {
                const { data: articleMedia } = await supabase
                    .from("media_assets")
                    .select("secure_url")
                    .eq("id", article.featured_media_id)
                    .maybeSingle();
                if (articleMedia?.secure_url) {
                    imageUrl = articleMedia.secure_url;
                }
            }

            if (!imageUrl && article?.content) {
                const match = article.content.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (match?.[1]) {
                    imageUrl = match[1];
                }
            }
        }

        // 3. Jika berupa data URI (base64) -> Konversi & kompresi ke 1200x630 JPEG via Sharp (<100KB)
        if (imageUrl && imageUrl.startsWith("data:")) {
            const commaIndex = imageUrl.indexOf(",");
            if (commaIndex !== -1) {
                const base64Data = imageUrl.slice(commaIndex + 1);
                const rawBuffer = Buffer.from(base64Data, "base64");

                let outputBuffer = rawBuffer;
                try {
                    outputBuffer = await sharp(rawBuffer)
                        .resize(1200, 630, { fit: "cover", position: "center" })
                        .jpeg({ quality: 80, progressive: true })
                        .toBuffer();
                } catch (sharpErr) {
                    console.error("Sharp resize error, using raw buffer:", sharpErr);
                }

                return new Response(new Uint8Array(outputBuffer), {
                    status: 200,
                    headers: {
                        "Content-Type": "image/jpeg",
                        "Content-Length": String(outputBuffer.length),
                        "Cache-Control": "public, max-age=31536000, immutable",
                        "Access-Control-Allow-Origin": "*",
                    },
                });
            }
        }

        // 4. Jika berupa Cloudinary atau URL HTTP publik -> Redirect ke versi JPEG teroptimasi
        if (imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
            const optimized = transformOgImage(imageUrl);
            return NextResponse.redirect(optimized, 302);
        }
    } catch (err) {
        console.error("OG Image Route Error:", err);
    }

    return NextResponse.redirect("https://swapnews.co.id/og-default.jpg", 302);
}
