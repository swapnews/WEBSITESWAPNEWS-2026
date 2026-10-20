"use client";

import { Bookmark, Check, Copy, Minus, Plus, Share2, Volume2, Pause, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ArticleSpeechQueue, INITIAL_SPEECH_STATE } from "@/lib/article-speech-queue";
import { extractArticleSpeechText } from "@/lib/speech-text";
import "@/styles/article-speech.css";

const FONT_SCALE_KEY = "swapnews-article-scale";
const MIN_SCALE = 0.88;
const MAX_SCALE = 1.28;

function applyScale(scale: number) {
    // Set pada shell artikel; .public-article-copy memakai var(--article-scale)
    const shell = document.querySelector<HTMLElement>(".public-article-shell");
    const target = shell ?? document.documentElement;
    target.style.setProperty("--article-scale", String(scale));
}

export default function ArticleActions({ articleId, slug, title, excerpt, copyMessage }: { articleId: string; slug: string; title: string; excerpt: string; copyMessage: string }) {
    const [saved, setSaved] = useState(false);
    const [scale, setScale] = useState(() => {
        if (typeof window === "undefined") return 1;
        const stored = Number.parseFloat(window.localStorage.getItem(FONT_SCALE_KEY) || "1");
        return Number.isNaN(stored) ? 1 : Math.min(MAX_SCALE, Math.max(MIN_SCALE, stored));
    });
    const [speech, setSpeech] = useState(INITIAL_SPEECH_STATE);
    const queueRef = useRef<ArticleSpeechQueue | null>(null);
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
        applyScale(scale);
        localStorage.setItem(FONT_SCALE_KEY, String(scale));
        return () => {
            const shell = document.querySelector<HTMLElement>(".public-article-shell");
            (shell ?? document.documentElement).style.removeProperty("--article-scale");
        };
    }, [scale]);

    useEffect(() => {
        if (!("speechSynthesis" in window)) return;
        const queue = new ArticleSpeechQueue({
            synth: window.speechSynthesis,
            utterance: (text) => new SpeechSynthesisUtterance(text),
            later: (callback, delay) => setTimeout(callback, delay),
            clear: (timer) => clearTimeout(timer),
            now: () => performance.now(),
            hidden: () => document.hidden,
        }, setSpeech);
        queueRef.current = queue;
        const onVisibility = () => queue.visibilityChanged();
        const onPageHide = () => queue.pause();
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pagehide", onPageHide);
        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener("pagehide", onPageHide);
            queue.dispose();
            queueRef.current = null;
        };
    }, [slug]);

    const changeScale = (delta: number) => setScale((value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number((value + delta).toFixed(2)))));

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

    const startSpeech = () => {
        const queue = queueRef.current;
        if (!queue) {
            setSpeech({ ...INITIAL_SPEECH_STATE, status: "error", error: "Browser ini belum mendukung pembacaan suara. Gunakan Chrome, Edge, atau Safari terbaru." });
            return;
        }
        const body = extractArticleSpeechText(document.getElementById("article-copy"), excerpt);
        const parts = [title];
        if (excerpt && !body.startsWith(excerpt)) parts.push(excerpt);
        if (body) parts.push(body);
        queue.start(parts.filter(Boolean).join(". "));
    };
    const toggleSpeech = () => {
        if (speech.status === "playing") queueRef.current?.pause();
        else if ((speech.status === "paused" || speech.status === "error") && speech.total > 0) queueRef.current?.resume();
        else startSpeech();
    };
    const speaking = speech.status === "playing";
    const speechLabel = speaking ? "Jeda" : speech.status === "paused" ? "Lanjutkan" : speech.status === "error" ? "Coba lagi" : speech.status === "complete" ? "Putar ulang" : "Dengarkan";

    return (
        <div className="article-tools">
        <div className="public-article-actions" aria-label="Aksi artikel">
            <button id="article-share" onClick={() => void share()}><Share2 /> Bagikan</button>
            <button id="article-copy-link" onClick={() => void copy()}>{copied ? <Check /> : <Copy />} {copied ? "Tersalin" : "Salin"}</button>
            <button id="article-bookmark" className={saved ? "active" : ""} onClick={toggleSave}><Bookmark fill={saved ? "currentColor" : "none"} /> {saved ? "Tersimpan" : "Simpan"}</button>
            <button id="article-tts" className={speaking ? "active" : ""} onClick={toggleSpeech} aria-pressed={speaking} aria-controls="article-speech-status">{speaking ? <Pause /> : <Volume2 />} {speechLabel}</button>
            <span className="font-controls" aria-label="Ukuran teks">
                <button id="article-font-decrease" aria-label="Perkecil teks" onClick={() => changeScale(-0.08)}><Minus /></button>
                <b>Aa</b>
                <button id="article-font-increase" aria-label="Perbesar teks" onClick={() => changeScale(0.08)}><Plus /></button>
            </span>
        </div>
        <div id="article-speech-status" className="article-speech-status">
            {speech.total > 0 && <div className="article-speech-progress"><progress aria-label="Progres pembacaan artikel" max={speech.total} value={speech.completed} /><span>{speech.status === "complete" ? "Pembacaan selesai" : `${speech.completed} / ${speech.total} bagian selesai`}</span>{speech.status !== "complete" && <button id="article-tts-restart" type="button" onClick={startSpeech}><RotateCcw size={13} />Mulai ulang</button>}</div>}
            <p role="status" aria-live="polite">{speech.error || (speech.status === "paused" ? "Dijeda. Lanjutkan dari bagian terakhir; bagian itu akan dibaca ulang agar tidak terlewat." : speech.status === "complete" ? "Seluruh teks artikel sudah dibacakan." : speaking ? "Membaca artikel. Biarkan halaman tetap terbuka." : "")}</p>
        </div>
        </div>
    );
}
