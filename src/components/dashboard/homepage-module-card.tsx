"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Code2, Eye, LayoutTemplate, Loader2, Save } from "lucide-react";
import { saveHomepageSectionAction } from "@/lib/content-management/actions";
import { isAdModule, moduleStyles, type HomepageModule } from "@/lib/homepage-modules";
import { AdSlotFrame } from "@/components/ads/ad-slot";

export function HomepageModuleCard({ module, index, disabled }: { module: HomepageModule; index: number; disabled?: boolean }) {
    const [state, action, pending] = useActionState(saveHomepageSectionAction, {});
    const [enabled, setEnabled] = useState(module.is_enabled);
    const [html, setHtml] = useState(module.settings?.html_content ?? "");
    const [preview, setPreview] = useState(false);
    const [changed, setChanged] = useState(false);
    const ads = isAdModule(module);
    const prefix = `module-${module.section_key}`;
    const styles = moduleStyles(module.section_key);
    return <form id={prefix} action={action} className={`composer-card${ads ? " composer-card-ad" : ""}`} onChange={() => setChanged(true)} onSubmit={() => setChanged(false)}>
        <input type="hidden" name="section_key" value={module.section_key} />
        <header className="composer-card-head"><span className="composer-number">{String(index + 1).padStart(2, "0")}</span><div>{ads ? <Code2 size={17} /> : <LayoutTemplate size={17} />}<span>{ads ? "IKLAN HTML" : "MODUL KONTEN"}</span><h3>{module.title}</h3></div><span className={`composer-badge ${enabled ? "is-on" : ""}`}>{enabled ? "Aktif" : "Nonaktif"}</span></header>
        <fieldset disabled={pending || disabled}>
            <label htmlFor={`${prefix}-title`}>Judul modul<input id={`${prefix}-title`} name="title" required maxLength={100} defaultValue={module.title} /></label>
            <div className="composer-fields">
                <label htmlFor={`${prefix}-order`}>Urutan tampil<input id={`${prefix}-order`} name="sort_order" type="number" min={1} max={1000} required defaultValue={module.sort_order} /><small>Angka kecil tampil lebih awal.</small></label>
                {!ads && <label htmlFor={`${prefix}-style`}>Gaya tampilan<select id={`${prefix}-style`} name="style_variant" defaultValue={styles.includes(module.style_variant) ? module.style_variant : styles[0]}>{styles.map((style) => <option key={style} value={style}>{({ compact: "Ringkas", default: "Lengkap", carousel: "Carousel", arena: "Games Arena", scoreboard: "Sports Slider", mosaic: "Grid Visual", editorial: "Editorial" } as Record<string, string>)[style]}</option>)}</select></label>}
            </div>
            {ads ? <>
                <label htmlFor={`${prefix}-html`}>Kode HTML iklan<textarea id={`${prefix}-html`} name="html_content" rows={6} maxLength={50000} value={html} onChange={(event) => setHtml(event.target.value)} spellCheck={false} placeholder="Tempel HTML banner Anda di sini..." /></label>
                <div className="composer-code-info"><span>{html.length.toLocaleString("id-ID")} / 50.000 karakter</span><button type="button" id={`${prefix}-preview`} onClick={() => setPreview(!preview)} disabled={!html.trim()}><Eye size={14} />{preview ? "Tutup preview" : "Preview HTML"}</button></div>
                <p className="composer-note">HTML/CSS dan gambar HTTPS didukung. JavaScript diblokir demi keamanan situs.</p>
                <div className="composer-fields"><label htmlFor={`${prefix}-desktop`}>Tinggi desktop (px)<input id={`${prefix}-desktop`} type="number" name="desktop_height" min={90} max={600} defaultValue={module.settings?.desktop_height ?? 250} required /></label><label htmlFor={`${prefix}-mobile`}>Tinggi mobile (px)<input id={`${prefix}-mobile`} type="number" name="mobile_height" min={90} max={600} defaultValue={module.settings?.mobile_height ?? 250} required /></label></div>
                {preview && <div className="composer-preview"><AdSlotFrame preview slot={{ name: module.title, is_active: true, content_type: "html", html_content: html, youtube_url: null, desktop_width: 970, desktop_height: 250, mobile_width: 320, mobile_height: 250 }} /></div>}
            </> : <label htmlFor={`${prefix}-category`}>Sumber kanal<input id={`${prefix}-category`} name="category_slug" defaultValue={module.category_slug ?? ""} placeholder="Semua kanal" maxLength={90} pattern="[a-z0-9-]*" disabled={module.section_key === "topics" || module.section_key === "reels"} /><small>Slug kanal, misalnya bali atau nasional. Kosongkan untuk sumber bawaan.</small></label>}
            <label className="composer-toggle" htmlFor={`${prefix}-enabled`}><input id={`${prefix}-enabled`} name="is_enabled" type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /><span className="composer-switch" aria-hidden="true" /><span><strong>Tampilkan di homepage</strong><small>{ads ? "Aktifkan setelah HTML siap." : "Nonaktifkan tanpa menghapus konfigurasi."}</small></span></label>
            <footer><span>{changed ? "Perubahan belum disimpan" : "Simpan setiap modul secara terpisah"}</span><button id={`${prefix}-save`} type="submit" className="primary-button">{pending ? <Loader2 size={15} className="spin" /> : <Save size={15} />}{pending ? "Menyimpan..." : "Simpan modul"}</button></footer>
        </fieldset>
        {state.error && <p className="composer-feedback is-error" role="alert">{state.error}</p>}
        {state.success && !changed && <p className="composer-feedback" role="status"><CheckCircle2 size={16} />{state.success}</p>}
    </form>;
}
