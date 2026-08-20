"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import {
    Save, Send, CheckCircle2, Clock3, XCircle, Trash2,
    ScanSearch, WandSparkles, ShieldAlert,
} from "lucide-react";

import { MediaPicker } from "@/components/media-picker";
import { RichArticleEditor } from "@/components/rich-article-editor";
import { createArticleAction, updateArticleAction, deleteArticleAction } from "@/lib/articles/actions";
import type { Category, ArticleStatus } from "@/lib/articles";
import { normalizeArticleParagraphs, safeFixText, scanEditorial, type EditorialScan } from "@/lib/editorial-quality/engine";
import { generateAutoSeo } from "@/lib/seo/auto-seo";

type ArticleFormProps = {
    article?: {
        id: string;
        title: string;
        slug: string;
        excerpt: string | null;
        content: string;
        category_id: number | null;
        featured_media_id: string | null;
        is_exclusive: boolean;
        status: ArticleStatus;
        focus_keyword: string | null;
        seo_title: string | null;
        meta_description: string | null;
        tags: string[] | null;
        featured_media?: { id?: string; public_id: string; secure_url: string; alt_text: string } | null;
    } | null;
    categories: Category[];
    canEdit?: boolean;
    canReview?: boolean;
    canPublishDirect?: boolean;
};

const RESERVED_SLUGS = new Set([
    "dashboard", "member", "membership", "merchandise", "login", "cari", "api",
    "artikel", "auth", "robots.txt", "sitemap.xml", "manifest.webmanifest", "news", "_next",
]);

function slugify(value: string) {
    return value.toLowerCase().trim()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 90);
}

