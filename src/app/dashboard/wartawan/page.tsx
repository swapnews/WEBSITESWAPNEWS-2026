/* eslint-disable @next/next/no-img-element -- KTP memakai URL private/dinamis dan tidak boleh melewati Next Image Optimization proxy. */
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Award, CheckCircle2, Eye, FileCheck2, Files, UserRoundCheck, XCircle } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard-layout";
import { getWartawanContributionStats } from "@/lib/articles";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isAdminRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { approveWartawanAction, rejectWartawanAction } from "@/lib/wartawan/actions";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Wartawan — SwapNews Dashboard",
    description: "Verifikasi wartawan dan pantau artikel published serta points kontribusi.",
};

type WartawanDashboardPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

export default async function WartawanDashboardPage({ searchParams }: WartawanDashboardPageProps) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap?next=/dashboard/wartawan");
    if (!isAdminRole(profile.role)) redirect("/dashboard?error=Akses%20khusus%20Admin");

    const params = await searchParams;
    const tab = getParam(params, "tab") === "hasil" ? "hasil" : "pendaftaran";
    const error = getParam(params, "error");
    const success = getParam(params, "success");
    const supabase = await createClient();

    const [{ data: pendingWartawan }, { data: verificationHistory }, contributionStats] = await Promise.all([
        supabase
            .from("profiles")
            .select("id,email,full_name,whatsapp,ktp_url,instagram_handle,address,username,wartawan_status,created_at")
            .eq("wartawan_status", "pending")
            .order("created_at", { ascending: false }),
        supabase
            .from("profiles")
            .select("id,email,full_name,wartawan_status,created_at")
            .in("wartawan_status", ["approved", "rejected"])
            .order("created_at", { ascending: false })
            .limit(50),
        getWartawanContributionStats(),
    ]);

    const publishedTotal = contributionStats.reduce((sum, item) => sum + item.published_articles, 0);
    const articlePointsTotal = contributionStats.reduce((sum, item) => sum + item.article_points, 0);
    const viewsTotal = contributionStats.reduce((sum, item) => sum + item.total_views, 0);

    return (
        <DashboardLayout profile={profile}>
            <section className="dashboard-hero clay-card">
                <div>
                    <span className="eyebrow">Wartawan Desk</span>
                    <h1>Wartawan & Hasil Tulisan</h1>
                    <p>Verifikasi akun, pantau jumlah berita published, performa pembaca, dan points hasil artikel.</p>
                </div>
                <Link href="/dashboard" className="secondary-button"><ArrowLeft size={16} /> Kembali</Link>
            </section>

            {error ? <div className="auth-alert error wartawan-alert">{error}</div> : null}
            {success ? <div className="auth-alert success wartawan-alert">{success}</div> : null}

            <nav className="wartawan-tabs" aria-label="Navigasi wartawan">
                <Link id="wartawan-tab-registration" href="/dashboard/wartawan?tab=pendaftaran" className={tab === "pendaftaran" ? "active" : ""}>
                    <UserRoundCheck size={17} /> Pendaftaran
                    {(pendingWartawan?.length ?? 0) > 0 ? <span>{pendingWartawan?.length}</span> : null}
                </Link>
                <Link id="wartawan-tab-results" href="/dashboard/wartawan?tab=hasil" className={tab === "hasil" ? "active" : ""}>
                    <FileCheck2 size={17} /> Hasil Tulisan
                    <span>{contributionStats.length}</span>
                </Link>
            </nav>

            {tab === "hasil" ? (
                <>
                    <section className="wartawan-summary-grid" aria-label="Ringkasan kontribusi wartawan">
                        <article><Files /><span>Berita Published</span><strong>{publishedTotal.toLocaleString("id-ID")}</strong><small>Atas nama wartawan approved</small></article>
                        <article><Award /><span>Points dari Artikel</span><strong>{articlePointsTotal.toLocaleString("id-ID")}</strong><small>Total ledger article_approved</small></article>
                        <article><Eye /><span>Total Pembaca</span><strong>{viewsTotal.toLocaleString("id-ID")}</strong><small>View berita published</small></article>
                    </section>

                    <section className="dashboard-panel clay-card wartawan-results-panel">
                        <div className="panel-heading-row">
                            <div><span className="eyebrow">Akuntabilitas Redaksi</span><h2>Kontribusi per Wartawan</h2></div>
                            <p>{contributionStats.length} wartawan aktif</p>
                        </div>
                        <div className="cms-table-wrap">
                            <table className="cms-table wartawan-results-table">
                                <thead><tr><th>Wartawan</th><th>Total Artikel</th><th>Published</th><th>Draft / Proses</th><th>Views</th><th>Points Artikel</th><th>Saldo Points</th><th>Aksi</th></tr></thead>
                                <tbody>
                                    {!contributionStats.length ? (
                                        <tr><td colSpan={8} className="cms-empty">Belum ada wartawan approved.</td></tr>
                                    ) : contributionStats.map((item) => (
                                        <tr key={item.id}>
                                            <td><div className="wartawan-identity"><strong>{item.full_name ?? item.username ?? "Tanpa nama"}</strong><small>{item.email}</small></div></td>
                                            <td>{item.total_articles.toLocaleString("id-ID")}</td>
                                            <td><strong className="published-number">{item.published_articles.toLocaleString("id-ID")}</strong></td>
                                            <td>{item.workflow_articles.toLocaleString("id-ID")}</td>
                                            <td>{item.total_views.toLocaleString("id-ID")}</td>
                                            <td><span className="points-pill"><Award size={14} /> {item.article_points.toLocaleString("id-ID")}</span></td>
                                            <td>{item.points_balance.toLocaleString("id-ID")}</td>
                                            <td><Link className="secondary-button compact-button" href={`/dashboard/articles?author=${item.id}`}>Lihat Artikel</Link></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            ) : (
                <>
                    <section className="dashboard-panel clay-card">
                        <h2>Menunggu Verifikasi ({pendingWartawan?.length ?? 0})</h2>
                        {!pendingWartawan?.length ? <p>Tidak ada pendaftaran wartawan yang menunggu verifikasi.</p> : (
                            <div className="wartawan-list">
                                {pendingWartawan.map((item) => (
                                    <article key={item.id} className="wartawan-card clay-card">
                                        <div className="wartawan-profile-grid">
                                            <div><small>Nama Lengkap</small><p>{item.full_name || "—"}</p></div>
                                            <div><small>Username</small><p>{item.username || "—"}</p></div>
                                            <div><small>Email</small><p>{item.email}</p></div>
                                            <div><small>WhatsApp</small><p><a href={`https://wa.me/${item.whatsapp?.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{item.whatsapp || "—"}</a></p></div>
                                            <div><small>Instagram</small><p>{item.instagram_handle || "—"}</p></div>
                                            <div><small>Alamat</small><p>{item.address || "—"}</p></div>
                                        </div>
                                        {item.ktp_url ? <div className="wartawan-ktp"><small>Foto KTP</small><img src={item.ktp_url} alt={`KTP ${item.full_name ?? "wartawan"}`} /></div> : null}
                                        <div className="wartawan-card-actions">
                                            <form action={approveWartawanAction}><input type="hidden" name="user_id" value={item.id} /><button type="submit" className="primary-button"><CheckCircle2 size={16} /> Setujui Sebagai Wartawan</button></form>
                                            <form action={rejectWartawanAction}><input type="hidden" name="user_id" value={item.id} /><button type="submit" className="secondary-button danger"><XCircle size={16} /> Tolak Pendaftaran</button></form>
                                        </div>
                                        <small className="wartawan-created">Didaftarkan {new Date(item.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</small>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="dashboard-panel clay-card verification-history">
                        <h2>Riwayat Verifikasi</h2>
                        {!verificationHistory?.length ? <p>Belum ada riwayat verifikasi wartawan.</p> : (
                            <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Nama</th><th>Email</th><th>Status</th><th>Tanggal</th></tr></thead><tbody>{verificationHistory.map((item) => (
                                <tr key={item.id}><td>{item.full_name || "—"}</td><td>{item.email}</td><td><span className={`verification-badge ${item.wartawan_status === "approved" ? "approved" : "rejected"}`}>{item.wartawan_status === "approved" ? "Disetujui" : "Ditolak"}</span></td><td>{new Date(item.created_at).toLocaleDateString("id-ID")}</td></tr>
                            ))}</tbody></table></div>
                        )}
                    </section>
                </>
            )}
        </DashboardLayout>
    );
}
