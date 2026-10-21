"use client";

import { ArrowUp, Check, Focus, House, ListTree, Share2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ArticleExperience({
    slug,
    title,
    headings,
}: {
    slug: string;
    title?: string;
    headings: string[];
}) {
    const [progress, setProgress] = useState(0);
    const [focus, setFocus] = useState(false);
    const [tocOpen, setTocOpen] = useState(false);
    const [shared, setShared] = useState(false);

    useEffect(() => {
        localStorage.setItem("swapnews-last-read", slug);
        const update = () => {
            const max = document.documentElement.scrollHeight - innerHeight;
            setProgress(max > 0 ? Math.min(100, (scrollY / max) * 100) : 0);
        };
        update();
        addEventListener("scroll", update, { passive: true });
        return () => removeEventListener("scroll", update);
    }, [slug]);

    useEffect(() => {
        document.body.classList.toggle("article-focus-mode", focus);
        return () => document.body.classList.remove("article-focus-mode");
    }, [focus]);

    const handleShare = async () => {
        const url = typeof window !== "undefined" ? window.location.href : `https://swapnews.co.id/${slug}`;
        const shareData = {
            title: title || "SwapNews",
            url,
        };
        if (typeof navigator !== "undefined" && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                return;
            } catch {
                // fall through to clipboard
            }
        }
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(url);
                setShared(true);
                setTimeout(() => setShared(false), 2000);
            } catch (err) {
                console.error("Clipboard copy failed", err);
            }
        }
    };

    return (
        <>
            <div className="article-progress" aria-label={`Progres membaca ${Math.round(progress)} persen`}>
                <i style={{ width: `${progress}%` }} />
            </div>
            <nav className="article-experience-dock" aria-label="Navigasi membaca">
                <Link href="/" className="dock-btn" aria-label="Kembali ke Beranda" title="Beranda">
                    <House />
                    <span>Beranda</span>
                </Link>
                <button
                    onClick={() => setFocus(!focus)}
                    className={focus ? "dock-btn active" : "dock-btn"}
                    aria-label={focus ? "Keluar fokus" : "Mode fokus"}
                    title={focus ? "Keluar fokus" : "Mode fokus"}
                    aria-pressed={focus}
                >
                    <Focus />
                    <span>{focus ? "Keluar fokus" : "Mode fokus"}</span>
                </button>
                {headings.length > 0 && (
                    <button
                        onClick={() => setTocOpen(!tocOpen)}
                        className={tocOpen ? "dock-btn active" : "dock-btn"}
                        aria-label="Buka Daftar Isi"
                        title="Daftar Isi"
                        aria-expanded={tocOpen}
                    >
                        <ListTree />
                        <span>Daftar isi</span>
                    </button>
                )}
                <button
                    onClick={handleShare}
                    className={shared ? "dock-btn shared" : "dock-btn"}
                    aria-label="Bagikan artikel"
                    title="Bagikan artikel"
                >
                    {shared ? <Check /> : <Share2 />}
                    <span>{shared ? "Tersalin!" : "Bagikan"}</span>
                </button>
                <button
                    onClick={() => scrollTo({ top: 0, behavior: "smooth" })}
                    className="dock-btn"
                    aria-label="Scroll ke atas"
                    title="Ke atas"
                >
                    <ArrowUp />
                    <span>Ke atas</span>
                </button>
            </nav>
            {tocOpen && (
                <aside className="article-toc" aria-label="Daftar Isi">
                    <header>
                        <div>
                            <small>NAVIGASI ARTIKEL</small>
                            <h2>Daftar Isi</h2>
                        </div>
                        <button onClick={() => setTocOpen(false)} aria-label="Tutup daftar isi">
                            <X />
                        </button>
                    </header>
                    {headings.map((heading, index) => (
                        <a
                            href={`#article-section-${index + 1}`}
                            onClick={() => setTocOpen(false)}
                            key={`${heading}-${index}`}
                        >
                            <b>{String(index + 1).padStart(2, "0")}</b>
                            {heading}
                        </a>
                    ))}
                </aside>
            )}
        </>
    );
}
