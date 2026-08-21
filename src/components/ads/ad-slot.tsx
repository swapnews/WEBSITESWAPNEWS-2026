"use client";

import { useEffect, useState } from "react";

import type { AdSlot } from "@/lib/ads/types";
import { youtubeEmbedUrl } from "@/lib/ads/validation";

const HTML_CSP = [
    "default-src 'none'",
    "img-src https: data:",
    "style-src 'unsafe-inline' https:",
    "font-src https: data:",
    "media-src https:",
    "connect-src 'none'",
    "script-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
].join("; ");

let adsAllowed: boolean | null = null;
let eligibilityRequest: Promise<boolean> | null = null;

function mayShowAds() {
    if (adsAllowed !== null) return Promise.resolve(adsAllowed);
    if (!eligibilityRequest) {
        eligibilityRequest = fetch("/api/ads/eligibility", { credentials: "same-origin", cache: "no-store" })
            .then((response) => response.ok ? response.json() : { showAds: true })
            .then((result: { showAds?: boolean }) => result.showAds !== false)
            .catch(() => true)
            .then((result) => {
                adsAllowed = result;
                return result;
            });
    }
    return eligibilityRequest;
}

function htmlDocument(content: string) {
    const safeContent = content.replace(/<\/style/gi, "<\\/style");
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${HTML_CSP}"><base target="_blank"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}body{display:grid;place-items:center;font-family:Arial,sans-serif}img,video,svg{max-width:100%;max-height:100%;object-fit:contain}a{display:inline-flex;max-width:100%;max-height:100%}</style></head><body>${safeContent}</body></html>`;
}

export function AdSlotFrame({ slot, preview = false }: { slot?: AdSlot | null; preview?: boolean }) {
    const [eligible, setEligible] = useState(preview ? true : adsAllowed);

    useEffect(() => {
        if (preview || eligible !== null) return;
        let active = true;
        void mayShowAds().then((result) => { if (active) setEligible(result); });
        return () => { active = false; };
    }, [eligible, preview]);

    if (!slot || !slot.is_active || eligible !== true) return null;

    const youtubeUrl = slot.content_type === "youtube" && slot.youtube_url
        ? youtubeEmbedUrl(slot.youtube_url)
        : null;
    if (slot.content_type === "youtube" && !youtubeUrl) return null;
    if (slot.content_type === "html" && !slot.html_content.trim()) return null;

    const cssVars = {
        "--ad-desktop-width": `${slot.desktop_width}px`,
        "--ad-desktop-height": `${slot.desktop_height}px`,
        "--ad-mobile-width": `${slot.mobile_width}px`,
        "--ad-mobile-height": `${slot.mobile_height}px`,
    } as React.CSSProperties;

    return <aside className={`managed-ad${preview ? " managed-ad-preview" : ""}`} style={cssVars} aria-label={`Iklan: ${slot.name}`}>
        <span className="managed-ad-label">IKLAN</span>
        <div className="managed-ad-frame">
            {youtubeUrl ? <iframe
                src={youtubeUrl}
                title={`Video iklan ${slot.name}`}
                loading="lazy"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
            /> : <iframe
                srcDoc={htmlDocument(slot.html_content)}
                title={`Materi iklan ${slot.name}`}
                loading="lazy"
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
            />}
        </div>
    </aside>;
}
