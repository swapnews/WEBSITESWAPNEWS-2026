import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ReviewDecisionForm } from "@/components/wartawan/review-decision-form";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isEditorialRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { REVIEW_BASE_PATH, UUID_PATTERN, reviewErrorMessage } from "@/lib/editorial-review";
import "@/styles/wartawan-workspace.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Baca & Review Berita — SwapNews", description: "Baca berita lengkap sebelum memberi keputusan editorial.", robots: { index: false, follow: false } };

export default async function ReviewArticlePage({ params, searchParams }: {
    params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap");
    if (!isEditorialRole(profile.role)) redirect("/dashboard");
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) notFound();
    const supabase = await createClient();
    // Full content fetched only for one article, never inside a list query.
    const { data: article, error } = await supabase.from("articles")
        .select("id,title,content,excerpt,status,author_id,review_version,independent_review_id,author:profiles!articles_author_id_fkey(full_name),category:categories(name)")
        .eq("id", id).maybeSingle();
    const query = await searchParams;
    if (!article && !error) notFound();
    const own = article?.author_id === profile.id;
    const eligible = article && !own && (article.status === "in_review" || (article.status === "published" && !article.independent_review_id));
    const author = Array.isArray(article?.author) ? article.author[0] : article?.author;
    // Opaque sandbox + CSP: stored article HTML cannot run scripts, access session,
    // submit forms, load tracking resources, or escape into the dashboard window.
    const preview = article ? `<!doctype html><html lang="id"><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https://res.cloudinary.com; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none';"><meta name="referrer" content="no-referrer"><style>body{font:17px/1.8 system-ui,sans-serif;color:#243b40;background:#fffcf8;margin:24px;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%;display:block;overflow:auto}p{margin:0 0 1em}blockquote{border-left:3px solid #b45116;padding-left:16px}a{color:#97410e}</style></head><body>${article.content}</body></html>` : "";
    return <DashboardLayout profile={profile}><main className="wartawan-workspace">
        <Link id="review-back-to-queue" href={REVIEW_BASE_PATH} className="secondary-button">Kembali ke antrean</Link>
        <header className="review-detail-heading"><span className="eyebrow">REVIEW INDEPENDEN</span><h1>{article?.title ?? "Artikel gagal dimuat"}</h1>{article && <p>Oleh {author?.full_name || "Penulis SwapNews"} · {article.status === "published" ? "Sudah terbit" : "Belum terbit"} · Versi {article.review_version}</p>}</header>
        {error && <div role="alert" className="auth-alert error">{reviewErrorMessage(error.message, error.code)} <Link href={`${REVIEW_BASE_PATH}/${id}`}>Coba lagi</Link></div>}
        {typeof query.error === "string" && <div role="alert" className="auth-alert error">{query.error} <Link href={`${REVIEW_BASE_PATH}/${id}`}>Muat versi terbaru</Link></div>}
        {article && <div className="review-detail-layout">
            <section className="review-reading-pane" aria-label="Isi lengkap berita"><h2>Isi lengkap</h2><iframe id="review-full-content" title="Isi lengkap artikel untuk review" srcDoc={preview} sandbox="" referrerPolicy="no-referrer" /></section>
            <aside className="review-decision-pane"><h2>Keputusan review</h2>{eligible ? <ReviewDecisionForm id={id} version={Number(article.review_version)} published={article.status === "published"} /> : <p role="status">{own ? "Artikel sendiri tidak dapat direview. Terbit langsung tetap 0 poin; minta reviewer berbeda untuk persetujuan." : "Artikel sudah diproses atau belum dikirim untuk review. Tidak ada keputusan baru yang dapat disimpan."}</p>}<Link id="review-edit-article" className="secondary-button" href={`/dashboard/articles/${id}`}>Buka editor</Link><p className="review-help">Perubahan isi membatalkan persetujuan versi lama dan membutuhkan review ulang. Poin tidak diberikan dua kali.</p></aside>
        </div>}
    </main></DashboardLayout>;
}
