import { redirect } from "next/navigation";
import { BookOpenCheck } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DEFAULT_INSERTION_SETTINGS } from "@/lib/article-insertions";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { saveArticleInsertionsAction } from "./actions";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const param = (p: Record<string, string | string[] | undefined>, k: string) => Array.isArray(p[k]) ? p[k]?.[0] : p[k];

export default async function ArticleInsertionsDashboard({ searchParams }: Props) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/login?next=/dashboard/article-insertions");
    if (profile.role !== "super_admin") redirect("/dashboard");
    const supabase = await createClient();
    const [{ data }, { data: products }] = await Promise.all([
        supabase.from("article_insertion_settings").select("*").eq("id", true).maybeSingle(),
        supabase.from("products").select("id,name,stock,is_active").eq("is_active", true).order("name"),
    ]);
    const settings = { ...DEFAULT_INSERTION_SETTINGS, ...(data ?? {}) };
    const params = await searchParams;
    return <DashboardLayout profile={profile}>
        <section className="dashboard-hero clay-card"><div><span className="eyebrow">Super Admin • Article Composer</span><h1>Sisipan Artikel</h1><p>Atur Baca Juga, merchandise, iklan HTML, dan pesan sumber saat artikel disalin.</p></div><BookOpenCheck size={42} /></section>
        {param(params, "error") && <p className="cms-alert error">{param(params, "error")}</p>}{param(params, "success") && <p className="cms-alert success">{param(params, "success")}</p>}
        <section className="dashboard-panel clay-card"><form action={saveArticleInsertionsAction} className="article-insertion-form">
            <fieldset><legend>Baca Juga</legend><label className="checkbox"><input name="read_also_enabled" type="checkbox" defaultChecked={settings.read_also_enabled} /><span>Aktif</span></label><label>Setelah paragraf<input name="read_also_paragraph" type="number" min="1" max="20" defaultValue={settings.read_also_paragraph} /></label><label>Label<input name="read_also_label" defaultValue={settings.read_also_label} /></label></fieldset>
            <fieldset><legend>Produk / Merchandise</legend><label className="checkbox"><input name="product_enabled" type="checkbox" defaultChecked={settings.product_enabled} /><span>Aktif</span></label><label>Setelah paragraf<input name="product_paragraph" type="number" min="1" max="20" defaultValue={settings.product_paragraph} /></label><label>Produk<select name="product_id" defaultValue={settings.product_id ?? ""}><option value="">Produk aktif terbaru</option>{products?.map(product => <option value={product.id} key={product.id}>{product.name} — stok {product.stock}</option>)}</select></label></fieldset>
            <fieldset><legend>Iklan HTML</legend><label className="checkbox"><input name="ad_enabled" type="checkbox" defaultChecked={settings.ad_enabled} /><span>Aktif</span></label><label>Setelah paragraf<input name="ad_paragraph" type="number" min="1" max="20" defaultValue={settings.ad_paragraph} /></label><label className="wide">HTML aman<textarea name="ad_html" rows={8} defaultValue={settings.ad_html} placeholder="<div>Materi iklan...</div>" /></label></fieldset>
            <fieldset><legend>Atribusi Copy</legend><label className="wide">Pesan sumber<textarea name="copy_message" rows={3} defaultValue={settings.copy_message} /></label></fieldset>
            <button className="primary-button">Simpan Pengaturan</button>
        </form></section>
    </DashboardLayout>;
}
