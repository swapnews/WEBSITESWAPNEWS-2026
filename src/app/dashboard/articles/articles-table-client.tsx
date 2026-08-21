"use client";

import Link from "next/link";
import { useState } from "react";
import { FileEdit, FolderInput, Trash2, UserRoundCheck } from "lucide-react";

import {
    deleteArticleAction,
    deleteBulkArticlesAction,
    transferArticleAuthorshipAction,
} from "@/lib/articles/actions";
import type { ApprovedWartawan, ArticleStatus } from "@/lib/articles";

type ArticleItem = {
    id: string;
    slug: string;
    title: string;
    status: ArticleStatus;
    category_id: number | null;
    author_id: string;
    updated_at: string;
    author_name?: string | null;
    category_name?: string | null;
};

type ArticlesTableClientProps = {
    articles: ArticleItem[];
    canDelete: boolean;
    canTransfer: boolean;
    wartawan: ApprovedWartawan[];
    categories: Array<{ id: number; name: string }>;
    statusLabels: Record<ArticleStatus, string>;
    statusColors: Record<ArticleStatus, string>;
};

function wartawanLabel(item: ApprovedWartawan) {
    return item.full_name ?? item.username ?? item.email;
}

export function ArticlesTableClient({
    articles,
    canDelete,
    canTransfer,
    wartawan,
    categories,
    statusLabels,
    statusColors,
}: ArticlesTableClientProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedAuthor, setSelectedAuthor] = useState("");
    const [categoryAuthor, setCategoryAuthor] = useState("");
    const [categoryId, setCategoryId] = useState("");

    const canSelect = canDelete || canTransfer;
    const allIds = articles.map((article) => article.id);
    const isAllSelected = articles.length > 0 && selectedIds.length === articles.length;

    const toggleSelectAll = () => setSelectedIds(isAllSelected ? [] : allIds);
    const toggleSelectOne = (id: string) => {
        setSelectedIds((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
    };

    const confirmBulkDelete = (event: React.FormEvent) => {
        if (!confirm(`Yakin ingin menghapus ${selectedIds.length} artikel terpilih? Tindakan ini tidak dapat dibatalkan.`)) {
            event.preventDefault();
        }
    };

    const confirmSelectedTransfer = (event: React.FormEvent) => {
        const target = wartawan.find((item) => item.id === selectedAuthor);
        if (!target || !confirm(`Pindahkan ${selectedIds.length} artikel terpilih ke ${wartawanLabel(target)}? Nama penulis publik akan berubah.`)) {
            event.preventDefault();
        }
    };

    const confirmCategoryTransfer = (event: React.FormEvent) => {
        const target = wartawan.find((item) => item.id === categoryAuthor);
        const category = categories.find((item) => String(item.id) === categoryId);
        if (!target || !category || !confirm(`Pindahkan SEMUA artikel kategori ${category.name} ke ${wartawanLabel(target)}? Nama penulis publik akan berubah.`)) {
            event.preventDefault();
        }
    };

    return (
        <div>
            {canTransfer ? (
                <section className="authorship-category-panel" aria-labelledby="category-transfer-title">
                    <div>
                        <span className="eyebrow">SuperAdmin Tool</span>
                        <h3 id="category-transfer-title">Transfer Satu Kategori</h3>
                        <p>Semua artikel dalam kategori dipindahkan ke wartawan tujuan.</p>
                    </div>
                    <form action={transferArticleAuthorshipAction} onSubmit={confirmCategoryTransfer}>
                        <input type="hidden" name="mode" value="category" />
                        <select id="category-transfer-category" name="category_id" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                            <option value="">Pilih kategori…</option>
                            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                        </select>
                        <select id="category-transfer-author" name="new_author_id" required value={categoryAuthor} onChange={(event) => setCategoryAuthor(event.target.value)}>
                            <option value="">Pilih wartawan tujuan…</option>
                            {wartawan.map((item) => <option key={item.id} value={item.id}>{wartawanLabel(item)}</option>)}
                        </select>
                        <button type="submit" className="secondary-button" disabled={!categoryId || !categoryAuthor}>
                            <FolderInput size={16} /> Pindahkan Kategori
                        </button>
                    </form>
                </section>
            ) : null}

            {canSelect && selectedIds.length > 0 ? (
                <div className="article-bulk-toolbar">
                    <strong>{selectedIds.length} artikel terpilih</strong>
                    <div className="article-bulk-actions">
                        {canTransfer ? (
                            <form action={transferArticleAuthorshipAction} onSubmit={confirmSelectedTransfer}>
                                <input type="hidden" name="mode" value="selected" />
                                <input type="hidden" name="ids" value={selectedIds.join(",")} />
                                <select id="selected-transfer-author" name="new_author_id" required value={selectedAuthor} onChange={(event) => setSelectedAuthor(event.target.value)}>
                                    <option value="">Pilih wartawan tujuan…</option>
                                    {wartawan.map((item) => <option key={item.id} value={item.id}>{wartawanLabel(item)}</option>)}
                                </select>
                                <button type="submit" className="primary-button" disabled={!selectedAuthor}>
                                    <UserRoundCheck size={15} /> Pindahkan Terpilih
                                </button>
                            </form>
                        ) : null}

                        {canDelete ? (
                            <form action={deleteBulkArticlesAction} onSubmit={confirmBulkDelete}>
                                <input type="hidden" name="ids" value={selectedIds.join(",")} />
                                <button type="submit" className="secondary-button danger">
                                    <Trash2 size={15} /> Hapus Terpilih
                                </button>
                            </form>
                        ) : null}
                    </div>
                </div>
            ) : null}

            <div className="cms-table-wrap">
                <table className="cms-table">
                    <thead>
                        <tr>
                            {canSelect ? (
                                <th className="article-check-cell">
                                    <input id="select-all-articles" type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} aria-label="Pilih semua artikel yang tampil" />
                                </th>
                            ) : null}
                            <th>Judul & Slug</th>
                            <th>Status</th>
                            <th>Penulis</th>
                            <th>Kategori</th>
                            <th>Update</th>
                            <th className="article-action-heading">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {articles.length === 0 ? (
                            <tr><td colSpan={canSelect ? 7 : 6} className="cms-empty">Tidak ada artikel yang sesuai dengan kriteria pencarian.</td></tr>
                        ) : articles.map((article) => {
                            const isChecked = selectedIds.includes(article.id);
                            return (
                                <tr key={article.id} className={isChecked ? "is-selected" : undefined}>
                                    {canSelect ? (
                                        <td className="article-check-cell">
                                            <input id={`select-article-${article.id}`} type="checkbox" checked={isChecked} onChange={() => toggleSelectOne(article.id)} aria-label={`Pilih ${article.title}`} />
                                        </td>
                                    ) : null}
                                    <td><div className="cms-title"><strong>{article.title}</strong><small>/{article.slug}</small></div></td>
                                    <td><span className={`status-badge ${statusColors[article.status]}`}>{statusLabels[article.status]}</span></td>
                                    <td>{article.author_name ?? "—"}</td>
                                    <td>{article.category_name ?? "—"}</td>
                                    <td>{new Date(article.updated_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                    <td>
                                        <div className="article-row-actions">
                                            <Link href={`/dashboard/articles/${article.id}`} className="icon-link" aria-label={`Edit ${article.title}`}><FileEdit size={15} /></Link>
                                            {canDelete ? (
                                                <form action={deleteArticleAction} onSubmit={(event) => { if (!confirm(`Yakin ingin menghapus artikel "${article.title}"?`)) event.preventDefault(); }}>
                                                    <input type="hidden" name="id" value={article.id} />
                                                    <button type="submit" className="icon-link article-delete-button" aria-label={`Hapus ${article.title}`}><Trash2 size={15} /></button>
                                                </form>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
