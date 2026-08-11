import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "SwapNews — Bukan Berita Biasa",
        short_name: "SwapNews",
        description: "Portal berita Super PWA: kabar terbaru dan perspektif baru setiap hari.",
        start_url: "/",
        display: "standalone",
        background_color: "#FFF8F0",
        theme_color: "#F97316",
        lang: "id",
        icons: [
            { src: "/swapnews-logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
        ],
    };
}
