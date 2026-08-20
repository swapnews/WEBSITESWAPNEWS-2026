"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";

export function AvatarUpload({ avatarUrl, name = "Pengguna" }: { avatarUrl: string | null; name?: string }) {
    const router = useRouter();
    const [current, setCurrent] = useState(avatarUrl);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const initial = name.trim().charAt(0).toUpperCase() || "S";

    async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;
        setError(""); setSuccess("");
        if (!file.type.startsWith("image/")) { setError("Pilih file gambar."); return; }
        if (file.size > 5 * 1024 * 1024) { setError("Ukuran foto maksimal 5 MB."); return; }

        setBusy(true);
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("title", `Foto profile ${name}`);
            form.append("alt_text", `Foto profile ${name}`);
            const upload = await fetch("/api/cloudinary/upload", { method: "POST", body: form });
            const data = await upload.json();
            if (!upload.ok || !data.media?.secure_url) throw new Error(data.error || "Upload gagal");
            const response = await fetch("/api/profiles/avatar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatar_url: data.media.secure_url }),
            });
            const saved = await response.json();
            if (!response.ok) throw new Error(saved.error || "Gagal menyimpan foto");
            setCurrent(data.media.secure_url);
            setSuccess("Foto diperbarui");
            router.refresh();
        } catch (uploadError) {
            setError(uploadError instanceof Error ? uploadError.message : "Gagal upload");
        } finally {
            setBusy(false);
            event.target.value = "";
        }
    }

    return <div className="avatar-upload">
        <div className="avatar-preview">
            {current ? <Image src={current} alt={`Foto profile ${name}`} width={160} height={160} unoptimized /> : <span>{initial}</span>}
        </div>
        <label className="avatar-upload-btn">
            {busy ? <Loader2 size={16} className="spin" /> : <Camera size={16} />}
            <input id="profile-photo-input" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} disabled={busy} />
            {busy ? "Mengunggah..." : "Ganti foto"}
        </label>
        {error && <small className="avatar-error" role="alert">{error}</small>}
        {success && <small className="avatar-success"><CheckCircle2 size={11} /> {success}</small>}
    </div>;
}

