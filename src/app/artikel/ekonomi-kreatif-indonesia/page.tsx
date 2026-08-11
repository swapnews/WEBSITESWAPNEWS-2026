import type { Metadata } from "next";
import ArticlePage from "./article-client";

export const metadata: Metadata = {
    title: "Babak baru ekonomi kreatif Indonesia dimulai dari kota-kota kecil",
    description: "Talenta lokal, teknologi, dan akses pasar bertemu dalam gelombang pertumbuhan baru ekonomi kreatif nasional.",
    openGraph: {
        type: "article",
        title: "Babak baru ekonomi kreatif Indonesia dimulai dari kota-kota kecil",
        description: "Talenta lokal, teknologi, dan akses pasar bertemu dalam gelombang pertumbuhan baru.",
        publishedTime: "2026-08-10T09:30:00+07:00",
        section: "Bisnis",
    },
};

const newsArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: "Babak baru ekonomi kreatif Indonesia dimulai dari kota-kota kecil",
    description: "Talenta lokal, teknologi, dan akses pasar bertemu dalam gelombang pertumbuhan baru.",
    datePublished: "2026-08-10T09:30:00+07:00",
    dateModified: "2026-08-10T09:30:00+07:00",
    author: { "@type": "Person", name: "Nadia Prameswari" },
    publisher: {
        "@type": "NewsMediaOrganization",
        name: "SwapNews",
        logo: { "@type": "ImageObject", url: "https://swapnews.co.id/swapnews-logo.png" },
    },
    articleSection: "Bisnis",
    inLanguage: "id-ID",
};

export default function Page() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleJsonLd) }}
            />
            <ArticlePage />
        </>
    );
}
