"use client";

import { Send } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Category = { id: number; name: string };

export default function ContributorForm() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [status, setStatus] = useState("");

    useEffect(() => {
        fetch("/api/categories")
            .then((response) => response.ok ? response.json() : Promise.reject())
            .then((payload) => setCategories(payload.categories ?? []))
            .catch(() => setStatus("Kategori gagal dimuat."));
    }, []);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const body = Object.fromEntries(new FormData(form));
        setStatus("Mengirim...");
        const response = await fetch("/api/member/articles", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...body,
                originality_statement: body.originality_statement === "on",
                terms_accepted: body.terms_accepted === "on",
            }),
        });
        const payload = await response.json();
        if (!response.ok) { setStatus(payload.error || "Gagal mengirim."); return; }
        form.reset();
        setStatus("Berita terkirim dan menunggu review redaksi.");
    };

    return (
        <form className="member-form" onSubmit={(event) => void submit(event)}>
            <label>Judul berita<input id="contrib-title" name="title" required minLength={8} maxLength={160} /></label>
            <div className="member-form-grid">
                <label>Kategori<select id="contrib-category" name="category_id" required>
                    <option value="">Pilih kategori</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select></label>
                <label>Lokasi<input id="contrib-location" name="location" maxLength={120} placeholder="Kota/Kabupaten" /></label>
                <label>Tanggal kejadian<input id="contrib-date" name="event_date" type="date" /></label>
            </div>
            <label>Isi berita<textarea id="contrib-content" name="content" required minLength={300} rows={10} placeholder="Tulis berita lengkap (minimal 300 karakter)..." /></label>
            <label>Sumber/fakta pendukung<textarea id="contrib-sources" name="sources" required maxLength={1000} rows={3} placeholder="Tautan sumber, saksi, dokumen pendukung..." /></label>
            <label className="member-check"><input id="contrib-originality" name="originality_statement" type="checkbox" required /> Saya menyatakan berita ini orisinal dan bukan hasil plagiarisme.</label>
            <label className="member-check"><input id="contrib-terms" name="terms_accepted" type="checkbox" required /> Saya menyetujui Perjanjian Kontributor SwapNews.</label>
            <div className="member-form-foot"><p role="status">{status}</p><button id="contrib-submit" type="submit"><Send /> Kirim untuk review</button></div>
        </form>
    );
}
