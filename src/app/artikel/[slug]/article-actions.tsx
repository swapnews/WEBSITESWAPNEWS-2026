"use client";

import { Bookmark, Check, Copy, Minus, Plus, Share2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const FONT_SCALE_KEY = "swapnews-article-scale";
const MIN_SCALE = 0.88;
const MAX_SCALE = 1.28;

function applyScale(scale: number) {
    // Set pada shell artikel; .public-article-copy memakai var(--article-scale)
    const shell = document.querySelector<HTMLElement>(".public-article-shell");
    const target = shell ?? document.documentElement;
    target.style.setProperty("--article-scale", String(scale));
}

function extractSpeechText(): string {
    const clone = document.getElementById("article-copy")?.cloneNode(true) as HTMLElement | null;
    if (!clone) return "";
    clone.querySelectorAll("script,style,aside,button,nav").forEach((node) => node.remove());
    return (clone.innerText || clone.textContent || "")
        .replace(/\s+/g, " ")
        .trim();
}

function chunkText(text: string, maxLength = 200): string[] {
    const sentences = text.match(/[^.!?…]+[.!?…]*/g) ?? [];
    const chunks: string[] = [];
    let current = "";
    for (const sentence of sentences) {
        const clean = sentence.trim();
        if (!clean) continue;
        if ((current + " " + clean).length > maxLength && current) {
            chunks.push(current.trim());
            current = clean;
        } else {
            current = `${current} ${clean}`.trim();
        }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length ? chunks : (text.length ? [text.slice(0, maxLength)] : []);
}

export default function ArticleActions({ articleId, slug, title, excerpt, copyMessage }: { articleId: string; slug: string; title: string; excerpt: string; copyMessage: string }) {
    const [saved, setSaved] = useState(false);
    const [scale, setScale] = useState(() => {
        if (typeof window === "undefined") return 1;
        const stored = Number.parseFloat(window.localStorage.getItem(FONT_SCALE_KEY) || "1");
        return Number.isNaN(stored) ? 1 : Math.min(MAX_SCALE, Math.max(MIN_SCALE, stored));
    });
    const [speaking, setSpeaking] = useState(false);
    const [copied, setCopied] = useState(false);
    const speakingRef = useRef(false);
    const keepAliveRef = useRef<number | null>(null);

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
        const stopKeepAlive = () => {
            if (keepAliveRef.current !== null) {
                window.clearInterval(keepAliveRef.current);
                keepAliveRef.current = null;
            }
        };
        return () => {
            speakingRef.current = false;
            stopKeepAlive();
            if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        };
    }, []);

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

    const pickVoice = (): SpeechSynthesisVoice | undefined => {
        const voices = window.speechSynthesis.getVoices();
        return (
            voices.find((voice) => voice.lang === "id-ID" && /google/i.test(voice.name)) ||
            voices.find((voice) => voice.lang === "id-ID") ||
            voices.find((voice) => voice.lang.toLowerCase().startsWith("id")) ||
            voices.find((voice) => /indones/i.test(voice.name))
        );
    };

    const stopSpeech = () => {
        speakingRef.current = false;
        if (keepAliveRef.current !== null) {
            window.clearInterval(keepAliveRef.current);
            keepAliveRef.current = null;
        }
        window.speechSynthesis.cancel();
        setSpeaking(false);
    };

    const toggleSpeech = () => {
        if (!("speechSynthesis" in window)) return;
        const synth = window.speechSynthesis;

        if (speaking) {
            stopSpeech();
            return;
        }

        const rawText = extractSpeechText();
        const fullText = rawText ? `${title}. ${rawText}` : title;
        const chunks = chunkText(fullText);
        if (!chunks.length) return;

        const start = () => {
            synth.cancel();
            speakingRef.current = true;
            setSpeaking(true);
            const voice = pickVoice();
            // Workaround Chrome: speech berhenti jika tidak ada interaksi ~15 detik
            if (keepAliveRef.current !== null) window.clearInterval(keepAliveRef.current);
            keepAliveRef.current = window.setInterval(() => {
                if (!speakingRef.current || synth.paused || !synth.speaking) {
                    if (keepAliveRef.current !== null) {
                        window.clearInterval(keepAliveRef.current);
                        keepAliveRef.current = null;
                    }
                    return;
                }
                synth.pause();
                synth.resume();
            }, 12000);

            const speakChunk = (index: number) => {
                if (!speakingRef.current || index >= chunks.length) {
                    if (index >= chunks.length) stopSpeech();
                    return;
                }
                const utterance = new SpeechSynthesisUtterance(chunks[index]);
                utterance.lang = "id-ID";
                utterance.rate = 0.96;
                if (voice) utterance.voice = voice;
                utterance.onend = () => speakChunk(index + 1);
                utterance.onerror = (event) => {
                    if (event.error === "interrupted" || event.error === "canceled") return;
                    speakChunk(index + 1);
                };
                synth.speak(utterance);
            };
            speakChunk(0);
        };

        // Voices sering dimuat secara asinkron; mulai saat tersedia
        if (synth.getVoices().length > 0) {
            start();
        } else {
            const onVoicesChanged = () => {
                synth.removeEventListener("voiceschanged", onVoicesChanged);
                start();
            };
            synth.addEventListener("voiceschanged", onVoicesChanged);
            window.setTimeout(() => {
                synth.removeEventListener("voiceschanged", onVoicesChanged);
                if (speakingRef.current || synth.speaking) return;
                start();
            }, 600);
        }
    };

    return (
        <div className="public-article-actions" aria-label="Aksi artikel">
            <button id="article-share" onClick={() => void share()}><Share2 /> Bagikan</button>
            <button id="article-copy-link" onClick={() => void copy()}>{copied ? <Check /> : <Copy />} {copied ? "Tersalin" : "Salin"}</button>
            <button id="article-bookmark" className={saved ? "active" : ""} onClick={toggleSave}><Bookmark fill={saved ? "currentColor" : "none"} /> {saved ? "Tersimpan" : "Simpan"}</button>
            <button id="article-tts" className={speaking ? "active" : ""} onClick={toggleSpeech}>{speaking ? <VolumeX /> : <Volume2 />} {speaking ? "Berhenti" : "Dengarkan"}</button>
            <span className="font-controls" aria-label="Ukuran teks">
                <button id="article-font-decrease" aria-label="Perkecil teks" onClick={() => changeScale(-0.08)}><Minus /></button>
                <b>Aa</b>
                <button id="article-font-increase" aria-label="Perbesar teks" onClick={() => changeScale(0.08)}><Plus /></button>
            </span>
        </div>
    );
}
