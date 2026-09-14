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

function extractFullArticleSpeechText(fallbackLead?: string): string {
    const copyElement = document.getElementById("article-copy");
    if (!copyElement) {
        return fallbackLead || "";
    }

    const clone = copyElement.cloneNode(true) as HTMLElement;
    // Bersihkan elemen iklan, produk inline, baca juga, script, audio, dan tombol
    clone.querySelectorAll("script,style,aside,button,nav,iframe,svg,noscript,.ad-slot,.article-inline-read,.article-inline-product").forEach((node) => node.remove());

    // Tangani tabel: ubah sel menjadi teks kalimat terstruktur agar dibaca alami
    clone.querySelectorAll("table").forEach((table) => {
        const rows = Array.from(table.querySelectorAll("tr"));
        const tableLines: string[] = [];
        rows.forEach((tr) => {
            const cells = Array.from(tr.querySelectorAll("th, td")).map((c) => (c.textContent || "").trim()).filter(Boolean);
            if (cells.length) {
                tableLines.push(cells.join(", "));
            }
        });
        const tableText = tableLines.join(". ");
        const placeholder = document.createTextNode(tableText ? ` ${tableText}. ` : "");
        table.parentNode?.replaceChild(placeholder, table);
    });

    const raw = clone.innerText || clone.textContent || "";
    const cleanText = raw
        .replace(/\r\n|\r|\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return cleanText;
}

function chunkText(text: string, maxLength = 160): string[] {
    // Potong berdasarkan tanda baca kalimat utama (. ! ? … ; : dan koma panjang)
    const sentences = text.match(/[^.!?…;]+[.!?…;]*/g) ?? [];
    const chunks: string[] = [];
    let current = "";

    for (const sentence of sentences) {
        const clean = sentence.trim();
        if (!clean) continue;

        if (clean.length > maxLength) {
            // Jika satu kalimat sangat panjang, potong berdasarkan koma atau kata
            const clauses = clean.match(/[^,]+,*/g) ?? [clean];
            for (const clause of clauses) {
                const subClean = clause.trim();
                if (!subClean) continue;
                if ((current + " " + subClean).length > maxLength && current) {
                    chunks.push(current.trim());
                    current = subClean;
                } else {
                    current = `${current} ${subClean}`.trim();
                }
            }
        } else if ((current + " " + clean).length > maxLength && current) {
            chunks.push(current.trim());
            current = clean;
        } else {
            current = `${current} ${clean}`.trim();
        }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.filter((c) => c.length > 0);
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

        const bodyContent = extractFullArticleSpeechText(excerpt);
        // Susun teks runtut: Judul -> Ringkasan -> Isi Lengkap Berita
        const speechSegments: string[] = [];
        if (title) speechSegments.push(title);
        if (excerpt && !bodyContent.startsWith(excerpt)) speechSegments.push(excerpt);
        if (bodyContent) speechSegments.push(bodyContent);

        const fullNarrative = speechSegments.join(". ");
        const chunks = chunkText(fullNarrative);
        if (!chunks.length) return;

        const start = () => {
            synth.cancel();
            speakingRef.current = true;
            setSpeaking(true);
            const voice = pickVoice();

            // Workaround Chrome/Safari timeout issue: restart/ping synthesis loop berkala
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
            }, 10000);

            let currentChunkIndex = 0;

            const speakNext = () => {
                if (!speakingRef.current || currentChunkIndex >= chunks.length) {
                    if (currentChunkIndex >= chunks.length) stopSpeech();
                    return;
                }

                const chunkTextToSpeak = chunks[currentChunkIndex];
                const utterance = new SpeechSynthesisUtterance(chunkTextToSpeak);
                utterance.lang = "id-ID";
                utterance.rate = 0.98;
                if (voice) utterance.voice = voice;

                utterance.onend = () => {
                    currentChunkIndex++;
                    speakNext();
                };

                utterance.onerror = (event) => {
                    if (event.error === "interrupted" || event.error === "canceled") return;
                    currentChunkIndex++;
                    speakNext();
                };

                synth.speak(utterance);
            };

            speakNext();
        };

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
