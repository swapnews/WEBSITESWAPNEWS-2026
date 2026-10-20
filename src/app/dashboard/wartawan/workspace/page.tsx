import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, FileCheck2, XCircle } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isEditorialRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { REVIEW_BASE_PATH, REVIEW_QUEUE_FILTER, REVIEW_FILTERS, reviewCursor, reviewErrorMessage, type ReviewFilter } from "@/lib/editorial-review";
import { AvatarUpload } from "@/components/wartawan/avatar-upload";
import { DashboardLayout } from "@/components/dashboard-layout";
import "@/styles/wartawan-workspace.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review Editorial — SwapNews", description: "Ruang kerja penulis dan reviewer SwapNews.", robots: { index: false, follow: false } };

type QueueArticle = { id: string; title: string; excerpt: string | null; status: string; created_at: string; author: { full_name: string | null } | null; category: { name: string } | null };
type HistoryRow = { id: string; article_id: string; title: string; decision: string; note: string; created_at: string };
type Stats = Record<ReviewFilter, number>;
const labels = { queue: "Antrean review", approved: "Disetujui", completed: "Review selesai", revision: "Revisi" };
const icons = { queue: Clock3, approved: CheckCircle2, completed: FileCheck2, revision: XCircle };
const decisions: Record<string, string> = { published: "Disetujui", revision: "Minta revisi", rejected: "Ditolak" };

