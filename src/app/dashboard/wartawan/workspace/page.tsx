import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, FileCheck2, UserRound, XCircle } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { reviewMemberArticleAction } from "@/lib/wartawan/review-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard Wartawan — SwapNews", description: "Ruang kerja wartawan SwapNews." };

export default async function WartawanWorkspacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap?next=/dashboard/wartawan/workspace");
    if (profile.role !== "wartawan") redirect("/dashboard");
    const supabase = await createClient();
    const [{ data: queue }, { data: mine }, { data: balance }] = await Promise.all([
        supabase.from("articles").select("id,title,excerpt,content,created_at,author:profiles!articles_author_id_fkey(full_name,email),category:categories(name)").eq("status", "in_review").order("created_at", { ascending: true }).limit(20),
        supabase.from("articles").select("id,status,reviewed_at").eq("reviewed_by", profile.id).order("reviewed_at", { ascending: false }).limit(100),
        supabase.rpc("point_balance", { target_user: profile.id }),
    ]);
    const params = await searchParams;
    const message = typeof params.success === "string" ? params.success : typeof params.error === "string" ? params.error : "";
    const approved = (mine ?? []).filter((x) => x.status === "published").length;
    const revision = (mine ?? []).filter((x) => x.status === "revision").length;
    return <main className="wartawan-workspace">
        <section className="wartawan-hero">
            <div className="wartawan-avatar"><UserRound size={30} /></div>
            <div><span className="eyebrow">RUANG KERJA WARTAWAN</span><h1>Halo, {profile.full_name || "Wartawan SwapNews"}</h1><p>Review berita member dengan teliti, cepat, dan berintegritas.</p></div>
            <div className="wartawan-points"><small>POIN ANDA</small><strong>{balance ?? 0}</strong><span>1 poin = Rp1.000</span></div>
        </section>
        {message && <div className="wartawan-notice">{message}</div>}
        <section className="wartawan-metrics"><article><Clock3 /><small>Antrean review</small><strong>{queue?.length ?? 0}</strong></article><article><CheckCircle2 /><small>Disetujui</small><strong>{approved}</strong></article><article><FileCheck2 /><small>Review selesai</small><strong>{mine?.length ?? 0}</strong></article><article><XCircle /><small>Revisi</small><strong>{revision}</strong></article></section>
        <section className="wartawan-queue"><div className="wartawan-section-head"><div><span className="eyebrow">ANTREAN EDITORIAL</span><h2>Berita member menunggu review</h2></div><span>{queue?.length ?? 0} artikel</span></div>
            {!queue?.length ? <div className="wartawan-empty"><CheckCircle2 size={32} /><h3>Antrean bersih</h3><p>Belum ada kiriman member yang perlu direview.</p></div> : <div className="wartawan-review-grid">{queue.map((article) => { const author = Array.isArray(article.author) ? article.author[0] : article.author; const category = Array.isArray(article.category) ? article.category[0] : article.category; return <article className="wartawan-review-card" key={article.id}><div className="review-meta"><span>{category?.name || "Umum"}</span><time>{new Date(article.created_at).toLocaleDateString("id-ID")}</time></div><h3>{article.title}</h3><p>{article.excerpt || article.content.replace(/<[^>]+>/g, " ").slice(0, 220)}...</p><small>Oleh {author?.full_name || author?.email || "Member"}</small><details><summary>Buka panel keputusan</summary><form action={reviewMemberArticleAction}><input type="hidden" name="id" value={article.id} /><textarea name="note" placeholder="Catatan editorial (wajib untuk revisi/penolakan)" rows={3} /><div className="review-actions"><button name="decision" value="published" className="review-approve">Setujui & publikasikan</button><button name="decision" value="revision" className="review-revise">Minta revisi</button><button name="decision" value="rejected" className="review-reject">Tolak</button></div></form></details></article>; })}</div>}
        </section>
    </main>;
}
