"use client";

import Link from "next/link";
import { useState } from "react";
import { FileEdit, Trash2 } from "lucide-react";

import { deleteArticleAction, deleteBulkArticlesAction } from "@/lib/articles/actions";
import type { ArticleStatus } from "@/lib/articles";

type ArticleItem = {
    id: string;
    slug: string;
    title: string;
    status: ArticleStatus;
    updated_at: string;
    author_name?: string | null;
    category_name?: string | null;
};

type ArticlesTableClientProps = {
    articles: ArticleItem[];
    canDelete: boolean;
    statusLabels: Record<ArticleStatus, string>;
    statusColors: Record<ArticleStatus, string>;
};

export function ArticlesTableClient({
    articles,
    canDelete,
    statusLabels,
    statusColors,
}: ArticlesTableClientProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const allIds = articles.map((a) => a.id);
    const isAllSelected = articles.length > 0 && selectedIds.length === articles.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(allIds);
        }
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleBulkDeleteSubmit = (e: React.FormEvent) => {
        if (typeof window !== "undefined") {
            const ok = confirm(`Yakin ingin menghapus ${selectedIds.length} artikel terpilih? Tindakan ini tidak dapat dibatalkan.`);
            if (!ok) e.preventDefault();
        }
    };

    const handleSingleDeleteSubmit = (e: React.FormEvent, title: string) => {
        if (typeof window !== "undefined") {
            const ok = confirm(`Yakin ingin menghapus artikel "${title}"?`);
            if (!ok) e.preventDefault();
        }
    };

    return (
        <div>
            {canDelete && selectedIds.length > 0 ? (
                <div
                    style={{
                        padding: "12px 16px",
                        marginBottom: 16,
                        borderRadius: 12,
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                    }}
                >
                    <div style={{ fontWeight: 600, color: "#991b1b" }}>
                        {selectedIds.length} artikel terpilih
                    </div>
                    <form action={deleteBulkArticlesAction} onSubmit={handleBulkDeleteSubmit}>
                        <input type="hidden" name="ids" value={selectedIds.join(",")} />
                        <button
                            type="submit"
                            className="secondary-button danger"
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 13 }}
                        >
                            <Trash2 size={15} /> Hapus {selectedIds.length} Artikel Terpilih
                        </button>
                    </form>
                </div>
            ) : null}

            <div className="cms-table-wrap">
                <table className="cms-table">
                    <thead>
                        <tr>
                            {canDelete ? (
                                <th style={{ width: 40, textAlign: "center" }}>
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={toggleSelectAll}
                                        aria-label="Pilih semua artikel"
                                        style={{ cursor: "pointer", width: 16, height: 16 }}
                                    />
                                </th>
                            ) : null}
                            <th>Judul & Slug</th>
                            <th>Status</th>
                            <th>Penulis</th>
                            <th>Kategori</th>
                            <th>Update</th>
                            <th style={{ textAlign: "right" }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {articles.length === 0 ? (
                            <tr>
                                <td colSpan={canDelete ? 7 : 6} className="cms-empty">
                                    Tidak ada artikel yang sesuai dengan kriteria pencarian.
                                </td>
                            </tr>
                        ) : (
                            articles.map((article) => {
                                const isChecked = selectedIds.includes(article.id);
                                return (
                                    <tr key={article.id} style={{ background: isChecked ? "rgba(13, 148, 136, 0.04)" : undefined }}>
                                        {canDelete ? (
                                            <td style={{ textAlign: "center" }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleSelectOne(article.id)}
                                                    aria-label={`Pilih ${article.title}`}
                                                    style={{ cursor: "pointer", width: 16, height: 16 }}
                                                />
                                            </td>
                                        ) : null}
                                        <td>
                                            <div className="cms-title">
                                                <strong>{article.title}</strong>
                                                <small>/{article.slug}</small>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${statusColors[article.status]}`}>{statusLabels[article.status]}</span>
                                        </td>
                                        <td>{article.author_name ?? "—"}</td>
                                        <td>{article.category_name ?? "—"}</td>
                                        <td>{new Date(article.updated_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                                                <Link href={`/dashboard/articles/${article.id}`} className="icon-link" aria-label="Edit artikel">
                                                    <FileEdit size={15} />
                                                </Link>
                                                {canDelete ? (
                                                    <form action={deleteArticleAction} onSubmit={(e) => handleSingleDeleteSubmit(e, article.title)} style={{ display: "inline" }}>
                                                        <input type="hidden" name="id" value={article.id} />
                                                        <button
                                                            type="submit"
                                                            className="icon-link"
                                                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4 }}
                                                            title="Hapus Artikel"
                                                            aria-label={`Hapus ${article.title}`}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </form>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