export function ArticleForm({ article, categories, canEdit = true, canReview = false, canPublishDirect = false }: ArticleFormProps) {
    const [featuredMediaId, setFeaturedMediaId] = useState(article?.featured_media_id || "");
    const [featuredMediaUrl, setFeaturedMediaUrl] = useState(article?.featured_media?.secure_url || "");
    const [featuredMediaAlt, setFeaturedMediaAlt] = useState(article?.featured_media?.alt_text || "");
    const [title, setTitle] = useState(article?.title || "");
    const [slug, setSlug] = useState(article?.slug || "");
    const [slugEdited, setSlugEdited] = useState(Boolean(article?.slug));
    const [focusKeyword, setFocusKeyword] = useState(article?.focus_keyword || "");
    const [seoTitle, setSeoTitle] = useState(article?.seo_title || "");
    const [metaDesc, setMetaDesc] = useState(article?.meta_description || "");
    const [excerpt, setExcerpt] = useState(article?.excerpt || "");
    const [tags, setTags] = useState((article?.tags ?? []).join(", "));
    const [content, setContent] = useState(article?.content || "");
    const [mediaOpen, setMediaOpen] = useState(false);
    const [editorImage, setEditorImage] = useState<{ url: string; alt: string } | null>(null);
    const [qualityScan, setQualityScan] = useState<EditorialScan | null>(null);

    const isEditing = !!article;
    const effectiveSlug = slugEdited ? slug : slugify(title);
    const slugInvalid = !effectiveSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(effectiveSlug) || RESERVED_SLUGS.has(effectiveSlug);
    const slugError = !effectiveSlug ? ""
        : !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(effectiveSlug) ? "Hanya huruf kecil, angka, tanda hubung."
            : RESERVED_SLUGS.has(effectiveSlug) ? `"${effectiveSlug}" dilarang: menabrak route aplikasi.`
                : "";

    const runQualityScan = () => setQualityScan(scanEditorial({ title, excerpt, content, focusKeyword, seoTitle, metaDescription: metaDesc, authorName: article ? "Redaksi SwapNews" : "Penulis", featuredAlt: featuredMediaAlt }));
    const applySafeFix = () => {
        setTitle(safeFixText(title)); setExcerpt(safeFixText(excerpt)); setContent(normalizeArticleParagraphs(content));
        setSeoTitle(safeFixText(seoTitle)); setMetaDesc(safeFixText(metaDesc)); setQualityScan(null);
    };

    const runAutoSeo = () => {
        if (!title.trim()) return;
        const result = generateAutoSeo({ title, content, excerpt });
        // Hanya isi field yang kosong — jangan timpa yang sudah diedit user
        if (!focusKeyword.trim()) setFocusKeyword(result.focusKeyword);
        if (!seoTitle.trim()) setSeoTitle(result.seoTitle);
        if (!metaDesc.trim()) setMetaDesc(result.metaDescription);
        if (!tags.trim()) setTags(result.tags);
        if (!excerpt.trim()) setExcerpt(result.excerpt);
        if (!slugEdited) setSlug(result.slug);
    };

    const insertImage = useCallback(() => setMediaOpen(true), []);

    const onEditorImageSelect = useCallback((media: { url: string; alt: string }) => {
        setEditorImage({ url: media.url, alt: media.alt });
        setMediaOpen(false);
        window.setTimeout(() => setEditorImage(null), 0);
    }, []);

    const displayTitle = seoTitle || title || "Judul Artikel Anda";
    const displayDesc = metaDesc || excerpt || "Ringkasan artikel akan tampil di sini...";


    return (
        <div className="article-form-wrapper">
            <form action={isEditing ? updateArticleAction : createArticleAction} className="cms-form">
                {isEditing ? <input type="hidden" name="id" value={article.id} /> : null}
                <input type="hidden" name="featured_media_id" value={featuredMediaId} />

                <div className="cms-form-grid">
                    <label className="full">
                        Judul Artikel (H1)
                        <input name="title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul artikel utama..." disabled={!canEdit} />
                    </label>

                    <label className="full">
                        Slug URL
                        <div className="slug-row">
                            <span className="slug-prefix">swapnews.co.id/</span>
                            <input name="slug" type="text" required value={effectiveSlug} onChange={(e) => { setSlug(e.target.value.toLowerCase()); setSlugEdited(true); }} placeholder="judul-artikel" disabled={!canEdit} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
                        </div>
                        {slugError ? <small className="field-error">{slugError}</small> : <small className="field-hint">Otomatis dari judul. Bisa diedit. Huruf kecil + tanda hubung.</small>}
                    </label>

                    <label className="full">
                        Ringkasan / Excerpt
                        <textarea name="excerpt" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Ringkasan singkat untuk kartu & fallback meta deskripsi..." disabled={!canEdit} />
                    </label>

                    <label>
                        Kategori Kanal
                        <select name="category_id" defaultValue={article?.category_id ?? ""} disabled={!canEdit}>
                            <option value="">Pilih Kategori</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.parent_id ? `— ${category.parent_name ?? "Subkanal"} / ${category.name}` : category.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="checkbox">
                        <input name="is_exclusive" type="checkbox" defaultChecked={article?.is_exclusive || false} disabled={!canEdit} />
                        <span>Konten Eksklusif (Member Only)</span>
                    </label>

                    <div className="full">
                        <label style={{ marginBottom: 8 }}>Gambar Utama (Featured Image)</label>
                        {canEdit ? (
                            <MediaPicker
                                selectedId={featuredMediaId} selectedUrl={featuredMediaUrl} selectedAlt={featuredMediaAlt}
                                onSelect={(media) => { setFeaturedMediaId(media.id); setFeaturedMediaUrl(media.url); setFeaturedMediaAlt(media.alt); }}
                                onClear={() => { setFeaturedMediaId(""); setFeaturedMediaUrl(""); setFeaturedMediaAlt(""); }}
                            />
                        ) : featuredMediaUrl ? (
                            <div className="cms-media-preview"><Image src={featuredMediaUrl} alt={featuredMediaAlt || "Featured image"} width={640} height={360} /></div>
                        ) : null}
                    </div>

                    <div className="full">
                        <label style={{ marginBottom: 8 }}>Isi Konten Artikel</label>
                        <RichArticleEditor value={content} onChange={setContent} onImage={insertImage} imageToInsert={editorImage} disabled={!canEdit} />
                        <input type="hidden" name="content" value={content} />
                        <small className="field-hint">{content.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length} kata · ~{Math.max(1, Math.ceil(content.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length / 200))} menit baca</small>
                    </div>

                    {/* Panel SEO */}
                    <div className="full seo-panel">
                        <div className="seo-panel-header">
                            <h3>Optimasi SEO</h3>
                            <button type="button" className="secondary-button" onClick={runAutoSeo} disabled={!title.trim()}>
                                <WandSparkles size={15} /> Auto-Fill SEO
                            </button>
                        </div>

                        <label>
                            Focus Keyword / Phrase
                            <input name="focus_keyword" type="text" value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} placeholder="kata kunci utama artikel" disabled={!canEdit} />
                        </label>

                        <label>
                            SEO Title <span className={`char-counter ${seoTitle.length > 60 ? "over" : ""}`}>{seoTitle.length}/60</span>
                            <input name="seo_title" type="text" maxLength={70} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Kosongkan untuk pakai judul artikel" disabled={!canEdit} />
                        </label>

                        <label>
                            Meta Deskripsi <span className={`char-counter ${metaDesc.length > 160 ? "over" : ""}`}>{metaDesc.length}/160</span>
                            <textarea name="meta_description" rows={2} maxLength={170} value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} placeholder="Kosongkan untuk pakai ringkasan/excerpt" disabled={!canEdit} />
                        </label>

                        <label>
                            Tags SEO (pisahkan koma)
                            <input name="tags" type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="bali, wisata, ekonomi kreatif" disabled={!canEdit} />
                        </label>

                        <div className="seo-preview" aria-label="Preview Google">
                            <small>Preview Google</small>
                            <p className="seo-preview-title">{displayTitle.slice(0, 60)}</p>
                            <p className="seo-preview-url">swapnews.co.id/{effectiveSlug || "postname"}</p>
                            <p className="seo-preview-desc">{displayDesc.slice(0, 160)}</p>
                            {focusKeyword && <p className="seo-preview-kw">Focus keyword: <b>{focusKeyword}</b></p>}
                        </div>
                    </div>

                    <section className="quality-engine"><header><div><span>EDITORIAL QUALITY ENGINE • RULES 2026.1</span><h3>Scan standar berita</h3><p>EYD, struktur, jurnalistik, people-first, dan SEO.</p></div><div><button type="button" className="secondary-button" onClick={applySafeFix}><WandSparkles size={15} /> Fix Aman</button><button type="button" className="primary-button" onClick={runQualityScan}><ScanSearch size={15} /> Scan Artikel</button></div></header>{qualityScan && <div className="quality-result"><div className={`quality-score ${qualityScan.passed ? "passed" : "failed"}`}><strong>{qualityScan.score}</strong><span>/100</span><small>{qualityScan.passed ? "LAYAK" : "PERLU REVIEW"}</small></div><div className="quality-dimensions">{Object.entries(qualityScan.scores).map(([key, value]) => <div key={key}><span>{key}</span><b>{value}</b></div>)}</div><div className="quality-issues">{qualityScan.issues.length === 0 ? <p>Tidak ada masalah terdeteksi.</p> : qualityScan.issues.map(item => <article className={item.severity} key={item.id}><ShieldAlert /><div><b>{item.message}</b>{item.suggestion && <p>{item.suggestion}</p>}<small>{item.category} • {item.severity}</small></div></article>)}</div><footer>{qualityScan.stats.words} kata • {qualityScan.stats.paragraphs} paragraf • {qualityScan.stats.sentences} kalimat</footer></div>}</section>

                    {isEditing && <section className="editorial-workflow-box"><div><span>EDITORIAL WORKFLOW</span><h3>Catatan dan penjadwalan</h3><p>Catatan tersimpan di riwayat internal redaksi.</p></div><label>Catatan editor<textarea name="editorial_note" rows={3} placeholder="Alasan revisi, fakta yang perlu dicek, atau keputusan editor..." /></label>{canReview && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}><label>Nilai Poin Artikel Admin (1 - 10 Poin)<select name="award_points" defaultValue="10"><option value="10">10 Poin (Sangat Baik / Orisinal)</option><option value="9">9 Poin (Sangat Baik)</option><option value="8">8 Poin (Baik)</option><option value="7">7 Poin (Cukup Baik)</option><option value="6">6 Poin (Standar Min)</option><option value="5">5 Poin (Batas Layak Publish)</option><option value="4">4 Poin (TOLAK - Kurang Layak)</option><option value="3">3 Poin (TOLAK)</option><option value="2">2 Poin (TOLAK)</option><option value="1">1 Poin (TOLAK)</option></select><small className="field-hint" style={{ color: "var(--teal-muted)", marginTop: 4 }}>*Poin &lt; 5 otomatis DITOLAK. Poin 5–10 DITERBITKAN + poin diberikan ke penulis.</small></label><label>Jadwal terbit<input name="scheduled_at" type="datetime-local" min={new Date().toISOString().slice(0, 16)} /></label></div>}</section>}
                </div>

                <div className="cms-actions">
                    {canEdit ? (
                        <>
                            <button type="submit" name="status" value="draft" className="secondary-button" disabled={slugInvalid}>
                                <Save size={16} /> Simpan Draft
                            </button>
                            {canPublishDirect && article?.status !== "published" ? (
                                <button type="submit" name={isEditing ? "action" : "status"} value="publish_direct" className="primary-button direct-publish-button" disabled={slugInvalid}>
                                    <CheckCircle2 size={16} /> Terbitkan Langsung
                                </button>
                            ) : null}
                            {(!article || ["draft", "revision", "rejected"].includes(article.status)) ? (
                                <button type="submit" name={isEditing ? "action" : "status"} value={isEditing ? "submit_review" : "in_review"} className="primary-button" disabled={slugInvalid}>
                                    <Send size={16} /> Kirim untuk Review
                                </button>
                            ) : null}
                        </>
                    ) : null}

                    {canReview && isEditing ? (
                        <>
                            {article.status === "in_review" ? <><button type="submit" name="action" value="revision" className="secondary-button"><Clock3 size={16} /> Minta Revisi</button><button type="submit" name="action" value="reject" className="secondary-button danger"><XCircle size={16} /> Tolak</button></> : null}
                            {article.status !== "published" ? <button type="submit" name="action" value="publish" className="primary-button"><CheckCircle2 size={16} /> Terbitkan + Beri Poin</button> : null}
                            {article.status !== "published" ? <button type="submit" name="action" value="schedule" className="secondary-button"><Clock3 size={16} /> Jadwalkan</button> : null}
                            {article.status === "published" ? <button type="submit" name="action" value="revision" className="secondary-button"><XCircle size={16} /> Turunkan ke Revisi</button> : null}
                            {article.status === "published" ? <button type="submit" name="action" value="archive" className="secondary-button">Arsipkan</button> : null}
                        </>
                    ) : null}
                </div>
            </form>

            {canReview && isEditing ? (
                <form action={deleteArticleAction} className="cms-delete">
                    <input type="hidden" name="id" value={article.id} />
                    <button type="submit" className="secondary-button danger" onClick={(e) => { if (!confirm("Yakin ingin menghapus artikel ini secara permanen?")) e.preventDefault(); }}>
                        <Trash2 size={16} /> Hapus Artikel
                    </button>
                </form>
            ) : null}

            {mediaOpen && (
                <div className="editor-media-modal" role="dialog" aria-label="Pilih gambar">
                    <div className="editor-media-inner">
                        <MediaPicker selectedId="" selectedUrl="" selectedAlt="" onSelect={onEditorImageSelect} onClear={() => setMediaOpen(false)} />
                        <button type="button" className="secondary-button" onClick={() => setMediaOpen(false)}>Tutup</button>
                    </div>
                </div>
            )}
        </div>
    );
}
