"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Bell, Bookmark, BookOpen, BriefcaseBusiness, Building2, Car, ChevronLeft, ChevronRight,
    CircleUserRound, Clapperboard, Flame, HeartPulse, Home, House, Laptop, Moon, Newspaper,
    Plane, Radio, Search, Sparkles, Sun, Trophy, Utensils, Zap, X, ArrowUp, Rows3, Mail,
} from "lucide-react";

import type { PublicArticle, PublicHomeData } from "@/lib/public-articles";
import { AdSlotFrame } from "@/components/ads/ad-slot";
import { InstagramReels } from "@/components/instagram-reels";
import { BaliLiveHub } from "@/components/bali-live-hub";

const DEMO_IMAGES = ["/news/city.png", "/news/bali.png", "/news/sports.png"];

function articleImage(article: PublicArticle, index = 0) {
    return article.featured_media?.secure_url ?? DEMO_IMAGES[index % DEMO_IMAGES.length];
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
    { name: "News", slug: "news", icon: Newspaper }, { name: "Finance", slug: "finance", icon: BriefcaseBusiness },
    { name: "Hot", slug: "hot", icon: Flame }, { name: "Sport", slug: "sport", icon: Trophy },
    { name: "Travel", slug: "travel", icon: Plane }, { name: "Food", slug: "food", icon: Utensils },
    { name: "Health", slug: "health", icon: HeartPulse }, { name: "Lifestyle", slug: "lifestyle", icon: Sparkles },
    { name: "Otomotif", slug: "otomotif", icon: Car }, { name: "Teknologi", slug: "teknologi", icon: Laptop },
    { name: "Properti", slug: "properti", icon: House }, { name: "Hikmah", slug: "hikmah", icon: Building2 },
    { name: "Edukasi", slug: "edukasi", icon: BookOpen }, { name: "Video", slug: "video", icon: Clapperboard },
    { name: "MUSIK", slug: "musik", icon: Radio }, { name: "PSIKOLOGI", slug: "psikologi", icon: HeartPulse },
    { name: "BALI", slug: "bali", icon: Plane }, { name: "GAMES", slug: "games", icon: Zap },
];


