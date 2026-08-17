import { type Metadata } from "next";

/** Konversi path relatif menjadi URL absolut HTTPS dengan base site */
export function absoluteUrl(path = ""): string {
    const base = "https://swapnews.co.id";
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

/** Optimasi URL Cloudinary untuk OG: paksa 1200x630, kualitas auto, format auto */
export function transformOgImage(url: string): string {
    if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url;
    if (/\/upload\/(w_|c_fill|f_auto|q_auto)/.test(url)) return url; // sudah ada transformasi
    return url.replace("/image/upload/", "/image/upload/w_1200,h_630,c_fill,q_auto,f_auto/");
}

/** Resolve OG image dari artikel/media/landing page.
 *  Fallback memakai og-default.jpg (1200x630, <100KB) karena WhatsApp
 *  menolak gambar >300KB — swapnews-logo.png (812KB) menyebabkan preview gagal. */
export function resolveSeoImage(
    imageUrl?: string | null | { secure_url?: string },
    fallback = "/og-default.jpg"
): string {
    let url: string | undefined;
    if (typeof imageUrl === "string") {
        url = imageUrl.startsWith("http") ? imageUrl : `/${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
    } else if (imageUrl && typeof imageUrl === "object" && "secure_url" in imageUrl) {
        url = typeof imageUrl.secure_url === "string" ? imageUrl.secure_url : undefined;
    }
    // Tolak data URI dan URL non-http (scraper WhatsApp/FB tidak bisa memuatnya)
    if (!url || !isValidHttpUrl(url)) {
        return absoluteUrl(fallback);
    }
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
}): Metadata {
    const { title, description, canonicalPath, ogImage, type = "website", publishedAt, modifiedAt } = options;
    const imageUrl = resolveSeoImage(ogImage);
    const isDefault = imageUrl.endsWith("/og-default.jpg");
    return {
        openGraph: {
            type: publishedAt ? "article" : type,
            title,
            description,
            url: absoluteUrl(canonicalPath),
            siteName: "SwapNews",
            locale: "id_ID",
            ...(publishedAt && { publishedTime: publishedAt }),
            ...(modifiedAt && { modifiedTime: modifiedAt }),
            images: isDefault
                ? [{ url: imageUrl, width: 1200, height: 630, alt: title }]
                : [{ url: imageUrl, alt: title }],
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
    return {
        metadataBase: new URL("https://swapnews.co.id"),
        title: { default: "SwapNews — Suara Wawasan Aktual Publik", template: "%s | SwapNews" },
        description: "Portal berita Super PWA: kabar terbaru, trending, dan perspektif baru setiap hari.",
        icons: {
            icon: "/favicon.svg",
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
            images: [{ url: "https://swapnews.co.id/og-default.jpg", width: 1200, height: 630, alt: "SwapNews Logo" }],
        },
        twitter: {
            card: "summary_large_image",
            title: "SwapNews — Suara Wawasan Aktual Publik",
            description: "Portal berita Super PWA: kabar terbaru, trending, dan perspektif baru setiap hari.",
            images: ["https://swapnews.co.id/og-default.jpg"],
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
