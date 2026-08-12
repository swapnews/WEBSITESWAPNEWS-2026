import { redirect } from "next/navigation";
import { LayoutTemplate, Radio, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { deleteBreakingNewsAction, saveBreakingNewsAction, saveHomepageSectionAction } from "@/lib/content-management/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Homepage Control Center" };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const param = (p: Record<string, string | string[] | undefined>, k: string) => Array.isArray(p[k]) ? p[k]?.[0] : p[k];
const localDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";

export default async function HomepageDashboard({ searchParams }: Props) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap?next=/dashboard/homepage");
    if (profile.role !== "super_admin") redirect("/dashboard");
    const params = await searchParams;
    const supabase = await createClient();
    const [{ data: sections = [], error: sectionError }, { data: breaking = [], error: breakingError }] = await Promise.all([
        supabase.from("homepage_sections").select("id,section_key,title,is_enabled,sort_order,style_variant,category_slug").order("sort_order"),
        supabase.from("breaking_news").select("id,headline,target_url,priority,starts_at,ends_at,is_active").order("priority", { ascending: false }),
    ]);
    return <DashboardLayout profile={profile}>
        <section className="dashboard-hero clay-card"><div><span className="eyebrow">Super Admin • Live Composition</span><h1>Homepage Control Center</h1><p>Atur modul, urutan, gaya visual, sumber kanal, dan breaking news dari satu pusat kendali.</p></div><LayoutTemplate size={42} /></section>
        {(param(params, "error") || sectionError || breakingError) && <p className="cms-alert error">{param(params, "error") || sectionError?.message || breakingError?.message}</p>}
        {param(params, "success") && <p className="cms-alert success">{param(params, "success")}</p>}
        <section className="dashboard-panel clay-card home-control-panel"><div className="control-heading"><div><span className="eyebrow">Page Composer</span><h2>Susunan Homepage</h2></div><strong>{sections?.filter(s => s.is_enabled).length ?? 0} MODUL AKTIF</strong></div>
            <div className="home-module-grid">{sections?.map((section, index) => <form action={saveHomepageSectionAction} className={`home-module-card ${section.is_enabled ? "enabled" : "disabled"}`} key={section.id}>
                <input type="hidden" name="id" value={section.id} /><div className="module-index"><b>{String(index + 1).padStart(2, "0")}</b><span>{section.section_key}</span></div>
                <label>Judul Modul<input name="title" required defaultValue={section.title} /></label><div className="module-fields"><label>Urutan<input name="sort_order" type="number" defaultValue={section.sort_order} /></label><label>Gaya<select name="style_variant" defaultValue={section.style_variant}><option value="default">Default</option><option value="compact">Compact</option><option value="carousel">Carousel</option><option value="arena">Arena</option><option value="scoreboard">Scoreboard</option><option value="mosaic">Mosaic</option><option value="editorial">Editorial</option></select></label></div>
                <label>Sumber Kanal<input name="category_slug" defaultValue={section.category_slug ?? ""} placeholder="games, sport, bali..." /></label><label className="checkbox module-toggle"><input name="is_enabled" type="checkbox" defaultChecked={section.is_enabled} /><span>Tampilkan di homepage</span></label><button className="primary-button">Simpan Modul</button>
            </form>)}</div>
        </section>
        <section className="dashboard-panel clay-card breaking-manager"><div className="control-heading"><div><span className="eyebrow">Live Desk</span><h2>Breaking News</h2></div><Radio /></div>
            <form action={saveBreakingNewsAction} className="breaking-form"><label className="wide">Headline<input name="headline" required maxLength={180} placeholder="Headline penting..." /></label><label>Link<input name="target_url" defaultValue="/" /></label><label>Prioritas<input name="priority" type="number" defaultValue={10} /></label><label>Mulai<input name="starts_at" type="datetime-local" required /></label><label>Selesai<input name="ends_at" type="datetime-local" /></label><label className="checkbox"><input name="is_active" type="checkbox" defaultChecked /><span>Aktif</span></label><button className="primary-button">Jadwalkan Breaking</button></form>
            <div className="breaking-list">{breaking?.map(item => <article key={item.id}><div><span className={`status-badge ${item.is_active ? "published" : "draft"}`}>{item.is_active ? "Aktif" : "Nonaktif"}</span><strong>{item.headline}</strong><small>{localDate(item.starts_at)} — {localDate(item.ends_at) || "tanpa batas"}</small></div><form action={deleteBreakingNewsAction}><input type="hidden" name="id" value={item.id} /><button className="icon-link danger"><Trash2 size={15} /></button></form></article>)}</div>
        </section>
    </DashboardLayout>;
}
