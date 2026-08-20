import { type Metadata } from "next";

/** Konversi path relatif menjadi URL absolut HTTPS dengan base site */
export function absoluteUrl(path = ""): string {
    const base = "https://swapnews.co.id";
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Ambil gambar pertama yang valid (http/https, bukan data URI) dari HTML konten */
export function extractFirstImageFromHtml(html?: string | null): string | null {
    if (!html) return null;
    const srcs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
    for (const src of srcs) {
        if (src.startsWith("http://") || src.startsWith("https://")) return src;
    }
    return null;
}

function isValidHttpUrl(value: string): boolean {
    return value.startsWith("http://") || value.startsWith("https://");
}

/** Optimasi URL Cloudinary untuk OG: paksa 1200x630, kualitas auto, format JPEG.
 *  Dipaksa JPEG (.jpg) karena WhatsApp/Facebook scraper menolak format .webp
 *  dan memerlukan ekstensi file berakhiran .jpg serta ukuran <300KB. */
export function transformOgImage(url: string): string {
    const marker = "/image/upload/";
    if (!url.includes("res.cloudinary.com") || !url.includes(marker)) return url;
    const markerIndex = url.indexOf(marker);
    const base = url.slice(0, markerIndex + marker.length);
    const tail = url.slice(markerIndex + marker.length);
    const ogTransform = "w_1200,h_630,c_fill,q_auto,f_jpg";
    const segments = tail.split("/").filter(Boolean);
    // Potong segmen transformasi lama jika ada
    const isTransformSegment = (seg: string) => /^[a-z]+_/.test(seg) && !seg.includes(".");
    const hasExistingTransform = segments.length > 0 && isTransformSegment(segments[0]);
    const cleanSegments = hasExistingTransform ? segments.slice(1) : segments;
    const joined = cleanSegments.join("/");
    // Ganti ekstensi file (misal .webp/.png) menjadi .jpg agar WhatsApp parser mengenalinya langsung
    const withJpgExt = joined.replace(/\.[a-zA-Z0-9]+$/, ".jpg");
    return `${base}${ogTransform}/${withJpgExt}`;
}

/** Resolve OG image dari artikel/media/landing page.
 *  Fallback memakai og-default.jpg (1200x630, <100KB) karena WhatsApp
 *  menolak gambar >300KB atau gambar tanpa URL absolut valid. */
export function resolveSeoImage(
    imageUrl?: string | null | { secure_url?: string },
    fallback = "/og-default.jpg"
): string {
    let url: string | undefined;
    if (typeof imageUrl === "string") {
        // Tolak data URI langsung
        if (imageUrl.startsWith("data:")) {
            return absoluteUrl(fallback);
        }
        url = imageUrl.startsWith("http") ? imageUrl : absoluteUrl(imageUrl);
    } else if (imageUrl && typeof imageUrl === "object" && "secure_url" in imageUrl) {
        url = typeof imageUrl.secure_url === "string" ? imageUrl.secure_url : undefined;
    }
    // Tolak URL non-http (scraper WhatsApp/FB tidak bisa memuatnya)
    if (!url || !isValidHttpUrl(url)) {
        return absoluteUrl(fallback);
    }
    // Transformasi gambar Cloudinary ke format OG optimal
    return transformOgImage(url);
}

/** Build default social metadata (OG + Twitter) */
export function buildSocialMetadata(options: {
    title: string;
    description: string;
    canonicalPath: string;
    ogImage?: string | null | { secure_url?: string };
    type?: "website" | "article";
    publishedAt?: string | null;
    modifiedAt?: string;
    authorName?: string;
    section?: string;
    tags?: string[];
}): Metadata {
    const { title, description, canonicalPath, ogImage, type = "website", publishedAt, modifiedAt, authorName, section, tags } = options;
    const imageUrl = resolveSeoImage(ogImage);
    const absCanonical = absoluteUrl(canonicalPath);

    return {
        metadataBase: new URL("https://swapnews.co.id"),
        alternates: { canonical: absCanonical },
        openGraph: {
            type: publishedAt ? "article" : type,
            title,
            description,
            url: absCanonical,
            siteName: "SwapNews",
            locale: "id_ID",
            ...(publishedAt && { publishedTime: publishedAt }),
            ...(modifiedAt && { modifiedTime: modifiedAt }),
            ...(authorName && { authors: [authorName] }),
            ...(section && { section }),
            ...(tags && tags.length > 0 && { tags }),
            images: [
                {
                    url: imageUrl,
                    secureUrl: imageUrl,
                    width: 1200,
                    height: 630,
                    type: "image/jpeg",
                    alt: title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [imageUrl],
        },
    };
}

/** Build global site metadata (layout level) */
export function buildSiteMetadata(): Metadata {
    const defaultImage = "https://swapnews.co.id/og-default.jpg";
    return {
        metadataBase: new URL("https://swapnews.co.id"),
        title: { default: "SwapNews — Suara Wawasan Aktual Publik", template: "%s | SwapNews" },
        description: "Portal berita Super PWA: kabar terbaru, trending, dan perspektif baru setiap hari.",
        icons: {
            icon: [
                { url: "/favicon.ico", sizes: "any" },
                { url: "/favicon.svg", type: "image/svg+xml" },
            ],
            shortcut: "/favicon.ico",
            apple: "/apple-touch-icon.png",
        },
        manifest: "/manifest.webmanifest",
        openGraph: {
            type: "website",
            siteName: "SwapNews",
            locale: "id_ID",
            title: "SwapNews — Suara Wawasan Aktual Publik",
            description: "Portal berita Super PWA: kabar terbaru, trending, dan perspektif baru setiap hari.",
            url: "https://swapnews.co.id",
            images: [
                {
                    url: defaultImage,
                    secureUrl: defaultImage,
                    width: 1200,
                    height: 630,
                    type: "image/jpeg",
                    alt: "SwapNews Logo",
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: "SwapNews — Suara Wawasan Aktual Publik",
            description: "Portal berita Super PWA: kabar terbaru, trending, dan perspektif baru setiap hari.",
            images: [defaultImage],
        },
    };
}

/** Get canonical header-only metadata (no social) */
export function getCanonicalMetadata(canonicalPath: string, robots?: { index: boolean; follow: boolean }): Metadata {
    return {
        alternates: { canonical: absoluteUrl(canonicalPath) },
        robots: robots ?? { index: true, follow: true },
    };
}
