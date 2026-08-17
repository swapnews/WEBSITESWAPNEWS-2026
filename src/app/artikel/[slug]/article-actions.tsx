"use client";

import { Bookmark, Check, Copy, Minus, Plus, Share2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

export default function ArticleActions({ articleId, slug, title, excerpt, copyMessage }: { articleId: string; slug: string; title: string; excerpt: string; copyMessage: string }) {
    const [saved, setSaved] = useState(false);
    const [scale, setScale] = useState(1);
    const [speaking, setSpeaking] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const savedSlugs: string[] = JSON.parse(localStorage.getItem("swapnews-bookmarks") || "[]");
        const timer = window.setTimeout(() => setSaved(savedSlugs.includes(slug)), 0);

        if (!articleId.startsWith("demo-")) {
            void fetch("/api/member/reading-history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ article_id: articleId }),
            }).catch(() => undefined);
        }
        return () => window.clearTimeout(timer);
    }, [articleId, slug]);

    useEffect(() => {
        document.documentElement.style.setProperty("--article-scale", String(scale));
        return () => {
            document.documentElement.style.removeProperty("--article-scale");
        };
    }, [scale]);

    const toggleSave = () => {
        const savedSlugs: string[] = JSON.parse(localStorage.getItem("swapnews-bookmarks") || "[]");
        const next = saved ? savedSlugs.filter((item) => item !== slug) : [...new Set([...savedSlugs, slug])];
        localStorage.setItem("swapnews-bookmarks", JSON.stringify(next));
        setSaved(!saved);
    };

    const copyPayload = () => `${title}\n\n${excerpt}\n\nSource: ${window.location.href}\n${copyMessage}`;

    const share = async () => {
        const url = window.location.href;
        if (navigator.share) {
            await navigator.share({ title, text: excerpt, url });
            return;
        }
        await navigator.clipboard.writeText(copyPayload());
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    const copy = async () => {
        await navigator.clipboard.writeText(copyPayload());
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    const toggleSpeech = () => {
        if (!("speechSynthesis" in window)) return;
        if (speaking) {
            speechSynthesis.cancel();
            setSpeaking(false);
            return;
        }
        const text = document.getElementById("article-copy")?.textContent || title;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "id-ID";
        utterance.rate = 0.94;
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        speechSynthesis.speak(utterance);
        setSpeaking(true);
    };

    return (
        <div className="public-article-actions" aria-label="Aksi artikel">
            <button id="article-share" onClick={() => void share()}><Share2 /> Bagikan</button>
            <button id="article-copy-link" onClick={() => void copy()}>{copied ? <Check /> : <Copy />} {copied ? "Tersalin" : "Salin"}</button>
            <button id="article-bookmark" className={saved ? "active" : ""} onClick={toggleSave}><Bookmark fill={saved ? "currentColor" : "none"} /> {saved ? "Tersimpan" : "Simpan"}</button>
            <button id="article-tts" className={speaking ? "active" : ""} onClick={toggleSpeech}>{speaking ? <VolumeX /> : <Volume2 />} {speaking ? "Berhenti" : "Dengarkan"}</button>
            <span className="font-controls" aria-label="Ukuran teks">
                <button id="article-font-decrease" aria-label="Perkecil teks" onClick={() => setScale((value) => Math.max(0.88, value - 0.08))}><Minus /></button>
                <b>Aa</b>
                <button id="article-font-increase" aria-label="Perbesar teks" onClick={() => setScale((value) => Math.min(1.28, value + 0.08))}><Plus /></button>
            </span>
        </div>
    );
}
