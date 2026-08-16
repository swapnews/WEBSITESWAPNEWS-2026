import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/dashboard", "/api/", "/panelswap", "/login", "/auth/", "/member", "/checkout", "/profile"],
            },
            {
                userAgent: ["GPTBot", "Google-Extended", "ClaudeBot", "PerplexityBot", "Applebot-Extended", "CCBot"],
                disallow: ["/dashboard", "/api/", "/panelswap", "/login", "/auth/", "/member", "/checkout", "/profile"],
            },
        ],
        sitemap: "https://swapnews.co.id/sitemap.xml",
        host: "https://swapnews.co.id",
    };
}
