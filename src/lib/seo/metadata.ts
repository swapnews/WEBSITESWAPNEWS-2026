import { type Metadata } from "next";

/** Konversi path relatif menjadi URL absolut HTTPS dengan base site */
export function absoluteUrl(path = ""): string {
    const base = "https://swapnews.co.id";
    return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Resolve OG image dari artikel/media/landing page */
export function resolveSeoImage(
    imageUrl?: string | null | { secure_url?: string },
    fallback = "/swapnews-logo.png"
): string {
    let url: string | undefined;
    if (typeof imageUrl === "string") {
        url = imageUrl.startsWith("http") ? imageUrl : `/${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
    } else if (imageUrl && typeof imageUrl === "object" && "secure_url" in imageUrl) {
        url = typeof imageUrl.secure_url === "string" ? imageUrl.secure_url : undefined;
    }
    if (!url || !url.startsWith("http")) {
        url = absoluteUrl(fallback);
    }
    return url;
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
            images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
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
            images: [{ url: "https://swapnews.co.id/swapnews-logo.png", width: 800, height: 600, alt: "SwapNews Logo" }],
        },
        twitter: {
            card: "summary_large_image",
            title: "SwapNews — Suara Wawasan Aktual Publik",
            description: "Portal berita Super PWA: kabar terbaru, trending, dan perspektif baru setiap hari.",
            images: ["https://swapnews.co.id/swapnews-logo.png"],
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
