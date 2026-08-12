import { redirect } from "next/navigation";
import { Clapperboard, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { deleteReelAction, saveReelAction } from "@/lib/content-management/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Instagram Reels" };
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const param = (params: Record<string, string | string[] | undefined>, key: string) => Array.isArray(params[key]) ? params[key]?.[0] : params[key];

export default async function ReelsPage({ searchParams }: Props) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap?next=/dashboard/reels");
    if (profile.role !== "super_admin") redirect("/dashboard");
    const params = await searchParams;
    const supabase = await createClient();
    const { data: reels = [], error } = await supabase.from("social_reels").select("id,instagram_url,embed_url,title,caption,sort_order,is_active").order("sort_order");
    const reelRows = reels ?? [];
    const slots = Array.from({ length: 10 }, (_, index) => reelRows.find((item) => item.sort_order === index + 1) ?? reelRows[index] ?? null);

    return <DashboardLayout profile={profile}>
        <section className="dashboard-hero clay-card"><div><span className="eyebrow">10 Slot Social Video</span><h1>Instagram Reels Slider</h1><p>Isi maksimal 10 URL Reel publik. Setiap slot otomatis tampil sebagai carousel yang dapat digeser di homepage.</p></div><Clapperboard size={42} /></section>
        {(param(params, "error") || error) && <p className="cms-alert error">{param(params, "error") || error?.message}</p>}
        {param(params, "success") && <p className="cms-alert success">{param(params, "success")}</p>}
        <section className="dashboard-panel clay-card reels-slot-panel">
            <div className="reels-slot-heading"><div><span className="eyebrow">Slider Configuration</span><h2>10 Slot Instagram</h2><p>Tempel URL, beri judul, lalu simpan. Urutan mengikuti nomor slot.</p></div><strong>{reelRows.length}/10 TERISI</strong></div>
            <div className="reels-slot-grid">{slots.map((reel, index) => <article className={`reels-slot-card ${reel ? "filled" : "empty"}`} key={reel?.id ?? `slot-${index}`}>
                <div className="reels-slot-number"><span>SLOT</span><b>{String(index + 1).padStart(2, "0")}</b><i>{reel?.is_active ? "AKTIF" : reel ? "NONAKTIF" : "KOSONG"}</i></div>
                {reel ? <>
                    <div className="reel-admin-preview"><iframe src={reel.embed_url} title={reel.title} loading="lazy" allow="encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" /></div>
                    <form action={saveReelAction} className="reel-slot-form"><input type="hidden" name="id" value={reel.id} /><input type="hidden" name="sort_order" value={index + 1} /><label>URL Reel<input name="instagram_url" type="url" required defaultValue={reel.instagram_url} /></label><label>Judul<input name="title" required defaultValue={reel.title} /></label><label>Caption<textarea name="caption" rows={2} defaultValue={reel.caption ?? ""} /></label><label className="checkbox"><input name="is_active" type="checkbox" defaultChecked={reel.is_active} /><span>Tampilkan</span></label><button className="primary-button">Update Slot</button></form>
                    <form action={deleteReelAction} className="reel-slot-delete"><input type="hidden" name="id" value={reel.id} /><button className="secondary-button danger"><Trash2 size={14} /> Kosongkan Slot</button></form>
                </> : <form action={saveReelAction} className="reel-slot-form empty-form"><input type="hidden" name="sort_order" value={index + 1} /><div className="empty-reel-icon"><Clapperboard /></div><label>URL Instagram Reel<input name="instagram_url" type="url" required placeholder="https://www.instagram.com/reel/..." /></label><label>Judul<input name="title" required placeholder={`Judul Reel ${index + 1}`} /></label><label>Caption<textarea name="caption" rows={2} placeholder="Caption singkat..." /></label><input type="hidden" name="is_active" value="on" /><button className="primary-button">Isi Slot {index + 1}</button></form>}
            </article>)}</div>
        </section>
    </DashboardLayout>;
}
