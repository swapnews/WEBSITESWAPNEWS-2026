import type { Metadata, Viewport } from "next";
import "./globals.css";
import "../styles/news-portal.css";
import "../styles/editorial-feeds.css";
import "../styles/homepage-control.css";
import "../styles/channels.css";
import "../styles/search-discovery.css";
import "../styles/editorial-workflow.css";
import "../styles/editorial-quality.css";
import "../styles/dashboard-mint.css";
import "../styles/merch-admin.css";
import "../styles/homepage-2026.css";
import "../styles/article-2026.css";
import "../styles/member.css";
import "../styles/optimization.css";
import "../styles/editor.css";
import "../styles/editor-2026.css";
import "../styles/psychology-showcase.css";
import "../styles/footer-pages.css";
import "../styles/footer-wide.css";
import "../styles/topic-feed.css";
import "../styles/bali-live.css";
import "../styles/bali-integration.css";
import "../styles/media-seo.css";
import "../styles/public-pages-2026.css";
import "../styles/reels-fix.css";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://swapnews.co.id"),
  title: {
    default: "SwapNews — Bukan Berita Biasa",
    template: "%s | SwapNews",
  },
  description: "Portal berita Super PWA: kabar terbaru, trending, dan perspektif baru setiap hari.",
  openGraph: {
    type: "website",
    siteName: "SwapNews",
    locale: "id_ID",
    title: "SwapNews — Bukan Berita Biasa",
    description: "Kabar terbaru, trending, dan perspektif baru setiap hari.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF8F0" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1410" },
  ],
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  name: "SwapNews",
  url: "https://swapnews.co.id",
  logo: "https://swapnews.co.id/swapnews-logo.png",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
