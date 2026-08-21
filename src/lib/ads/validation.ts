import type { AdContentType } from "./types";

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const MAX_HTML_LENGTH = 50_000;
const MAX_YOUTUBE_INPUT_LENGTH = 2_000;

export type ValidatedAdInput = {
    content_type: AdContentType;
    html_content: string;
    youtube_url: string | null;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
};

export type AdValidationResult =
    | { ok: true; data: ValidatedAdInput }
    | { ok: false; message: string };

function formText(formData: FormData, key: string) {
    const raw = formData.get(key);
    return typeof raw === "string" ? raw.trim() : "";
}

export function extractYouTubeId(input: string): string | null {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length > MAX_YOUTUBE_INPUT_LENGTH) return null;

    const iframeSource = trimmed.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    const candidate = iframeSource ?? trimmed;

    try {
        const url = new URL(candidate);
        const host = url.hostname.toLowerCase().replace(/^www\./, "");
        let id = "";

        if (host === "youtu.be") {
            id = url.pathname.split("/").filter(Boolean)[0] ?? "";
        } else if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
            if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
            else id = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/)?.[1] ?? "";
        }

        return YOUTUBE_ID.test(id) ? id : null;
    } catch {
        return YOUTUBE_ID.test(candidate) ? candidate : null;
    }
}

export function youtubeWatchUrl(input: string): string | null {
    const id = extractYouTubeId(input);
    return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

export function youtubeEmbedUrl(input: string): string | null {
    const id = extractYouTubeId(input);
    return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : null;
}

function optionalIsoDate(value: string): string | null | undefined {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function validateAdForm(formData: FormData): AdValidationResult {
    const contentType = formText(formData, "content_type");
    if (contentType !== "html" && contentType !== "youtube") {
        return { ok: false, message: "Tipe materi iklan tidak valid." };
    }

    const htmlContent = formText(formData, "html_content");
    if (htmlContent.length > MAX_HTML_LENGTH) {
        return { ok: false, message: "HTML iklan maksimal 50.000 karakter." };
    }

    const youtubeInput = formText(formData, "youtube_url");
    const canonicalYoutubeUrl = youtubeInput ? youtubeWatchUrl(youtubeInput) : null;
    if (contentType === "youtube" && youtubeInput && !canonicalYoutubeUrl) {
        return { ok: false, message: "URL atau kode iframe YouTube tidak valid." };
    }

    const startsAt = optionalIsoDate(formText(formData, "starts_at"));
    const endsAt = optionalIsoDate(formText(formData, "ends_at"));
    if (startsAt === undefined || endsAt === undefined) {
        return { ok: false, message: "Tanggal jadwal iklan tidak valid." };
    }
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
        return { ok: false, message: "Waktu selesai harus setelah waktu mulai." };
    }

    const isActive = formData.get("is_active") === "on";
    if (isActive && contentType === "html" && !htmlContent) {
        return { ok: false, message: "Isi HTML wajib diisi sebelum slot diaktifkan." };
    }
    if (isActive && contentType === "youtube" && !canonicalYoutubeUrl) {
        return { ok: false, message: "Video YouTube wajib diisi sebelum slot diaktifkan." };
    }

    return {
        ok: true,
        data: {
            content_type: contentType,
            html_content: contentType === "html" ? htmlContent : "",
            youtube_url: contentType === "youtube" ? canonicalYoutubeUrl : null,
            is_active: isActive,
            starts_at: startsAt,
            ends_at: endsAt,
        },
    };
}
