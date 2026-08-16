import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Clock3, Home, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PublicPageHeader } from "@/components/public-page-header";
import { extractFirstImageFromHtml, resolveSeoImage } from "@/lib/seo/metadata";
export const dynamic = "force-dynamic";
type RecordPage = { title: string; slug: string; excerpt: string | null; content: string; seo_title: string | null; meta_description: string | null; tags: string[] | null; published_at: string | null; updated_at: string; featured_media: { secure_url: string; alt_text: string } | { secure_url: string; alt_text: string }[] | null };
const pageLinks = [["About Us", "about-us"], ["Karir", "karir"], ["Pasang Iklan", "pasang-iklan"], ["Bantuan", "bantuan"], ["Kebijakan Privasi", "kebijakan-privasi"], ["Syarat & Ketentuan", "syarat-dan-ketentuan"], ["Pedoman Siber", "pedoman-siber"], ["Panduan Komunitas", "panduan-komunitas"], ["Disclaimer", "disclaimer"]];
const legal = new Set(["kebijakan-privasi", "syarat-dan-ketentuan", "pedoman-siber", "panduan-komunitas", "disclaimer"]);
async function loadPage(slug: string): Promise<RecordPage | null> { const supabase = await createClient(); const { data } = await supabase.from("pages").select("title,slug,excerpt,content,seo_title,meta_description,tags,published_at,updated_at,featured_media:media_assets(secure_url,alt_text)").eq("slug", slug).eq("status", "published").maybeSingle(); return data as RecordPage | null }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const page = await loadPage((await params).slug);
    if (!page) return { title: "Page tidak ditemukan" };
    const title = page.seo_title || page.title;
    const description = page.meta_description || page.excerpt || "Informasi resmi SwapNews.";
    const media = Array.isArray(page.featured_media) ? page.featured_media[0] : page.featured_media;
    const imageRaw = media?.secure_url || "/swapnews-logo.png";
    const imageUrl = imageRaw.startsWith("data:")
        ? (extractFirstImageFromHtml(page.content) ?? resolveSeoImage(null))
        : resolveSeoImage(imageRaw);
    const canonical = `https://swapnews.co.id/page/${page.slug}`;
    return {
        title,
        description,
        alternates: { canonical },
        keywords: page.tags ?? undefined,
        robots: { index: true, follow: true },
        openGraph: {
            type: "article",
            title,
            description,
            url: canonical,
            siteName: "SwapNews",
            locale: "id_ID",
            publishedTime: page.published_at ?? undefined,
            modifiedTime: page.updated_at,
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: media?.alt_text || title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [imageUrl],
        },
    };
}
export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) { const page = await loadPage((await params).slug); if (!page) notFound(); const media = Array.isArray(page.featured_media) ? page.featured_media[0] : page.featured_media; const plain = page.content.replace(/<[^>]+>/g, " ").trim(); const reading = Math.max(1, Math.ceil(plain.split(/\s+/).length / 220)); const headings = [...page.content.matchAll(/<h([23])[^>]*>(.*?)<\/h\1>/gi)].map((match, index) => ({ level: match[1], text: match[2].replace(/<[^>]+>/g, ""), id: `bagian-${index + 1}` })); let headingIndex = 0; const content = page.content.replace(/<h([23])([^>]*)>/gi, match => match.replace(">", ` id="bagian-${++headingIndex}">`)); const related = pageLinks.filter(([, slug]) => slug !== page.slug).slice(0, 4); const jsonLd = { "@context": "https://schema.org", "@type": legal.has(page.slug) ? "WebPage" : "AboutPage", name: page.title, description: page.meta_description || page.excerpt, url: `https://swapnews.co.id/page/${page.slug}`, datePublished: page.published_at, dateModified: page.updated_at, isPartOf: { "@type": "WebSite", name: "SwapNews", url: "https://swapnews.co.id" }, publisher: { "@type": "NewsMediaOrganization", name: "SwapNews", logo: { "@type": "ImageObject", url: "https://swapnews.co.id/swapnews-logo.png" } } }; return <><PublicPageHeader slug={page.slug} /><main className={`public-page-shell pp-${legal.has(page.slug) ? "legal" : "company"}`}><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><article className="public-page"><nav className="pp-breadcrumb" aria-label="Breadcrumb"><Link href="/"><Home /> Beranda</Link><span>/</span><b>{page.title}</b></nav><header className="public-page-intro"><div><span>{legal.has(page.slug) ? "TRUST • POLICY • TRANSPARENCY" : "SWAPNEWS • INFORMATION CENTER"}</span><h1>{page.title}</h1>{page.excerpt && <p>{page.excerpt}</p>}<small><Clock3 /> {reading} menit baca <i /> Diperbarui {new Date(page.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</small></div><ShieldCheck /></header>{media?.secure_url && <figure className="public-page-hero"><Image src={media.secure_url} alt={media.alt_text || page.title} fill sizes="(max-width:900px) 100vw,1200px" priority /><figcaption>{media.alt_text || page.title}</figcaption></figure>}<div className="pp-reading-layout">{headings.length > 0 && <aside className="pp-toc"><span>DALAM HALAMAN INI</span>{headings.map(h => <a className={`level-${h.level}`} href={`#${h.id}`} key={h.id}>{h.text}</a>)}<div><Mail /><b>Butuh bantuan?</b><a href="mailto:redaksi@swapnews.co.id">Hubungi Redaksi</a></div></aside>}<div className="public-page-body" dangerouslySetInnerHTML={{ __html: content }} /></div>{page.tags?.length ? <footer className="pp-tags">{page.tags.map(tag => <span key={tag}>#{tag}</span>)}</footer> : null}<section className="pp-related"><header><span>INFORMASI LAINNYA</span><h2>Jelajahi SwapNews</h2></header><div>{related.map(([label, slug]) => <Link href={`/page/${slug}`} key={slug}><b>{label}</b><ArrowUpRight /></Link>)}</div></section></article></main></> }
