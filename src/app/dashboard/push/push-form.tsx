"use client";

import { Send } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Category = { id: number; name: string };

export default function PushForm() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [target, setTarget] = useState("all");
    const [status, setStatus] = useState("");

    useEffect(() => {
        fetch("/api/categories").then((response) => response.ok ? response.json() : Promise.reject())
            .then((payload) => setCategories(payload.categories ?? [])).catch(() => setStatus("Kategori gagal dimuat."));
    }, []);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const body = Object.fromEntries(new FormData(form));
        setStatus("Mengirim...");
        const response = await fetch("/api/push/campaigns", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, target_type: target, category_id: target === "category" ? Number(body.category_id) : undefined }),
        });
        const payload = await response.json();
        if (!response.ok) { setStatus(payload.error || "Pengiriman gagal."); return; }
        form.reset();
        setStatus(`Terkirim ke ${payload.recipients} subscriber.`);
    };

    return (
        <form className="member-form" onSubmit={(event) => void submit(event)}>
            <label>Judul notifikasi<input id="push-title" name="title" required maxLength={80} /></label>
            <label>Pesan<textarea id="push-message" name="message" required maxLength={180} rows={3} /></label>
            <div className="member-form-grid">
                <label>Target<select id="push-target" value={target} onChange={(event) => setTarget(event.target.value)}>
                    <option value="all">Semua subscriber</option>
                    <option value="category">Kategori tertentu</option>
                </select></label>
                {target === "category" && <label>Kategori<select id="push-category" name="category_id" required>
                    <option value="">Pilih kategori</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select></label>}
            </div>
            <label>ID artikel (opsional)<input id="push-article" name="article_id" placeholder="UUID artikel published" /></label>
            <div className="member-form-foot"><p role="status">{status}</p><button id="push-send" type="submit"><Send /> Kirim push</button></div>
        </form>
    );
}
