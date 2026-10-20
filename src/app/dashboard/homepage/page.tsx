import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Code2, LayoutTemplate, Radio, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { HomepageModuleCard } from "@/components/dashboard/homepage-module-card";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { deleteBreakingNewsAction, saveBreakingNewsAction } from "@/lib/content-management/actions";
import { isAdModule, mergeHomepageModules, type HomepageModule } from "@/lib/homepage-modules";
import "@/styles/homepage-composer.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage Control Center", description: "Atur 10 modul homepage, iklan HTML, dan breaking news SwapNews." };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const param = (p: Record<string, string | string[] | undefined>, k: string) => Array.isArray(p[k]) ? p[k]?.[0] : p[k];
const localDate = (value?: string | null) => value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "";

export default async function HomepageDashboard({ searchParams }: Props) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap?next=/dashboard/homepage");
    if (profile.role !== "super_admin") redirect("/dashboard");
    const params = await searchParams;
    const supabase = await createClient();
    const [{ data: rows, error: sectionError }, { data: breaking, error: breakingError }] = await Promise.all([
        supabase.from("homepage_sections").select("id,section_key,title,is_enabled,sort_order,style_variant,category_slug,settings").order("sort_order").limit(10),
        supabase.from("breaking_news").select("id,headline,target_url,priority,starts_at,ends_at,is_active").order("priority", { ascending: false }).limit(30),
    ]);
    const sections = mergeHomepageModules((rows ?? []) as HomepageModule[]);
    return <DashboardLayout profile={profile}>
        <div className="homepage-composer">
            <section className="composer-hero"><div><span className="eyebrow">SUPER ADMIN / PAGE COMPOSER</span><h1>Homepage Control</h1><p>Susun alur berita. Sisipkan iklan. Kendalikan tampilan beranda dari satu tempat.</p><Link id="composer-open-homepage" href="/" target="_blank" className="secondary-button">Lihat homepage <ArrowUpRight size={16} /></Link></div><div className="composer-hero-icon" aria-hidden="true"><LayoutTemplate size={46} /><Code2 size={24} /></div></section>
            <div className="composer-stats"><article><LayoutTemplate size={20} /><strong>10</strong><span>Modul tersedia</span></article><article><span className="composer-live-dot" /><strong>{sections.filter(s => s.is_enabled).length}</strong><span>Modul aktif</span></article><article><Code2 size={20} /><strong>03 / 07</strong><span>Posisi awal iklan HTML</span></article></div>
            {(param(params, "error") || sectionError || breakingError) && <p className="composer-feedback is-error" role="alert">{sectionError ? "Konfigurasi belum dapat dibaca. Periksa tabel homepage_sections; penyimpanan dinonaktifkan." : param(params, "error") || breakingError?.message}</p>}
            {param(params, "success") && <p className="composer-feedback" role="status">{param(params, "success")}</p>}
            <section aria-labelledby="composer-title"><header className="composer-heading"><div><span className="eyebrow">SUSUNAN BERANDA</span><h2 id="composer-title">Sepuluh modul. Satu alur cerita.</h2><p>Urutan kecil tampil lebih awal. Simpan per modul; perubahan langsung memperbarui homepage.</p></div><span className="composer-badge">{sections.filter(isAdModule).length} SLOT IKLAN</span></header><nav className="composer-outline" aria-label="Lompat ke modul">{sections.map((module, index) => <a id={`jump-${module.section_key}`} href={`#module-${module.section_key}`} key={module.section_key} className={isAdModule(module) ? "is-ad" : ""}><b>{String(index + 1).padStart(2, "0")}</b>{module.title}</a>)}</nav><div className="composer-grid">{sections.map((module, index) => <HomepageModuleCard key={module.section_key} module={module} index={index} disabled={Boolean(sectionError)} />)}</div></section>
            <section className="composer-breaking" aria-labelledby="breaking-title"><header className="composer-heading"><div><span className="eyebrow">LIVE DESK</span><h2 id="breaking-title">Breaking News</h2><p>Jadwalkan headline penting. Waktu mengikuti zona perangkat.</p></div><Radio size={24} /></header>
                <form action={saveBreakingNewsAction} className="composer-breaking-form"><label className="wide" htmlFor="breaking-headline">Headline<input id="breaking-headline" name="headline" required minLength={5} maxLength={180} placeholder="Tulis headline penting..." /></label><label htmlFor="breaking-url">Link tujuan<input id="breaking-url" name="target_url" defaultValue="/" required /></label><label htmlFor="breaking-priority">Prioritas<input id="breaking-priority" name="priority" type="number" defaultValue={10} /></label><label htmlFor="breaking-start">Mulai<input id="breaking-start" name="starts_at" type="datetime-local" required /></label><label htmlFor="breaking-end">Selesai (opsional)<input id="breaking-end" name="ends_at" type="datetime-local" /></label><label className="composer-checkbox" htmlFor="breaking-active"><input id="breaking-active" name="is_active" type="checkbox" defaultChecked />Aktif</label><button id="breaking-save" className="primary-button">Jadwalkan breaking</button></form>
                <div className="composer-breaking-list">{breaking?.length ? breaking.map(item => <article key={item.id}><div><span className="composer-badge">{item.is_active ? "Aktif" : "Nonaktif"}</span><strong>{item.headline}</strong><small>{localDate(item.starts_at)} — {localDate(item.ends_at) || "tanpa batas"}</small></div><form action={deleteBreakingNewsAction}><input type="hidden" name="id" value={item.id} /><button id={`delete-breaking-${item.id}`} className="icon-link danger" aria-label={`Hapus breaking: ${item.headline}`}><Trash2 size={17} /></button></form></article>) : <p className="composer-empty">Belum ada breaking news. Headline terjadwal akan muncul di sini.</p>}</div>
            </section>
        </div>
    </DashboardLayout>;
}
