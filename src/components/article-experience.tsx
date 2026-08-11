"use client";

import { ArrowUp, Focus, ListTree, X } from "lucide-react";
import { useEffect, useState } from "react";

export default function ArticleExperience({ slug, headings }: { slug: string; headings: string[] }) {
    const [progress, setProgress] = useState(0);
    const [focus, setFocus] = useState(false);
    const [tocOpen, setTocOpen] = useState(false);
    useEffect(() => {
        localStorage.setItem("swapnews-last-read", slug);
        const update = () => { const max = document.documentElement.scrollHeight - innerHeight; setProgress(max > 0 ? Math.min(100, scrollY / max * 100) : 0); };
        update(); addEventListener("scroll", update, { passive: true });
        return () => removeEventListener("scroll", update);
    }, [slug]);
    useEffect(() => { document.body.classList.toggle("article-focus-mode", focus); return () => document.body.classList.remove("article-focus-mode"); }, [focus]);
    return <>
        <div className="article-progress" aria-label={`Progres membaca ${Math.round(progress)} persen`}><i style={{ width: `${progress}%` }} /></div>
        <div className="article-experience-dock">
            <button onClick={() => setFocus(!focus)} className={focus ? "active" : ""}><Focus /><span>{focus ? "Keluar fokus" : "Mode fokus"}</span></button>
            {headings.length > 0 && <button onClick={() => setTocOpen(!tocOpen)}><ListTree /><span>Daftar isi</span></button>}
            <button onClick={() => scrollTo({ top: 0, behavior: "smooth" })}><ArrowUp /><span>Ke atas</span></button>
        </div>
        {tocOpen && <aside className="article-toc"><header><div><small>NAVIGASI ARTIKEL</small><h2>Daftar Isi</h2></div><button onClick={() => setTocOpen(false)}><X /></button></header>{headings.map((heading, index) => <a href={`#article-section-${index + 1}`} onClick={() => setTocOpen(false)} key={`${heading}-${index}`}><b>{String(index + 1).padStart(2, "0")}</b>{heading}</a>)}</aside>}
    </>;
}
