import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "../styles/news-portal.css";
import "../styles/editorial-feeds.css";
import "../styles/homepage-control.css";
import "../styles/channels.css";
import "../styles/search-discovery.css";
import "../styles/homepage-2026.css";
import "../styles/article-2026.css";
import "../styles/optimization.css";
import "../styles/psychology-showcase.css";
import "../styles/footer-pages.css";
import "../styles/footer-wide.css";
import "../styles/topic-feed.css";
import "../styles/bali-live.css";
import "../styles/bali-integration.css";
import "../styles/public-pages-2026.css";
import "../styles/reels-fix.css";
import { SiteFooter } from "@/components/site-footer";

import { buildSiteMetadata } from "@/lib/seo/metadata";

// Self-hosted melalui next/font — tanpa request eksternal, tanpa layout shift.
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = buildSiteMetadata();

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

// Skrip inline yang dijalankan sebelum paint untuk mencegah kedip
// terang→gelap pada halaman ISR yang di-cache tanpa cookie.
const themeScript = `(function(){try{var t=localStorage.getItem("swapnews-theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme:dark)").matches;document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`h-full antialiased ${outfit.variable} ${jakarta.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
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
