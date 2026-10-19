import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "../styles/ads-management.css";

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
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF8F0" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1410" },
  ],
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "NewsMediaOrganization",
      "@id": "https://swapnews.co.id/#organization",
      name: "SwapNews",
      alternateName: "SwapNews Indonesia",
      url: "https://swapnews.co.id",
      logo: {
        "@type": "ImageObject",
        "@id": "https://swapnews.co.id/#logo",
        url: "https://swapnews.co.id/swapnews-logo.png",
        caption: "SwapNews — Suara Wawasan Aktual Publik",
      },
      image: "https://swapnews.co.id/swapnews-logo.png",
      sameAs: [
        "https://twitter.com/swapnewsid",
        "https://facebook.com/swapnewsid",
        "https://instagram.com/swapnews.co.id",
      ],
      publishingPrinciples: "https://swapnews.co.id/page/kebijakan-redaksi",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Jakarta",
        addressRegion: "DKI Jakarta",
        addressCountry: "ID",
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "editorial",
        email: "redaksi@swapnews.co.id",
        availableLanguage: ["Indonesian", "English"],
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://swapnews.co.id/#website",
      url: "https://swapnews.co.id",
      name: "SwapNews",
      description: "Portal berita Super PWA: kabar terbaru, trending, dan perspektif baru setiap hari.",
      publisher: {
        "@id": "https://swapnews.co.id/#organization",
      },
      inLanguage: "id-ID",
    },
  ],
};

// Skrip inline yang dijalankan sebelum paint untuk mencegah kedip
// terang→gelap pada halaman ISR yang di-cache tanpa cookie.
const themeScript = `(function(){try{var t=localStorage.getItem("swapnews-theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme:dark)").matches;document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      prefix="og: https://ogp.me/ns#"
      className={`h-full antialiased ${outfit.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