export default function NewsPortal({ data }: { data: PublicHomeData }) {
    const [dark, setDark] = useState(true);
    const [active, setActive] = useState("Semua");
    const [topicPage, setTopicPage] = useState(1);
    const [feedAnimating, setFeedAnimating] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);
    const [compact, setCompact] = useState(false);
    const [savedOpen, setSavedOpen] = useState(false);
    const [savedSlugs, setSavedSlugs] = useState<string[]>([]);
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
            setSavedSlugs(JSON.parse(localStorage.getItem("swapnews-bookmarks") || "[]"));
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

    const moduleEnabled = (key: string) => data.homepageSections.find((section) => section.section_key === key)?.is_enabled ?? true;

    const psychologySection = data.sections.find(section => section.slug.toLowerCase().includes("psikologi") || section.title.toLowerCase().includes("psikologi"));
    const psychologyStories = psychologySection ? [psychologySection.lead, ...psychologySection.items] : [];
    const savedArticles = useMemo(() => data.articles.filter(item => savedSlugs.includes(item.slug)), [data.articles, savedSlugs]);
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

                {moduleEnabled("topics") && <section className="topic-grid" aria-label="Pilihan kanal">
                    {topics.map(({ name, icon: Icon }, index) => (
                        <button
                            id={`topic-${name.toLowerCase().replaceAll(" ", "-")}`}
                            key={name}
                            className={active === name ? "active" : ""}
                            style={{ "--topic-index": index } as React.CSSProperties}
                            onClick={() => setActive(name)}
                        ><Icon /><span>{name}</span></button>
                    ))}
                </section>}

                {moduleEnabled("topics") && <section className="topic-filter" aria-labelledby="topic-title">
                    <div className="news-section-head"><h2 id="topic-title">Topik-Topik</h2><button>Lihat semua</button></div>
                    <div className="topic-chips">
                        {filters.map(topic => <button key={topic} className={active === topic ? "active" : ""} onClick={() => selectTopic(topic)} aria-pressed={active === topic}>{topic}</button>)}
                    </div>
                </section>}
                <AdSlotFrame slot={ad("home_after_topics_leaderboard")} />

                <section id="topic-feed" className={`topic-news-feed ${feedAnimating ? "is-changing" : ""}`} aria-live="polite" aria-labelledby="topic-feed-title">
                    <header><div><span>{active === "Trending" ? "PALING DICARI • PALING DIBACA" : "UPDATE REDAKSI"}</span><h2 id="topic-feed-title">{active === "Semua" ? "Berita Terbaru" : active}</h2><p>{active === "Trending" ? "Urutan berdasarkan jumlah pembaca tertinggi." : active === "Semua" ? "Semua berita terbaru dari seluruh kanal SwapNews." : `Berita dan artikel terbaru dalam kategori ${active}.`}</p></div><b>{topicArticles.length} artikel</b></header>
                    {pagedTopicArticles.length ? <div className="topic-news-grid">{pagedTopicArticles.map((item, index) => <Link href={`/${item.slug}`} key={item.id} className={index === 0 ? "topic-news-card featured" : "topic-news-card"}><div><Image src={articleImage(item, index)} alt={item.featured_media?.alt_text || item.title} fill sizes={index === 0 ? "640px" : "320px"} /><span className="news-image-shade" /><small>{item.category_name}</small></div><section><h3>{item.title}</h3><p>{item.excerpt}</p><footer><span>{formatRelativeDate(item.published_at)} · {item.reading_time_minutes} menit</span>{active === "Trending" && <b>{item.view_count.toLocaleString("id-ID")} dibaca</b>}</footer></section></Link>)}</div> : <div className="topic-feed-empty"><h3>Belum ada berita {active}</h3><p>Redaksi sedang menyiapkan artikel terbaik.</p></div>}
                    {topicPageCount > 1 && <nav className="topic-pagination" aria-label="Halaman berita"><button onClick={() => selectTopicPage(Math.max(1, topicPage - 1))} disabled={topicPage === 1} aria-label="Halaman sebelumnya"><ChevronLeft /></button>{Array.from({ length: topicPageCount }, (_, i) => i + 1).map(page => <button key={page} className={page === topicPage ? "active" : ""} aria-current={page === topicPage ? "page" : undefined} onClick={() => selectTopicPage(page)}>{page}</button>)}<button onClick={() => selectTopicPage(Math.min(topicPageCount, topicPage + 1))} disabled={topicPage === topicPageCount} aria-label="Halaman berikutnya"><ChevronRight /></button></nav>}
                </section>
                <AdSlotFrame slot={ad("home_midfeed_billboard")} />

                {moduleEnabled("reels") && <InstagramReels reels={data.reels} />}

                {moduleEnabled("games") && data.games.length > 0 && <section className="editorial-feed games-feed" aria-labelledby="games-feed-title">
                    <header><span>PLAY • COMPETE • DISCOVER</span><h2 id="games-feed-title">Games Arena</h2><p>Game, esports, dan kultur pemain Indonesia.</p></header>
                    <div className="games-grid">{data.games.slice(0, 6).map((item, index) => <Link href={`/${item.slug}`} className={index === 0 ? "games-lead" : `games-card games-card-${index + 1}`} key={item.id}><div><Image src={articleImage(item, index)} alt={item.featured_media?.alt_text || item.title} fill sizes={index === 0 ? "520px" : "320px"} /><span className="news-image-shade" /></div><small>{item.category_name} · {String(index + 1).padStart(2, "0")}</small><h3>{item.title}</h3></Link>)}</div>
                </section>}

                {moduleEnabled("sports") && data.sports.length > 0 && <section className="editorial-feed sports-feed" aria-labelledby="sports-feed-title">
                    <header><span>LIVE SCOREBOARD</span><h2 id="sports-feed-title">Sports Focus</h2><p>Momentum, rivalitas, dan kemenangan.</p></header>
                    <div className="sports-slider">{data.sports.map((item, index) => <Link href={`/${item.slug}`} className={index === 0 ? "sports-slide sports-slide-lead" : "sports-slide"} key={item.id}><div className="sports-thumb"><Image src={articleImage(item, index + 1)} alt={item.featured_media?.alt_text || item.title} fill sizes={index === 0 ? "460px" : "320px"} /></div><span>{String(index + 1).padStart(2, "0")}</span><div className="sports-slide-copy"><small>{item.category_name}</small><h3>{item.title}</h3><em>{formatRelativeDate(item.published_at)}</em></div></Link>)}</div>
                </section>}

                {moduleEnabled("bali") && <><section className="editorial-feed bali-feed" aria-labelledby="bali-feed-title">
                    <header><span>ISLAND STORIES</span><h2 id="bali-feed-title">Bali Kini</h2><p>Budaya hidup, destinasi, dan suara lokal.</p></header>
                    <div className="bali-mosaic">{data.bali.map((item, index) => <Link href={`/${item.slug}`} className={`bali-card bali-${index + 1}`} key={item.id}><Image src={articleImage(item, index + 1)} alt={item.featured_media?.alt_text || item.title} fill sizes="500px" /><span className="news-image-shade" /><div><small>{item.category_name}</small><h3>{item.title}</h3></div></Link>)}</div>
                </section><BaliLiveHub articles={data.bali} /></>}

                {psychologySection && <section className="psychology-showcase" aria-labelledby="psychology-title">
                    <header><div><span>MIND • LIFE • WELLBEING</span><h2 id="psychology-title">Ruang <em>Psikologi</em></h2><p>Memahami diri, relasi, dan kesehatan mental melalui perspektif tepercaya.</p></div><Link href={`/kanal/${psychologySection.slug}`}>Lihat semua <ChevronRight /></Link></header>
                    <div className="psychology-layout">
                        <div className="psychology-main">
                            <Link href={`/${psychologySection.lead.slug}`} className="psychology-lead"><div><Image src={articleImage(psychologySection.lead)} alt={psychologySection.lead.featured_media?.alt_text || psychologySection.lead.title} fill sizes="680px" /><span className="news-image-shade" /><b>PSIKOLOGI</b></div><section><h3>{psychologySection.lead.title}</h3><p>{psychologySection.lead.excerpt}</p><small>{formatRelativeDate(psychologySection.lead.published_at)} · {psychologySection.lead.reading_time_minutes} menit baca</small></section></Link>
                            <div className="psychology-grid">{psychologySection.items.slice(0, 3).map((item, index) => <Link href={`/${item.slug}`} key={item.id}><div><Image src={articleImage(item, index + 1)} alt={item.featured_media?.alt_text || item.title} fill sizes="240px" /></div><h3>{item.title}</h3><small>{formatRelativeDate(item.published_at)}</small></Link>)}</div>
                        </div>
                        <aside className="psychology-recent"><span>RECENT STORIES</span><h3>Terbaru di Psikologi</h3>{psychologyStories.slice(0, 4).map((item, index) => <Link href={`/${item.slug}`} key={item.id}><b>{String(index + 1).padStart(2, "0")}</b><Image src={articleImage(item, index + 2)} alt="" width={76} height={58} /><div><strong>{item.title}</strong><small>{formatRelativeDate(item.published_at)}</small></div></Link>)}</aside>
                    </div>
                </section>}

                {moduleEnabled("latest") && visibleSections.map((section, sectionIndex) => (
                    <section className="news-section" key={section.slug} aria-labelledby={`section-${sectionIndex}`}>
                        <div className="news-section-head"><h2 id={`section-${sectionIndex}`}>{section.title}</h2><button>Lihat semua</button></div>
                        <div className="news-block">
                            <Link href={`/${section.lead.slug}`} className="lead-story">
                                <div className="lead-image"><Image src={articleImage(section.lead, sectionIndex)} alt={section.lead.featured_media?.alt_text || section.lead.title} fill sizes="240px" /><div className="news-image-shade" />{sectionIndex === 0 && <span className="news-badge">TERBARU</span>}</div>
                                <h3>{section.lead.title}</h3><small>{formatRelativeDate(section.lead.published_at)}</small>
                            </Link>
                            <div className="mini-list">
                                {section.items.map((item, i) => <Link href={`/${item.slug}`} key={item.id} className="mini-story">
                                    <Image src={articleImage(item, i + sectionIndex + 1)} alt={item.featured_media?.alt_text || item.title} width={72} height={52} />
                                    <span><strong>{item.title}</strong><small>{formatRelativeDate(item.published_at)}</small></span><Bookmark />
                                </Link>)}
                            </div>
                        </div>
                    </section>
                ))}
                <section className="newsletter-glass"><div><span>THE DAILY SIGNAL</span><h2>Berita penting. Tanpa kebisingan.</h2><p>Ringkasan editorial SwapNews langsung ke inbox.</p></div><form onSubmit={(event) => event.preventDefault()}><Mail /><input type="email" aria-label="Email newsletter" placeholder="nama@email.com" required /><button>Berlangganan</button></form></section>
            </main>
            <button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Kembali ke atas"><ArrowUp /></button>
            {savedOpen && <aside className="saved-drawer" aria-label="Berita tersimpan"><header><div><span>KOLEKSI</span><h2>Tersimpan</h2></div><button onClick={() => setSavedOpen(false)} aria-label="Tutup"><X /></button></header>{savedArticles.length ? savedArticles.map(item => <Link href={`/${item.slug}`} key={item.id}><Image src={articleImage(item)} alt="" width={70} height={54} /><strong>{item.title}</strong></Link>) : <p>Belum ada berita tersimpan.</p>}</aside>}

            <nav className="news-bottom-nav" aria-label="Navigasi utama">
                <Link className="active" href="/"><Home /><span>Beranda</span></Link>
                <Link id="explore" href="/cari"><Radio /><span>Eksplor</span></Link>
                <button id="create-news" className="create-button" aria-label="Buat berita"><Zap /></button>
                <button id="saved-news" onClick={() => setSavedOpen(true)}><Bookmark /><span>Tersimpan</span></button>
                <button id="profile"><CircleUserRound /><span>Profil</span></button>
            </nav>
        </div>
    );
}
