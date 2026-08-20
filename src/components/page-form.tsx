"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { Save, Send, Trash2 } from "lucide-react";

import { MediaPicker } from "@/components/media-picker";
import { RichArticleEditor } from "@/components/rich-article-editor";
import { deletePageAction, savePageAction } from "@/lib/content-management/actions";

export type PageRecord = { id: string; title: string; slug: string; excerpt: string | null; content: string; featured_media_id: string | null; status: "draft" | "published"; focus_keyword: string | null; seo_title: string | null; meta_description: string | null; tags: string[] | null; featured_media?: { secure_url: string; alt_text: string } | null };
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

export function PageForm({ page }: { page?: PageRecord | null }) {
    const [title, setTitle] = useState(page?.title ?? "");
    const [slug, setSlug] = useState(page?.slug ?? "");
    const [slugEdited, setSlugEdited] = useState(Boolean(page));
    const [content, setContent] = useState(page?.content ?? "");
    const [mediaId, setMediaId] = useState(page?.featured_media_id ?? "");
    const [mediaUrl, setMediaUrl] = useState(page?.featured_media?.secure_url ?? "");
    const [mediaAlt, setMediaAlt] = useState(page?.featured_media?.alt_text ?? "");
    const [editorMediaOpen, setEditorMediaOpen] = useState(false);
    const [editorImage, setEditorImage] = useState<{ url: string; alt: string } | null>(null);
    const onEditorImageSelect = useCallback((media: { url: string; alt: string }) => {
        setEditorImage({ url: media.url, alt: media.alt });
        setEditorMediaOpen(false);
    }, []);
    const onEditorImageInserted = useCallback(() => setEditorImage(null), []);
    const effectiveSlug = slugEdited ? slug : slugify(title);

    return <div className="article-form-wrapper">
        <form action={savePageAction} className="cms-form">
            {page && <input type="hidden" name="id" value={page.id} />}
            <input type="hidden" name="featured_media_id" value={mediaId} />
            <div className="cms-form-grid">
                <label className="full">Judul Page (H1)<input name="title" required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
                <label className="full">Slug URL<div className="slug-row"><span className="slug-prefix">swapnews.co.id/page/</span><input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={effectiveSlug} onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }} /></div></label>
                <label className="full">Ringkasan<textarea name="excerpt" rows={3} defaultValue={page?.excerpt ?? ""} /></label>
                <div className="full"><label>Gambar Utama</label><MediaPicker selectedId={mediaId} selectedUrl={mediaUrl} selectedAlt={mediaAlt} onSelect={(media) => { setMediaId(media.id); setMediaUrl(media.url); setMediaAlt(media.alt); }} onClear={() => { setMediaId(""); setMediaUrl(""); setMediaAlt(""); }} /></div>
                <div className="full"><label>Isi Page</label><RichArticleEditor value={content} onChange={setContent} onImage={() => setEditorMediaOpen(true)} imageToInsert={editorImage} onImageInserted={onEditorImageInserted} /><input type="hidden" name="content" value={content} /></div>
                <div className="full seo-panel"><h3>Optimasi SEO</h3>
                    <label>Focus Keyword<input name="focus_keyword" defaultValue={page?.focus_keyword ?? ""} /></label>
                    <label>SEO Title<input name="seo_title" maxLength={70} defaultValue={page?.seo_title ?? ""} /></label>
                    <label>Meta Deskripsi<textarea name="meta_description" rows={2} maxLength={170} defaultValue={page?.meta_description ?? ""} /></label>
                    <label>Tags<input name="tags" defaultValue={(page?.tags ?? []).join(", ")} /></label>
                    <div className="seo-preview"><small>Preview Google</small><p className="seo-preview-title">{page?.seo_title || title || "Judul Page"}</p><p className="seo-preview-url">swapnews.co.id/page/{effectiveSlug}</p><p className="seo-preview-desc">{page?.meta_description || page?.excerpt || "Deskripsi page"}</p></div>
                </div>
                {mediaUrl && <div className="full cms-media-preview"><Image src={mediaUrl} alt={mediaAlt || title} width={640} height={360} /></div>}
            </div>
            <div className="cms-actions"><button name="status" value="draft" className="secondary-button"><Save size={16} /> Simpan Draft</button><button name="status" value="published" className="primary-button"><Send size={16} /> Terbitkan</button></div>
        </form>
        {page && <form action={deletePageAction} className="cms-delete"><input type="hidden" name="id" value={page.id} /><button className="secondary-button danger"><Trash2 size={16} /> Hapus Page</button></form>}
        {editorMediaOpen && <div className="editor-media-modal" role="dialog" aria-label="Pilih gambar"><div className="editor-media-inner"><MediaPicker selectedId="" selectedUrl="" selectedAlt="" onSelect={onEditorImageSelect} onClear={() => setEditorMediaOpen(false)} /><button type="button" className="secondary-button" onClick={() => setEditorMediaOpen(false)}>Tutup</button></div></div>}
    </div>;
}
