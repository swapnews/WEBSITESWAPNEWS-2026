"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import "@/styles/avatar-upload.css";

async function preparePhoto(file: File): Promise<File> {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
        const side = Math.min(bitmap.width, bitmap.height);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = Math.min(side, 768);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Browser tidak dapat memproses foto. Coba browser lain.");
        context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
            (result) => result ? resolve(result) : reject(new Error("Foto tidak dapat diproses.")), "image/webp", 0.86,
        ));
        return new File([blob], "foto-profil.webp", { type: blob.type });
    } finally {
        bitmap.close();
    }
}

export function AvatarUpload({ avatarUrl, name = "Pengguna" }: { avatarUrl: string | null; name?: string }) {
    const router = useRouter();
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const requestRef = useRef<AbortController | null>(null);
    const [savedUrl, setSavedUrl] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const current = preview ?? savedUrl ?? avatarUrl;
    const initial = name.trim().charAt(0).toUpperCase() || "S";

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
    useEffect(() => () => requestRef.current?.abort(), []);

    async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file || requestRef.current) return;
        setError(""); setSuccess("");
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Pilih foto JPG, PNG, atau WebP."); return; }
        if (file.size > 10 * 1024 * 1024) { setError("Ukuran foto maksimal 10 MB sebelum optimasi."); return; }
        const controller = new AbortController();
        requestRef.current = controller;
        setBusy(true);
        setPreview(URL.createObjectURL(file));
        const timer = window.setTimeout(() => controller.abort(), 60000);
        try {
            const photo = await preparePhoto(file);
            if (controller.signal.aborted) throw new Error("Waktu unggah habis. Coba lagi.");
            const form = new FormData();
            form.append("file", photo);
            const response = await fetch("/api/profiles/avatar", { method: "POST", body: form, signal: controller.signal });
            const data = await response.json().catch(() => null) as { error?: string; avatar_url?: string } | null;
            if (!response.ok || !data?.avatar_url) throw new Error(data?.error || "Foto belum tersimpan. Coba lagi.");
            setSavedUrl(data.avatar_url);
            setSuccess("Foto profil berhasil diperbarui.");
            router.refresh();
        } catch (uploadError) {
            setError(controller.signal.aborted ? "Waktu unggah habis. Periksa koneksi lalu pilih ulang foto." : uploadError instanceof Error ? uploadError.message : "Gagal mengunggah foto.");
        } finally {
            window.clearTimeout(timer);
            requestRef.current = null;
            setPreview(null);
            setBusy(false);
        }
    }

    return <div className="avatar-upload" aria-busy={busy}>
        <div className="avatar-preview">
            {current && current !== failedUrl ? <Image src={current} alt={`Foto profil ${name}`} width={160} height={160} unoptimized onError={() => setFailedUrl(current)} /> : <span aria-label={name}>{initial}</span>}
        </div>
        <input ref={inputRef} id={`${id}-photo`} className="avatar-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} disabled={busy} aria-describedby={`${id}-help ${id}-status`} />
        <button id={`${id}-choose-photo`} type="button" className="avatar-upload-btn" onClick={() => inputRef.current?.click()} disabled={busy} aria-controls={`${id}-photo`}>
            {busy ? <Loader2 size={16} className="spin" /> : <Camera size={16} />}{busy ? "Menyimpan..." : "Ganti foto"}
        </button>
        <small id={`${id}-help`} className="avatar-help">JPG, PNG, WebP · maks. 10 MB</small>
        <div id={`${id}-status`} className="avatar-status" aria-live="polite">
            {error && <small className="avatar-error" role="alert">{error}</small>}
            {success && <small className="avatar-success"><CheckCircle2 size={13} />{success}</small>}
        </div>
    </div>;
}
