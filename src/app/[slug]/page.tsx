import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, Eye } from "lucide-react";

import ArticleComments from "@/components/article-comments";
import ArticleCopyAttribution from "@/components/article-copy-attribution";
import ArticleExperience from "@/components/article-experience";
import { DEFAULT_INSERTION_SETTINGS, sanitizeAdHtml } from "@/lib/article-insertions";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import {
    articleImage,
    formatPublishedDate,
    getFallbackArticles,
    getPublicArticleBySlug,
    getRelatedPublicArticles,
    type PublicArticle,
} from "@/lib/public-articles";
import ArticleActions from "@/app/artikel/[slug]/article-actions";
import { extractFirstImageFromHtml, resolveSeoImage } from "@/lib/seo/metadata";
import { PublicSiteHeader } from "@/components/public-site-header";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function resolveArticle(slug: string) {
    const article = await getPublicArticleBySlug(slug);
    return article ?? getFallbackArticles().find((item) => item.slug === slug) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const article = await resolveArticle(slug);
    if (!article) return { title: "Artikel tidak ditemukan" };
    const imageRaw = articleImage(article);
    // Featured media bisa berupa data URI (artefak import WP) → ambil gambar valid dari konten
    const imageUrl = imageRaw.startsWith("data:")
        ? (extractFirstImageFromHtml(article.content) ?? resolveSeoImage(null))
        : resolveSeoImage(imageRaw);

    const seoTitle = article.seo_title || article.title;
    const seoDescription = article.meta_description || article.excerpt;
    return {
        title: seoTitle,
        description: seoDescription,
        keywords: article.tags,
        alternates: { canonical: `https://swapnews.co.id/${article.slug}` },
        openGraph: {
            type: "article",
            siteName: "SwapNews",
            locale: "id_ID",
            title: seoTitle,
            description: seoDescription,
            url: `https://swapnews.co.id/${article.slug}`,
            publishedTime: article.published_at,
            modifiedTime: article.updated_at,
            authors: [article.author_name],
            section: article.category_name,
            tags: article.tags,
            images: [
                {
                    url: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: article.featured_media?.alt_text || article.title,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: seoTitle,
            description: seoDescription,
            images: [imageUrl],
        },
    };
}

function jsonLd(article: PublicArticle) {
    return {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: article.title,
        description: article.meta_description || article.excerpt,
        keywords: article.tags.join(", "),
        image: [articleImage(article)],
        datePublished: article.published_at,
        dateModified: article.updated_at,
        author: { "@type": "Person", name: article.author_name },
        publisher: { "@type": "NewsMediaOrganization", name: "SwapNews", logo: { "@type": "ImageObject", url: "https://swapnews.co.id/swapnews-logo.png" } },
        articleSection: article.category_name,
        isAccessibleForFree: !article.is_exclusive,
        mainEntityOfPage: `https://swapnews.co.id/${article.slug}`,
        inLanguage: "id-ID",
    };
}

function splitContent(content: string) {
    if (isHtml(content)) {
        const blocks = content.match(/<(?:p|h[1-6]|ul|ol|blockquote|figure|table)[\s\S]*?<\/(?:p|h[1-6]|ul|ol|blockquote|figure|table)>/gi);
        return blocks?.length ? blocks : [content];
    }
    return content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

function isHtml(value: string) {
    return /<\/?(p|h[1-6]|ul|ol|li|blockquote|figure|img|hr|strong|em|a|code|table)[\s>]/i.test(value);
}

export default async function ArticlePage({ params }: Props) {
    const { slug } = await params;
    const article = await resolveArticle(slug);
    if (!article) notFound();
    const related = article.id.startsWith("demo-")
        ? getFallbackArticles().filter((item) => item.id !== article.id).slice(0, 3)
        : await getRelatedPublicArticles(article, 3);
    const profile = article.is_exclusive ? await getCurrentProfile() : null;
    const locked = article.is_exclusive && !profile?.is_member;
    const supabase = await createClient();
    const [{ data: insertionData }, { data: selectedProduct }] = await Promise.all([
        supabase.from("article_insertion_settings").select("read_also_enabled,read_also_paragraph,read_also_label,product_enabled,product_paragraph,product_id,ad_enabled,ad_paragraph,ad_html,copy_message").eq("id", true).maybeSingle(),
        supabase.from("products").select("id,slug,name,description,price_idr,price_points,stock,image_url").eq("is_active", true).gt("stock", 0).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const insertions = { ...DEFAULT_INSERTION_SETTINGS, ...(insertionData ?? {}) };
    let product = selectedProduct;
    if (insertions.product_id) {
        const { data } = await supabase.from("products").select("id,slug,name,description,price_idr,price_points,stock,image_url").eq("id", insertions.product_id).eq("is_active", true).maybeSingle();
        product = data ?? product;
    }
    const contentBlocks = splitContent(article.content);
    const contentIsHtml = isHtml(article.content);
    const visibleBlocks = locked ? contentBlocks.slice(0, 2) : contentBlocks;
    const headingLabels = visibleBlocks.map(block => block.match(/<h[2-4][^>]*>(.*?)<\/h[2-4]>/i)?.[1]?.replace(/<[^>]+>/g, "")).filter((value): value is string => Boolean(value));
    const readingMinutes = Math.max(1, Math.ceil(article.content.replace(/<[^>]+>/g, " ").split(/\s+/).length / 220));
    const finishAt = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(new Date(article.published_at).getTime() + readingMinutes * 60000));
    const tickerText = [article.title, ...related.map((item) => item.title)].join("   •   ");

    return (
        <div className="public-article-shell article-2026-shell news-app">
            <ArticleExperience slug={article.slug} headings={headingLabels} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(article)) }} />
            <PublicSiteHeader backHref="/" categoryName={article.category_name} tickerText={tickerText} />

            <main className="public-article-layout">
                <article className="public-article">
                    <nav className="public-breadcrumb" aria-label="Breadcrumb"><Link href="/">Beranda</Link><i>/</i><span>{article.category_name}</span></nav>
                    <div className="public-article-kicker"><span>{article.category_name}</span><b>{readingMinutes} MENIT · SELESAI ± {finishAt}</b></div>
                    <h1>{article.title}</h1>
                    <p className="public-article-lead">{article.excerpt}</p>
                    <div className="public-byline">
                        <span className="public-author-avatar">{article.author_name.slice(0, 2).toUpperCase()}</span>
                        <div><b>{article.author_name}</b><small>{formatPublishedDate(article.published_at)}</small></div>
                        <p><Clock3 /> {article.reading_time_minutes} menit <i>•</i> <Eye /> {article.view_count.toLocaleString("id-ID")}</p>
                    </div>
                    <figure className="public-article-hero">
                        <Image src={articleImage(article)} alt={article.featured_media?.alt_text || article.title} fill sizes="(max-width: 820px) 100vw, 760px" priority />
                        {article.featured_media?.title && <figcaption>{article.featured_media.title}</figcaption>}
                    </figure>
                    <ArticleActions articleId={article.id} slug={article.slug} title={article.title} excerpt={article.excerpt} copyMessage={insertions.copy_message} />
                    <section className="article-takeaways"><span>INTI BERITA</span><h2>Yang perlu Anda ketahui</h2><p>{article.excerpt}</p><div><b>{readingMinutes} menit baca</b><b>{article.view_count.toLocaleString("id-ID")} pembaca</b><b>{article.category_name}</b></div></section>
                    <ArticleCopyAttribution title={article.title} excerpt={article.excerpt} message={insertions.copy_message} />
                    <div id="article-copy" className={locked ? "public-article-copy is-locked" : "public-article-copy"}>
                        {visibleBlocks.map((block, index) => {
                            const paragraph = index + 1;
                            return <div className="article-content-block" id={/<h[2-4]/i.test(block) ? `article-section-${headingLabels.indexOf(block.match(/<h[2-4][^>]*>(.*?)<\/h[2-4]>/i)?.[1]?.replace(/<[^>]+>/g, "") || "") + 1}` : undefined} key={`${index}-${block.slice(0, 24)}`}>
                                {contentIsHtml ? <div dangerouslySetInnerHTML={{ __html: block }} /> : <p>{block}</p>}
                                {!locked && insertions.read_also_enabled && paragraph === insertions.read_also_paragraph && related[0] && <aside className="article-inline-read"><span>{insertions.read_also_label}</span><Link href={`/${related[0].slug}`}>{related[0].title}</Link></aside>}
                                {!locked && insertions.product_enabled && paragraph === insertions.product_paragraph && product && <aside className="article-inline-product">{product.image_url && <Image src={product.image_url} alt={product.name} width={150} height={110} />}<div><span>MERCHANDISE PILIHAN</span><h3>{product.name}</h3>{product.description && <p>{product.description}</p>}<b>Rp{product.price_idr.toLocaleString("id-ID")} · {product.price_points} poin</b><Link href="/merchandise">Lihat produk</Link></div></aside>}
                                {!locked && insertions.ad_enabled && paragraph === insertions.ad_paragraph && insertions.ad_html && <aside className="article-inline-ad"><small>IKLAN</small><div dangerouslySetInnerHTML={{ __html: sanitizeAdHtml(insertions.ad_html) }} /></aside>}
                            </div>;
                        })}
                    </div>
                    {article.tags.length > 0 && <div className="article-tags" aria-label="Tags artikel">{article.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
                    {locked && <section className="public-paywall" aria-label="Konten eksklusif member">
                        <span>KONTEN EKSKLUSIF</span>
                        <h2>Artikel ini khusus member SwapNews.</h2>
                        <p>Aktifkan membership Rp99.900/tahun untuk membaca artikel eksklusif, bebas iklan, dan hak kirim berita kontributor.</p>
                        <Link href="/membership">Aktifkan membership</Link>
                    </section>}
                    {!locked && !insertions.read_also_enabled && related[0] && <aside className="public-read-also"><span>BACA JUGA</span><Link href={`/${related[0].slug}`}>{related[0].title}</Link></aside>}
                </article>

                <aside className="public-related" aria-labelledby="related-title">
                    <span>PILIHAN REDAKSI</span><h2 id="related-title">Berita terkait</h2>
                    {related.map((item, index) => <Link href={`/${item.slug}`} key={item.id}>
                        <Image src={articleImage(item, index + 1)} alt={item.featured_media?.alt_text || item.title} width={110} height={82} />
                        <div><small>{item.category_name}</small><h3>{item.title}</h3><p>{item.reading_time_minutes} menit baca</p></div>
                    </Link>)}
                </aside>
            </main>
            <ArticleComments articleId={article.id} />
        </div>
    );
}
