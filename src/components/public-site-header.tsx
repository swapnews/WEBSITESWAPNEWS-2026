"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
    Bell, Bookmark, BookOpen, BriefcaseBusiness, Building2, Car, CircleUserRound,
    Clapperboard, Flame, HeartPulse, Home, House, Laptop, Moon, Newspaper,
    Plane, Radio, Rows3, Search, Sparkles, Sun, Trophy, Utensils, X, Zap,
} from "lucide-react";

export const PUBLIC_TOPICS = [
    { name: "News", slug: "news" }, { name: "Finance", slug: "finance" },
    { name: "Hot", slug: "hot" }, { name: "Sport", slug: "sport" },
    { name: "Travel", slug: "travel" }, { name: "Food", slug: "food" },
    { name: "Health", slug: "health" }, { name: "Lifestyle", slug: "lifestyle" },
    { name: "Otomotif", slug: "otomotif" }, { name: "Teknologi", slug: "teknologi" },
    { name: "Properti", slug: "properti" }, { name: "Hikmah", slug: "hikmah" },
    { name: "Edukasi", slug: "edukasi" }, { name: "Video", slug: "video" },
    { name: "MUSIK", slug: "musik" }, { name: "PSIKOLOGI", slug: "psikologi" },
    { name: "BALI", slug: "bali" }, { name: "GAMES", slug: "games" },
];

export function PublicSiteHeader({
    backHref,
    categoryName,
    tickerText,
}: {
    backHref?: string;
    categoryName?: string;
    tickerText?: string;
}) {
    const [dark, setDark] = useState(true);
    const [compact, setCompact] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [savedOpen, setSavedOpen] = useState(false);
    const [savedSlugs, setSavedSlugs] = useState<string[]>([]);
    const [savedArticles, setSavedArticles] = useState<{ slug: string; title: string; image: string }[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem("swapnews-theme");
        const chosen = stored ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.dataset.theme = chosen ? "dark" : "light";
        const timer = window.setTimeout(() => {
            setDark(chosen);
            setCompact(localStorage.getItem("swapnews-density") === "compact");
            setSavedSlugs(JSON.parse(localStorage.getItem("swapnews-bookmarks") || "[]"));
        }, 0);
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        addEventListener("scroll", onScroll, { passive: true });
        return () => { window.clearTimeout(timer); removeEventListener("scroll", onScroll); };
    }, []);

    useEffect(() => {
        if (!savedOpen) return;
        const slugs = JSON.parse(localStorage.getItem("swapnews-bookmarks") || "[]") as string[];
        setSavedSlugs(slugs);
        const cached = JSON.parse(localStorage.getItem("swapnews-bookmark-cache") || "{}") as Record<string, { title: string; image: string }>;
        setSavedArticles(slugs.map((slug) => ({ slug, ...(cached[slug] ?? { title: slug, image: "/swapnews-logo.png" }) })));
    }, [savedOpen]);

    const switchTheme = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? "dark" : "light";
        localStorage.setItem("swapnews-theme", next ? "dark" : "light");
    };
    const toggleDensity = () => {
        const next = !compact;
        setCompact(next);
        localStorage.setItem("swapnews-density", next ? "compact" : "comfortable");
    };

    return (
        <>
            <div className="desktop-utility">
                <span>SwapNews Network</span>
                <p>Berita Terkini Indonesia · Independen · Terpercaya</p>
                <span>{new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date())}</span>
            </div>

            <header className={`news-header${scrolled ? " is-scrolled" : ""}`}>
                {backHref ? (
                    <Link href={backHref} className="news-back-link" aria-label="Kembali">
                        <span>←</span>
                    </Link>
                ) : null}
                <Link href="/" className="news-logo" aria-label="SwapNews beranda">
                    <Image className="logo-black" src="/swapnews-logo-black.png" alt="SwapNews" width={164} height={48} priority />
                    <Image className="logo-white" src="/swapnews-logo-white.png" alt="SwapNews" width={164} height={48} priority />
                    <Image className="logo-accent" src="/swapnews-logo-accent.png" alt="SwapNews" width={164} height={48} priority />
                </Link>
                <div className="desktop-ad"><small>IKLAN</small><strong>Ruang Brand Premium SwapNews</strong><span>970 × 90</span></div>
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

            <nav className="desktop-channel-nav" aria-label="Kanal berita">
                <div>
                    {PUBLIC_TOPICS.map(({ name, slug }) => (
                        <Link key={slug} href={`/kanal/${slug}`}>{name}</Link>
                    ))}
                </div>
            </nav>

            <div className="desktop-ticker">
                <strong>TRENDING</strong>
                <span>{tickerText || "Berita bergerak. Cerita tetap hidup.   •   SwapNews — Suara Wawasan Aktual Publik"}</span>
            </div>

            {categoryName ? <div className="article-kicker"><span>{categoryName}</span></div> : null}

            <nav className="news-bottom-nav" aria-label="Navigasi utama">
                <Link className="active" href="/"><Home /><span>Beranda</span></Link>
                <Link id="explore" href="/cari"><Radio /><span>Eksplor</span></Link>
                <Link id="create-news" className="create-button" href="/member/kirim-berita" aria-label="Buat berita"><Zap /></Link>
                <button id="saved-news" onClick={() => setSavedOpen(true)}><Bookmark /><span>Tersimpan</span></button>
                <Link id="profile" href="/member"><CircleUserRound /><span>Profil</span></Link>
            </nav>

            {savedOpen && (
                <aside className="saved-drawer" aria-label="Berita tersimpan">
                    <header>
                        <div><span>KOLEKSI</span><h2>Tersimpan</h2></div>
                        <button onClick={() => setSavedOpen(false)} aria-label="Tutup"><X /></button>
                    </header>
                    {savedArticles.length ? savedArticles.map((item) => (
                        <Link href={`/${item.slug}`} key={item.slug}>
                            <Image src={item.image} alt="" width={70} height={54} />
                            <strong>{item.title}</strong>
                        </Link>
                    )) : <p>Belum ada berita tersimpan.</p>}
                </aside>
            )}
        </>
    );
}
