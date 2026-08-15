"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";

export function AvatarUpload({ avatarUrl }: { avatarUrl: string | null }) {
    const [current, setCurrent] = useState(avatarUrl);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy(true); setError("");
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("title", `Avatar wartawan`);
            const upload = await fetch("/api/cloudinary/upload", { method: "POST", body: form });
            const data = await upload.json();
            if (!upload.ok || !data.media?.secure_url) throw new Error(data.error || "Upload gagal");
            const res = await fetch("/api/profiles/avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar_url: data.media.secure_url }) });
            const saved = await res.json();
            if (!res.ok) throw new Error(saved.error || "Gagal menyimpan avatar");
            setCurrent(data.media.secure_url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Gagal upload");
        } finally {
            setBusy(false);
        }
    }

    return <div className="avatar-upload">
        <div className="avatar-preview">
            {current ? <img src={current} alt="Avatar wartawan" /> : <span>W</span>}
        </div>
        <label className="avatar-upload-btn">
            {busy ? <Loader2 size={16} className="spin" /> : <Camera size={16} />}
            <input type="file" accept="image/*" hidden onChange={onFile} disabled={busy} />
            {busy ? "Mengunggah..." : "Ganti foto"}
        </label>
        {error && <small className="avatar-error">{error}</small>}
    </div>;
}
