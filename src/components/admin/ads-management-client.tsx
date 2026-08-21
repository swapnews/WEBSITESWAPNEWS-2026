"use client";

import { useActionState, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Code2, Eye, Megaphone, Save, ShieldCheck, Video, XCircle } from "lucide-react";

import { AdSlotFrame } from "@/components/ads/ad-slot";
import { INITIAL_AD_ACTION_STATE, updateAdSlotAction } from "@/lib/ads/actions";
import type { AdContentType, AdSlot } from "@/lib/ads/types";

function dateTimeLocal(value: string | null) {
    if (!value) return "";
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function SlotEditor({ slot, index }: { slot: AdSlot; index: number }) {
    const [state, action, pending] = useActionState(updateAdSlotAction, INITIAL_AD_ACTION_STATE);
    const [contentType, setContentType] = useState<AdContentType>(slot.content_type);
    const [active, setActive] = useState(slot.is_active);
    const [html, setHtml] = useState(slot.html_content);
    const [youtube, setYoutube] = useState(slot.youtube_url ?? "");
    const fieldId = `ad-${slot.slot_key}`;
    const previewSlot = useMemo<AdSlot>(() => ({
        ...slot,
        content_type: contentType,
        html_content: html,
        youtube_url: youtube,
        is_active: true,
    }), [contentType, html, slot, youtube]);
    const responseForSlot = state.slotKey === slot.slot_key;

    return <article className={`ads-editor-card${active ? " is-active" : ""}`}>
        <header>
            <div className="ads-slot-index">{String(index + 1).padStart(2, "0")}</div>
            <div><span>{slot.slot_key}</span><h2>{slot.name}</h2><p>{slot.placement}</p></div>
            <div className={`ads-status-pill ${active ? "active" : "inactive"}`}>{active ? "AKTIF" : "NONAKTIF"}</div>
        </header>
        <div className="ads-dimension-row">
            <span>Desktop <b>{slot.desktop_width} × {slot.desktop_height}</b></span>
            <span>Mobile <b>{slot.mobile_width} × {slot.mobile_height}</b></span>
        </div>
        <form action={action} className="ads-editor-form">
            <input type="hidden" name="slot_key" value={slot.slot_key} />
            <div className="ads-type-switch" role="group" aria-label={`Tipe materi ${slot.name}`}>
                <label className={contentType === "html" ? "selected" : ""}><input type="radio" name="content_type" value="html" checked={contentType === "html"} onChange={() => setContentType("html")} /><Code2 /> HTML Aman</label>
                <label className={contentType === "youtube" ? "selected" : ""}><input type="radio" name="content_type" value="youtube" checked={contentType === "youtube"} onChange={() => setContentType("youtube")} /><Video /> YouTube</label>
            </div>
            {contentType === "html" ? <label htmlFor={`${fieldId}-html`} className="ads-field-label">HTML materi
                <textarea id={`${fieldId}-html`} name="html_content" value={html} onChange={(event) => setHtml(event.target.value)} maxLength={50000} rows={8} spellCheck={false} placeholder={'<a href="https://brand.example"><img src="https://.../banner.jpg" alt="Nama brand"></a>'} />
                <small>{html.length.toLocaleString("id-ID")} / 50.000 karakter · JavaScript, form, dan fetch diblokir.</small>
            </label> : <label htmlFor={`${fieldId}-youtube`} className="ads-field-label">URL atau iframe YouTube
                <input id={`${fieldId}-youtube`} name="youtube_url" value={youtube} onChange={(event) => setYoutube(event.target.value)} maxLength={2000} placeholder="https://www.youtube.com/watch?v=..." />
                <small>Video disimpan sebagai URL canonical dan dirender dari youtube-nocookie.com.</small>
            </label>}
            {contentType !== "html" && <input type="hidden" name="html_content" value="" />}
            {contentType !== "youtube" && <input type="hidden" name="youtube_url" value="" />}
            <fieldset className="ads-schedule"><legend><CalendarClock /> Jadwal tayang</legend>
                <label htmlFor={`${fieldId}-start`}>Mulai<input id={`${fieldId}-start`} type="datetime-local" name="starts_at" defaultValue={dateTimeLocal(slot.starts_at)} /></label>
                <label htmlFor={`${fieldId}-end`}>Selesai<input id={`${fieldId}-end`} type="datetime-local" name="ends_at" defaultValue={dateTimeLocal(slot.ends_at)} /></label>
            </fieldset>
            <label className="ads-active-toggle"><input type="checkbox" name="is_active" checked={active} onChange={(event) => setActive(event.target.checked)} /><span aria-hidden="true" /><b>{active ? "Slot aktif" : "Slot nonaktif"}</b></label>
            <details className="ads-preview-panel"><summary><Eye /> Preview aman <span>Sandbox aktif</span></summary><div><AdSlotFrame slot={previewSlot} preview /></div></details>
            {responseForSlot && state.status !== "idle" && <p className={`ads-action-message ${state.status}`} role="status">{state.status === "success" ? <CheckCircle2 /> : <XCircle />}{state.message}</p>}
            <button id={`${fieldId}-save`} className="ads-save-button" disabled={pending}><Save /> {pending ? "Menyimpan..." : "Simpan Slot"}</button>
        </form>
    </article>;
}

export function AdsManagementClient({ slots, loadError }: { slots: AdSlot[]; loadError: string | null }) {
    const activeCount = slots.filter((slot) => slot.is_active).length;
    const htmlCount = slots.filter((slot) => slot.content_type === "html").length;
    const youtubeCount = slots.filter((slot) => slot.content_type === "youtube").length;

    return <main className="ads-dashboard">
        <section className="ads-dashboard-hero">
            <div><span>SUPER ADMIN · REVENUE CONTROL</span><h1>Ads Management</h1><p>Kelola 10 ruang iklan SwapNews. HTML tetap terisolasi, YouTube privacy-enhanced, dan semua slot berlabel editorial.</p></div>
            <div className="ads-hero-shield"><ShieldCheck /><b>SECURE<br />SANDBOX</b></div>
        </section>
        <section className="ads-stat-grid" aria-label="Ringkasan iklan">
            <article><Megaphone /><div><b>{slots.length}</b><span>Total slot</span></div></article>
            <article><CheckCircle2 /><div><b>{activeCount}</b><span>Slot aktif</span></div></article>
            <article><Code2 /><div><b>{htmlCount}</b><span>Materi HTML</span></div></article>
            <article><Video /><div><b>{youtubeCount}</b><span>Video YouTube</span></div></article>
        </section>
        <div className="ads-security-note"><ShieldCheck /><p><b>Boundary keamanan aktif.</b> Script, form, fetch, dan akses origin SwapNews diblokir dari HTML iklan. Slot tidak muncul untuk member.</p></div>
        {loadError && <p className="ads-load-error"><XCircle /> {loadError}</p>}
        {!loadError && slots.length !== 10 && <p className="ads-load-error"><XCircle /> Inventori tidak lengkap: ditemukan {slots.length} dari 10 slot. Jalankan migrasi `019_ads_management.sql`.</p>}
        <section className="ads-editor-grid" aria-label="Daftar ruang iklan">{slots.map((slot, index) => <SlotEditor key={slot.slot_key} slot={slot} index={index} />)}</section>
    </main>;
}
