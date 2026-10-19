import type { Metadata } from "next";
import NewsPortal from "@/components/news-portal";
import { getPublicHomeData } from "@/lib/public-articles";
import { buildSocialMetadata } from "@/lib/seo/metadata";

// ISR: HTML disajikan dari CDN cache, diregenerasi berkala 1 jam (3600s).
// Berita baru langsung tayang on-demand saat dipublish via revalidatePath("/").
export const revalidate = 3600;

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
