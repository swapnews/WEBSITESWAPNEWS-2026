import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock3, Eye, Flame } from "lucide-react";
import { articleImage, formatRelativeDate, getPublicChannelData } from "@/lib/public-articles";
import { buildSocialMetadata, extractFirstImageFromHtml, resolveSeoImage } from "@/lib/seo/metadata";
import { PublicSiteHeader } from "@/components/public-site-header";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
const variant = (slug: string) => slug.includes("game") ? "games" : slug.includes("sport") || slug.includes("bola") ? "sports" : slug.includes("bali") ? "bali" : slug.includes("musik") ? "music" : slug.includes("psikologi") ? "psychology" : "default";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params; const data = await getPublicChannelData(slug);
    if (!data) return { title: "Kanal tidak ditemukan" };
    const description = data.category.description || `Berita terbaru ${data.category.name}, pilihan redaksi dan informasi terpercaya dari SwapNews.`;
    const lead = data.articles[0];
    const leadImageRaw = lead ? articleImage(lead) : "/swapnews-logo.png";
    const leadImage = leadImageRaw.startsWith("data:")
        ? (extractFirstImageFromHtml(lead?.content) ?? resolveSeoImage(null))
        : resolveSeoImage(leadImageRaw);
    const canonicalPath = `/kanal/${data.category.slug}`;
    return {
        title: `${data.category.name} — SwapNews`,
        description,
        alternates: { canonical: canonicalPath },
        ...buildSocialMetadata({
            title: `${data.category.name} — SwapNews`,
            description,
            canonicalPath,
            ogImage: leadImage,
        }),
    };
}

export default async function ChannelPage({ params }: Props) {
    const { slug } = await params; const data = await getPublicChannelData(slug); if (!data) notFound();
    const lead = data.articles[0]; const supporting = data.articles.slice(1, 5); const latest = data.articles.slice(5);
    return <div className={`channel-page channel-${variant(data.category.slug)} news-app`}>
        <PublicSiteHeader categoryName={data.category.name} tickerText={data.articles.slice(0, 6).map((item) => item.title).join("   •   ")} />
        <main>
            <section className="channel-intro"><span>SWAPNEWS CHANNEL</span><h1>{data.category.name}</h1><p>{data.category.description || `Berita, analisis, dan cerita terbaru seputar ${data.category.name}.`}</p><div>{data.children.map(child => <Link href={`/kanal/${child.slug}`} key={child.id}>{child.name}</Link>)}</div></section>
            {lead ? <section className="channel-hero"><Link className="channel-lead" href={`/${lead.slug}`}><Image src={articleImage(lead)} alt={lead.featured_media?.alt_text || lead.title} fill sizes="(max-width:800px) 100vw, 700px" priority /><span className="news-image-shade" /><div><small>{lead.category_name} • UTAMA</small><h2>{lead.title}</h2><p>{lead.excerpt}</p><em><Clock3 /> {lead.reading_time_minutes} menit</em></div></Link><div className="channel-support">{supporting.map((item, index) => <Link href={`/${item.slug}`} key={item.id}><Image src={articleImage(item, index + 1)} alt={item.featured_media?.alt_text || item.title} width={150} height={105} /><div><small>{item.category_name}</small><h3>{item.title}</h3><span>{formatRelativeDate(item.published_at)}</span></div></Link>)}</div></section> : <section className="channel-empty"><h2>Belum ada artikel di kanal ini</h2><p>Redaksi sedang menyiapkan berita terbaik.</p></section>}
            {data.trending.length > 0 && <section className="channel-trending"><header><Flame /><div><span>PALING DIBACA</span><h2>Trending {data.category.name}</h2></div></header><div>{data.trending.map((item, index) => <Link href={`/${item.slug}`} key={item.id}><b>{String(index + 1).padStart(2, "0")}</b><h3>{item.title}</h3><span><Eye /> {item.view_count.toLocaleString("id-ID")}</span></Link>)}</div></section>}
            {latest.length > 0 && <section className="channel-latest"><header><div><span>UPDATE TERBARU</span><h2>Semua Berita</h2></div><ArrowRight /></header><div>{latest.map((item, index) => <Link href={`/${item.slug}`} key={item.id}><Image src={articleImage(item, index + 2)} alt={item.featured_media?.alt_text || item.title} width={230} height={150} /><div><small>{item.category_name}</small><h3>{item.title}</h3><p>{item.excerpt}</p><span>{formatRelativeDate(item.published_at)} • {item.reading_time_minutes} menit</span></div></Link>)}</div></section>}
        </main>
    </div>;
}
