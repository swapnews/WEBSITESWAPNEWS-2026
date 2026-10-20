"use client";

import Image from "next/image";
import "@/styles/homepage-modules.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Bell, Bookmark, BookOpen, BriefcaseBusiness, Building2, Car, ChevronLeft, ChevronRight,
    Flame, HeartPulse, Home, House, Laptop, LogIn, Moon, Newspaper,
    Plane, Radio, Search, Sparkles, Sun, Trophy, ArrowUp, Rows3, Mail, X, Zap,
} from "lucide-react";

import type { PublicArticle, PublicHomeData } from "@/lib/public-articles";
import { AdSlotFrame } from "@/components/ads/ad-slot";
import { InstagramReels } from "@/components/instagram-reels";
import { HomepageStoryModule } from "@/components/homepage-story-module";
import { isAdModule, mergeHomepageModules } from "@/lib/homepage-modules";

function articleImage(article: PublicArticle, index = 0) {
    return article.featured_media?.secure_url || "/og-default.jpg";
}

function formatRelativeDate(value: string) {
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.max(Math.floor(diff / 60000), 1);
    if (minutes < 60) return `${minutes} menit yang lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam yang lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari yang lalu`;
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

const topics = [
    { name: "SwapNews", slug: "news", icon: Newspaper },
    { name: "Nasional", slug: "nasional", icon: Building2 },
    { name: "Hukum & Kriminal", slug: "hukum-kriminal", icon: Newspaper },
    { name: "TNI-Polri", slug: "tni-polri", icon: Newspaper },
    { name: "SwapFinance", slug: "finance", icon: BriefcaseBusiness },
    { name: "Bisnis", slug: "bisnis", icon: BriefcaseBusiness },
    { name: "Ekonomi Digital", slug: "ekonomi-digital", icon: Zap },
    { name: "SwapTekno", slug: "tekno", icon: Laptop },
    { name: "Gadget", slug: "gadget", icon: Laptop },
    { name: "AI & Inovasi", slug: "ai-inovasi", icon: Sparkles },
    { name: "SwapHot", slug: "hot", icon: Flame },
    { name: "Musik", slug: "musik", icon: Radio },
    { name: "SwapSport", slug: "sport", icon: Trophy },
    { name: "Sepakbola", slug: "sepakbola", icon: Trophy },
    { name: "SwapBali", slug: "bali", icon: Plane },
    { name: "SwapDaerah", slug: "daerah", icon: Home },
    { name: "SwapTravel", slug: "travel", icon: Plane },
    { name: "SwapHealth", slug: "health", icon: HeartPulse },
    { name: "SwapOto", slug: "otomotif", icon: Car },
    { name: "Psikologi & Mental", slug: "psikologi", icon: HeartPulse },
    { name: "Edukasi", slug: "edukasi", icon: BookOpen },
    { name: "Lingkungan", slug: "lingkungan", icon: Building2 },
];


export default function NewsPortal({ data }: { data: PublicHomeData }) {
    const [dark, setDark] = useState(true);
    const [active, setActive] = useState("Semua");
    const [topicPage, setTopicPage] = useState(1);
    const [feedAnimating, setFeedAnimating] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);
    const [compact, setCompact] = useState(false);
    const [lastRead, setLastRead] = useState<string | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const carouselRef = useRef<HTMLDivElement>(null);
    const trendingSlides = useMemo(() => data.trending.slice(0, 10), [data.trending]);

    const goToSlide = useCallback((index: number) => {
        const carousel = carouselRef.current;
        if (!carousel || !trendingSlides.length) return;
        const next = (index + trendingSlides.length) % trendingSlides.length;
        carousel.scrollTo({ left: carousel.clientWidth * next, behavior: "smooth" });
        setActiveSlide(next);
    }, [trendingSlides.length]);

    useEffect(() => {
        const stored = localStorage.getItem("swapnews-theme");
        const chosen = stored ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.dataset.theme = chosen ? "dark" : "light";
        const timer = window.setTimeout(() => {
            setDark(chosen);
            setCompact(localStorage.getItem("swapnews-density") === "compact");
            setLastRead(localStorage.getItem("swapnews-last-read"));
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        addEventListener("scroll", onScroll, { passive: true });
        return () => removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        if (trendingSlides.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const timer = window.setInterval(() => goToSlide(activeSlide + 1), 6500);
        return () => window.clearInterval(timer);
    }, [activeSlide, goToSlide, trendingSlides.length]);

    const switchTheme = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? "dark" : "light";
        localStorage.setItem("swapnews-theme", next ? "dark" : "light");
    };

    const filters = useMemo(() => ["Semua", "Trending", ...data.sections.map((section) => section.title)], [data.sections]);
    const topicArticles = useMemo(() => {
        const source = active === "Trending" ? [...data.articles].sort((a, b) => b.view_count - a.view_count) : active === "Semua" ? [...data.articles].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()) : data.articles.filter(item => item.category_name.toLocaleLowerCase("id-ID") === active.toLocaleLowerCase("id-ID"));
        return source;
    }, [active, data.articles]);
    const topicPageSize = 9;
    const topicPageCount = Math.max(1, Math.ceil(topicArticles.length / topicPageSize));
    const pagedTopicArticles = topicArticles.slice((topicPage - 1) * topicPageSize, topicPage * topicPageSize);
    const selectTopic = (topic: string) => { if (topic === active) return; setFeedAnimating(true); window.setTimeout(() => { setActive(topic); setTopicPage(1); setFeedAnimating(false) }, 180); };
    const selectTopicPage = (page: number) => { setFeedAnimating(true); window.setTimeout(() => { setTopicPage(page); setFeedAnimating(false); document.getElementById("topic-feed")?.scrollIntoView({ behavior: "smooth", block: "start" }) }, 180); };

    const visibleSections = useMemo(() => {
        if (active === "Semua") return data.sections;
        if (active === "Trending") {
            const lead = data.trending[0];
            return lead ? [{ title: "Trending Topic", slug: "trending", lead, items: data.trending.slice(1, 4) }] : [];
        }
        return data.sections.filter((section) => section.title === active);
    }, [active, data.sections, data.trending]);

    const homepageModules = mergeHomepageModules(data.homepageSections);

    const continueArticle = useMemo(() => data.articles.find(item => item.slug === lastRead), [data.articles, lastRead]);
    const ad = (key: string) => data.ads.find((slot) => slot.slot_key === key);
    const toggleDensity = () => { const next = !compact; setCompact(next); localStorage.setItem("swapnews-density", next ? "compact" : "comfortable"); };

    return (
        <div className={`news-app ${compact ? "is-compact" : ""}`}>
            <div className="desktop-utility"><span>SwapNews Network</span><p>Berita Terkini Indonesia · Independen · Terpercaya</p><span>{new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}</span></div>
            <header className={`news-header${scrolled ? " is-scrolled" : ""}`}>
                <Link href="/" className="news-logo" aria-label="SwapNews beranda">
                    <Image className="logo-black" src="/swapnews-logo-black.png" alt="SwapNews" width={164} height={48} priority />
                    <Image className="logo-white" src="/swapnews-logo-white.png" alt="SwapNews" width={164} height={48} priority />
                    <Image className="logo-accent" src="/swapnews-logo-accent.png" alt="SwapNews" width={164} height={48} priority />
                </Link>
                <div className="desktop-ad-slot"><AdSlotFrame slot={ad("global_header_leaderboard")} /></div>
                <form className="desktop-search" action="/cari"><Search /><input name="q" aria-label="Cari berita" placeholder="Cari berita, topik, atau tokoh..." /><kbd>Ctrl K</kbd></form>
                <div className="news-actions">
                    <Link id="news-search" href="/cari" aria-label="Cari berita" className="news-icon-link"><Search /></Link>
                    <button id="density-switch" onClick={toggleDensity} aria-label="Ubah kepadatan tampilan"><Rows3 /></button>
                    <button id="news-notifications" className="has-alert" aria-label="Notifikasi"><Bell /></button>
                    <button id="theme-switch" className="theme-switch" onClick={switchTheme} aria-label={`Aktifkan mode ${dark ? "terang" : "gelap"}`} aria-pressed={dark}>
                        <span className={!dark ? "selected" : ""}><Sun /></span><span className={dark ? "selected" : ""}><Moon /></span>
                    </button>
                </div>
            </header>
            <nav className="desktop-channel-nav" aria-label="Kanal berita"><div>{topics.map(({ name, slug }) => <Link key={slug} href={`/kanal/${slug}`}>{name}</Link>)}</div></nav>
            <div className="desktop-ticker"><strong>TRENDING</strong><span>{trendingSlides.map((item) => item.title).join("   •   ")}</span></div>

            <main className="news-main">
                <div className="desktop-newsroom-grid">
                    <aside className="desktop-latest"><div className="desktop-module-title"><h2>Terbaru</h2><span>LIVE</span></div>{data.articles.slice(0, 5).map((item, index) => <Link href={`/${item.slug}`} key={item.id}><b>{String(index + 1).padStart(2, "0")}</b><Image className="desktop-story-thumb" src={articleImage(item, index)} alt={item.featured_media?.alt_text || item.title} width={68} height={68} sizes="68px" /><span><small>{item.category_name} · {formatRelativeDate(item.published_at)}</small><strong>{item.title}</strong></span></Link>)}</aside>
                    <div className="desktop-hero-slot">
                        <section className="trending-stage" aria-roledescription="carousel" aria-label="10 berita trending">
                            <div
                                className="trending-carousel"
                                ref={carouselRef}
                                onScroll={(event) => {
                                    const element = event.currentTarget;
                                    const index = Math.round(element.scrollLeft / Math.max(element.clientWidth, 1));
                                    setActiveSlide(Math.min(index, trendingSlides.length - 1));
                                }}
                            >
                                {trendingSlides.map((article, index) => (
                                    <Link href={`/${article.slug}`} className="news-hero" aria-label={`${index + 1} dari ${trendingSlides.length}: ${article.title}`} key={article.id}>
                                        <Image src={articleImage(article, index)} alt={article.featured_media?.alt_text || article.title} fill sizes="(max-width: 759px) 100vw, 920px" priority={index === 0} />
                                        <div className="news-image-shade" />
                                        <div className="news-hero-copy">
                                            <span className="news-badge">Trending #{index + 1} · {article.category_name}</span>
                                            <h1>{article.title}</h1>
                                            <small>{formatRelativeDate(article.published_at)} · {article.view_count.toLocaleString("id-ID")} dibaca</small>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            {trendingSlides.length > 1 && <div className="carousel-arrows" aria-label="Kontrol carousel">
                                <button id="trending-previous" onClick={() => goToSlide(activeSlide - 1)} aria-label="Berita trending sebelumnya"><ChevronLeft /></button>
                                <button id="trending-next" onClick={() => goToSlide(activeSlide + 1)} aria-label="Berita trending berikutnya"><ChevronRight /></button>
                            </div>}
                        </section>
                        <div className="slider-dots" aria-label={`Slide ${activeSlide + 1} dari ${trendingSlides.length}`}>
                            {trendingSlides.map((article, index) => (
                                <button key={article.id} className={activeSlide === index ? "active" : ""} onClick={() => goToSlide(index)} aria-label={`Buka slide ${index + 1}`} />
                            ))}
                        </div>
                        <div className="hero-status"><span>{String(activeSlide + 1).padStart(2, "0")} / {String(trendingSlides.length).padStart(2, "0")}</span><i style={{ width: `${((activeSlide + 1) / Math.max(trendingSlides.length, 1)) * 100}%` }} /></div>
                    </div>
                    <aside className="desktop-popular"><div className="desktop-module-title"><h2>Terpopuler</h2><span>24 JAM</span></div>{trendingSlides.slice(0, 5).map((item, index) => <Link href={`/${item.slug}`} key={item.id}><b>{String(index + 1).padStart(2, "0")}</b><Image className="desktop-story-thumb" src={articleImage(item, index + 1)} alt={item.featured_media?.alt_text || item.title} width={68} height={68} sizes="68px" /><span><small>{item.category_name}</small><strong>{item.title}</strong><em>{item.view_count.toLocaleString("id-ID")} dibaca</em></span></Link>)}<AdSlotFrame slot={ad("home_sidebar_rectangle")} /></aside>
                </div>
                <AdSlotFrame slot={ad("home_after_hero_billboard")} />
                <section className="quick-brief" aria-label="Ringkas cepat">{data.articles.slice(5, 8).map((item, index) => <Link href={`/${item.slug}`} key={item.id}><b>0{index + 1}</b><span><small>{item.category_name}</small><strong>{item.title}</strong></span></Link>)}</section>
                {continueArticle && <Link href={`/${continueArticle.slug}`} className="continue-reading"><span><BookOpen /> LANJUTKAN MEMBACA</span><strong>{continueArticle.title}</strong><ChevronRight /></Link>}
                {data.breakingNews.length > 0 ? <div className="live-breaking-rail"><strong>BREAKING</strong><div>{data.breakingNews.map((item) => <Link href={item.target_url} key={item.id}>{item.headline}</Link>)}</div><span>LIVE</span></div> : trendingSlides[0] && <Link href={`/${trendingSlides[0].slug}`} className="desktop-breaking"><strong>BREAKING</strong><span>{trendingSlides[0].title}</span><small>{formatRelativeDate(trendingSlides[0].published_at)}</small></Link>}

                {homepageModules.filter(module => module.is_enabled).map(module => {
                    if (isAdModule(module)) return <div key={module.section_key} data-home-module={module.section_key}><AdSlotFrame slot={{ name: module.title, is_active: true, content_type: "html", html_content: module.settings?.html_content ?? "", youtube_url: null, desktop_width: 970, desktop_height: module.settings?.desktop_height ?? 250, mobile_width: 320, mobile_height: module.settings?.mobile_height ?? 250 }} /></div>;
                    if (module.section_key === "topics") return <div key={module.section_key} data-home-module={module.section_key} className={`composed-topics topics-${module.style_variant}`}>
                        <section className="topic-grid" aria-label="Pilihan kanal">
                            {topics.map(({ name, icon: Icon }, index) => (
                                <button
                                    id={`topic-${name.toLowerCase().replaceAll(" ", "-")}`}
                                    key={name}
                                    className={active === name ? "active" : ""}
                                    style={{ "--topic-index": index } as React.CSSProperties}
                                    onClick={() => setActive(name)}
                                ><Icon /><span>{name}</span></button>
                            ))}
                        </section>

                        <section className="topic-filter" aria-labelledby="topic-title">
                            <div className="news-section-head"><h2 id="topic-title">{module.title}</h2><button>Lihat semua</button></div>
                            <div className="topic-chips">
                                {filters.map(topic => <button key={topic} className={active === topic ? "active" : ""} onClick={() => selectTopic(topic)} aria-pressed={active === topic}>{topic}</button>)}
                            </div>
                        </section>
                        <AdSlotFrame slot={ad("home_after_topics_leaderboard")} />

                        <section id="topic-feed" className={`topic-news-feed ${feedAnimating ? "is-changing" : ""}`} aria-live="polite" aria-labelledby="topic-feed-title">
                            <header><div><span>{active === "Trending" ? "PALING DICARI • PALING DIBACA" : "UPDATE REDAKSI"}</span><h2 id="topic-feed-title">{active === "Semua" ? "Berita Terbaru" : active}</h2><p>{active === "Trending" ? "Urutan berdasarkan jumlah pembaca tertinggi." : active === "Semua" ? "Semua berita terbaru dari seluruh kanal SwapNews." : `Berita dan artikel terbaru dalam kategori ${active}.`}</p></div><b>{topicArticles.length} artikel</b></header>
                            {pagedTopicArticles.length ? <div className="topic-news-grid">{pagedTopicArticles.map((item, index) => <Link href={`/${item.slug}`} key={item.id} className={index === 0 ? "topic-news-card featured" : "topic-news-card"}><div><Image src={articleImage(item, index)} alt={item.featured_media?.alt_text || item.title} fill sizes={index === 0 ? "640px" : "320px"} /><span className="news-image-shade" /><small>{item.category_name}</small></div><section><h3>{item.title}</h3><p>{item.excerpt}</p><footer><span>{formatRelativeDate(item.published_at)} · {item.reading_time_minutes} menit</span>{active === "Trending" && <b>{item.view_count.toLocaleString("id-ID")} dibaca</b>}</footer></section></Link>)}</div> : <div className="topic-feed-empty"><h3>Belum ada berita {active}</h3><p>Redaksi sedang menyiapkan artikel terbaik.</p></div>}
                            {topicPageCount > 1 && <nav className="topic-pagination" aria-label="Halaman berita"><button onClick={() => selectTopicPage(Math.max(1, topicPage - 1))} disabled={topicPage === 1} aria-label="Halaman sebelumnya"><ChevronLeft /></button>{Array.from({ length: topicPageCount }, (_, i) => i + 1).map(page => <button key={page} className={page === topicPage ? "active" : ""} aria-current={page === topicPage ? "page" : undefined} onClick={() => selectTopicPage(page)}>{page}</button>)}<button onClick={() => selectTopicPage(Math.min(topicPageCount, topicPage + 1))} disabled={topicPage === topicPageCount} aria-label="Halaman berikutnya"><ChevronRight /></button></nav>}
                        </section>
                        <AdSlotFrame slot={ad("home_midfeed_billboard")} />

                    </div>;
                    if (module.section_key === "reels") return <div key={module.section_key} data-home-module={module.section_key}><InstagramReels reels={data.reels} title={module.title} /></div>;
                    return <div key={module.section_key} data-home-module={module.section_key}><HomepageStoryModule module={module} data={data} visibleSections={visibleSections} /></div>;
                })}
                <section className="newsletter-glass"><div><span>THE DAILY SIGNAL</span><h2>Berita penting. Tanpa kebisingan.</h2><p>Ringkasan editorial SwapNews langsung ke inbox.</p></div><form onSubmit={(event) => event.preventDefault()}><Mail /><input type="email" aria-label="Email newsletter" placeholder="nama@email.com" required /><button>Berlangganan</button></form></section>
            </main>
            <button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Kembali ke atas"><ArrowUp /></button>
            <nav className="news-bottom-nav" aria-label="Navigasi utama">
                <Link className="active" href="/"><House /><span>Beranda</span></Link>
                <button id="nav-trending" onClick={() => document.querySelector('.trending-stage')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Flame /><span>Trending</span></button>
                <button id="nav-terbaru" onClick={() => document.getElementById('topic-feed')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Newspaper /><span>Terbaru</span></button>
                <Link id="nav-masuk" href="/login"><LogIn /><span>Masuk</span></Link>
            </nav>
        </div>
    );
}
