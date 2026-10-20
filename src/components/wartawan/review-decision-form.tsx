"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { reviewMemberArticleAction } from "@/lib/wartawan/review-actions";
import type { ReviewDecision } from "@/lib/editorial-review";

function ReviewSubmit() {
    const { pending } = useFormStatus();
    return <button id="submit-independent-review" type="submit" className="primary-button" disabled={pending} aria-busy={pending}>{pending ? "Menyimpan keputusan…" : "Simpan keputusan"}</button>;
}

export function ReviewDecisionForm({ id, version, published }: { id: string; version: number; published: boolean }) {
    const [decision, setDecision] = useState<ReviewDecision>("published");
    return <form action={reviewMemberArticleAction} className="independent-review-form">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="version" value={version} />
        <label htmlFor="independent-review-decision">Keputusan editorial</label>
        <select id="independent-review-decision" name="decision" value={decision} onChange={event => setDecision(event.target.value as ReviewDecision)}>
            <option value="published">{published ? "Setujui berita terbit" : "Setujui & publikasikan"}</option>
            <option value="revision">Minta revisi</option><option value="rejected">Tolak</option>
        </select>
        <label htmlFor="independent-review-note">Catatan editorial {decision !== "published" ? "(wajib)" : "(opsional)"}</label>
        <textarea id="independent-review-note" name="note" rows={5} maxLength={2000} required={decision !== "published"} aria-describedby="independent-review-help" />
        <p id="independent-review-help">Persetujuan memberi 10 poin kepada penulis, maksimal sekali per artikel. Revisi/penolakan memberi 0 poin{published ? " dan menurunkan artikel dari tayangan publik" : ""}.</p>
        <label className="review-confirm"><input id="independent-review-confirm" type="checkbox" required /> Saya sudah membaca isi lengkap dan memeriksa kelayakan berita ini.</label>
        <ReviewSubmit />
    </form>;
}
