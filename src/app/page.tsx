import type { Metadata } from "next";
import NewsPortal from "@/components/news-portal";
import { getPublicHomeData } from "@/lib/public-articles";
import { buildSocialMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildSocialMetadata({
  title: "SwapNews — Suara Wawasan Aktual Publik",
  description: "Portal berita terbaru, trending, dan perspektif baru setiap hari dari SwapNews.",
  canonicalPath: "/",
  ogImage: "/og-default.jpg",
});

export default async function Home() {
  const data = await getPublicHomeData();
  return <NewsPortal data={data} />;
}