export default async function WartawanWorkspacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const profile = await getCurrentProfile();
    if (!profile) redirect(`/panelswap?next=${REVIEW_BASE_PATH}`);
    if (!isEditorialRole(profile.role)) redirect("/dashboard");
    const params = await searchParams;
    const param = (key: string) => typeof params[key] === "string" ? params[key] as string : undefined;
    const filter: ReviewFilter = REVIEW_FILTERS.includes(param("filter") as ReviewFilter) ? param("filter") as ReviewFilter : "queue";
    const cursor = reviewCursor(param("before"), param("before_id"));
    const supabase = await createClient();
    let queueQuery = supabase.from("articles")
        .select("id,title,excerpt,status,created_at,author:profiles!articles_author_id_fkey(full_name),category:categories(name)")
        .neq("author_id", profile.id).or(REVIEW_QUEUE_FILTER)
        .order("created_at", { ascending: true }).order("id", { ascending: true }).limit(21);
    if (cursor) queueQuery = queueQuery.or(`created_at.gt.${cursor.date},and(created_at.eq.${cursor.date},id.gt.${cursor.id})`);
    const [statsResult, balanceResult, listResult] = await Promise.all([
        supabase.rpc("editorial_review_stats"),
        supabase.rpc("point_balance", { target_user: profile.id }),
        filter === "queue" ? queueQuery : supabase.rpc("editorial_review_history", {
            p_filter: filter, p_before: cursor?.date ?? null, p_before_id: cursor?.id ?? null,
        }),
    ]);
    const stats = statsResult.error ? null : statsResult.data as Stats | null;
    const queue = filter === "queue" ? (listResult.data ?? []) as unknown as QueueArticle[] : [];
    const history = filter !== "queue" ? (listResult.data ?? []) as HistoryRow[] : [];
    const rows = filter === "queue" ? queue : history;
    const last = rows.slice(0, 20).at(-1);
    const next = new URLSearchParams({ filter });
    if (last) { next.set("before", last.created_at); next.set("before_id", last.id); }
    const loadError = statsResult.error ?? listResult.error;
    return (
        <DashboardLayout profile={profile}>
            <main className="wartawan-workspace">
                <section className="wartawan-hero">
                    <AvatarUpload avatarUrl={profile.avatar_url} name={profile.full_name || "Penulis SwapNews"} />
                    <div className="wartawan-intro">
                        <span className="eyebrow">RUANG KERJA EDITORIAL</span>
                        <h1>Halo, <Link id="wartawan-profile-name" href="/profile">{profile.full_name || "Penulis SwapNews"}</Link></h1>
                        <p>Terbit sendiri tanpa poin. Persetujuan reviewer berbeda memberi 10 poin, maksimal sekali per artikel.</p>
                        <div className="wartawan-hero-actions">
                            <Link id="wartawan-new-article" href="/dashboard/articles/new" className="primary-button">Tulis berita</Link>
                            <Link id="wartawan-manage-articles" href="/dashboard/articles" className="secondary-button">{profile.role === "wartawan" ? "Berita saya" : "Artikel redaksi"}</Link>
                            <Link id="wartawan-edit-profile" href="/profile" className="secondary-button">Edit profil</Link>
                        </div>
                    </div>
                    <div className="wartawan-points"><small>POIN ANDA</small><strong>{balanceResult.error ? "—" : balanceResult.data ?? 0}</strong><span>{balanceResult.error ? "Saldo gagal dimuat" : "1 poin = Rp1.000"}</span></div>
                </section>
                {param("success") && <div role="status" className="wartawan-notice">{param("success")}</div>}
                {param("error") && <div role="alert" className="auth-alert error">{param("error")}</div>}
                {loadError && <div role="alert" className="auth-alert error">{reviewErrorMessage(loadError.message, loadError.code)} <Link href={REVIEW_BASE_PATH}>Coba lagi</Link></div>}
                <nav className="wartawan-metrics" aria-label="Filter review">
                    {REVIEW_FILTERS.map(key => { const Icon = icons[key]; return <Link id={`review-filter-${key}`} key={key} href={`${REVIEW_BASE_PATH}?filter=${key}`} className={`review-metric${key === filter ? " active" : ""}`} aria-current={key === filter ? "page" : undefined}><Icon aria-hidden="true" /><small>{labels[key]}</small><strong>{stats?.[key] ?? "—"}</strong></Link>; })}
                </nav>
                <section className="wartawan-queue">
                    <div className="wartawan-section-head"><div><span className="eyebrow">{filter === "queue" ? "ANTREAN EDITORIAL" : "KEPUTUSAN ANDA"}</span><h2>{filter === "queue" ? "Berita penulis lain menunggu review" : labels[filter]}</h2></div><span>{stats?.[filter] ?? "—"} artikel</span></div>
                    <p className="review-help">{filter === "queue" ? "Termasuk berita terbit langsung yang belum lolos review independen. Baca isi lengkap sebelum memutuskan." : "Keputusan terakhir Anda per artikel; tidak berubah saat status publikasi diedit orang lain."}</p>
                    {listResult.error ? <div className="wartawan-empty"><h3>Daftar belum tersedia</h3><p>Muat ulang setelah koneksi atau migrasi database diperiksa.</p></div> : !rows.length ? <div className="wartawan-empty"><CheckCircle2 size={32} /><h3>{filter === "queue" ? "Antrean bersih" : "Belum ada keputusan"}</h3><p>{filter === "queue" ? "Belum ada berita penulis lain yang perlu direview." : "Hasil keputusan Anda akan tercatat di sini."}</p></div> : (
                        <div className="wartawan-review-grid">
                            {filter === "queue" ? queue.slice(0, 20).map(article => {
                                const author = Array.isArray(article.author) ? article.author[0] : article.author;
                                const category = Array.isArray(article.category) ? article.category[0] : article.category;
                                return <article className="wartawan-review-card" key={article.id}><div className="review-meta"><span>{category?.name || "Umum"}</span><span>{article.status === "published" ? "Terbit · belum direview" : "Menunggu review"}</span></div><h3>{article.title}</h3><p>{article.excerpt || "Baca isi lengkap untuk menilai berita ini."}</p><small>Oleh {author?.full_name || "Penulis SwapNews"}</small><Link id={`open-review-${article.id}`} className="secondary-button" href={`${REVIEW_BASE_PATH}/${article.id}`}>Baca & review</Link></article>;
                            }) : history.slice(0, 20).map(row => <article className="wartawan-review-card" key={row.id}><div className="review-meta"><span>{decisions[row.decision] ?? row.decision}</span><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleDateString("id-ID")}</time></div><h3>{row.title}</h3>{row.note && <p>{row.note}</p>}<Link id={`review-history-${row.id}`} className="secondary-button" href={`${REVIEW_BASE_PATH}/${row.article_id}`}>Buka artikel</Link></article>)}
                        </div>
                    )}
                    <nav className="wartawan-hero-actions" aria-label="Halaman review">
                        {cursor && <Link id="review-first-page" className="secondary-button" href={`${REVIEW_BASE_PATH}?filter=${filter}`}>Halaman pertama</Link>}
                        {rows.length > 20 && <Link id="review-next-page" className="secondary-button" href={`${REVIEW_BASE_PATH}?${next}`}>Berikutnya</Link>}
                    </nav>
                </section>
            </main>
        </DashboardLayout>
    );
}
