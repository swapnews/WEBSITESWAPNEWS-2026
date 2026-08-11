"use client";

import { MessageCircle, Send } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Comment = { id: string; guest_name: string; content: string; created_at: string };

export default function ArticleComments({ articleId }: { articleId: string }) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(!articleId.startsWith("demo-"));
    const [status, setStatus] = useState("");

    useEffect(() => {
        if (articleId.startsWith("demo-")) return;
        fetch(`/api/articles/${articleId}/comments`)
            .then((response) => response.ok ? response.json() : Promise.reject())
            .then((payload) => setComments(payload.comments ?? []))
            .catch(() => setStatus("Komentar belum dapat dimuat."))
            .finally(() => setLoading(false));
    }, [articleId]);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (articleId.startsWith("demo-")) {
            setStatus("Komentar demo tidak dikirim. Terbitkan artikel di Supabase untuk mengaktifkannya.");
            return;
        }
        const form = event.currentTarget;
        const body = Object.fromEntries(new FormData(form));
        setStatus("Mengirim...");
        const response = await fetch(`/api/articles/${articleId}/comments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const payload = await response.json();
        if (!response.ok) {
            setStatus(payload.error || "Komentar gagal dikirim.");
            return;
        }
        form.reset();
        setStatus("Komentar terkirim dan menunggu moderasi redaksi.");
    };

    return (
        <section className="public-comments" aria-labelledby="comments-title">
            <div className="public-comments-head">
                <div><span>KOMUNITAS</span><h2 id="comments-title"><MessageCircle /> Komentar ({comments.length})</h2></div>
                <small>Semua komentar dimoderasi sebelum tampil.</small>
            </div>
            <form className="public-comment-form" onSubmit={(event) => void submit(event)}>
                <div className="comment-fields">
                    <label>Nama<input id="comment-name" name="name" required minLength={2} maxLength={60} autoComplete="name" /></label>
                    <label>Email<input id="comment-email" name="email" required type="email" maxLength={160} autoComplete="email" /></label>
                </div>
                <label>Komentar<textarea id="comment-content" name="content" required minLength={3} maxLength={1500} rows={4} placeholder="Tulis pendapat dengan santun..." /></label>
                <div className="comment-submit"><p role="status">{status}</p><button id="send-comment" type="submit"><Send /> Kirim komentar</button></div>
            </form>
            <div className="public-comment-list" aria-busy={loading}>
                {loading && <p>Memuat komentar...</p>}
                {!loading && comments.length === 0 && <p>Belum ada komentar approved. Jadilah pembaca pertama yang berdiskusi.</p>}
                {comments.map((comment) => <article className="public-comment" key={comment.id}>
                    <span className="comment-avatar">{comment.guest_name.slice(0, 1).toUpperCase()}</span>
                    <div><b>{comment.guest_name}</b><small>{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(comment.created_at))}</small><p>{comment.content}</p></div>
                </article>)}
            </div>
        </section>
    );
}
