import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isAdminRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/dashboard-layout";
import { approveWartawanAction, rejectWartawanAction } from "@/lib/wartawan/actions";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Verifikasi Wartawan — SwapNews Dashboard",
    description: "Review dan verifikasi pendaftaran wartawan SwapNews.",
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

    const supabase = await createClient();

    const { data: pendingWartawan } = await supabase
        .from("profiles")
        .select("id,email,full_name,whatsapp,ktp_url,instagram_handle,address,username,wartawan_status,created_at")
        .eq("wartawan_status", "pending")
        .order("created_at", { ascending: false });

    const { data: allWartawan } = await supabase
        .from("profiles")
        .select("id,email,full_name,wartawan_status,created_at")
        .in("wartawan_status", ["approved", "rejected"])
        .order("created_at", { ascending: false })
        .limit(50);

    const params = await searchParams;
    const error = getParam(params, "error");
    const success = getParam(params, "success");

    return (
        <DashboardLayout profile={profile}>
            <section className="dashboard-hero clay-card">
                <div>
                    <span className="eyebrow">Verifikasi Wartawan</span>
                    <h1>Pendaftaran Wartawan</h1>
                    <p>Review dan setujui pendaftaran wartawan / penulis untuk SWAPNEWS.CO.ID</p>
                </div>
                <Link href="/dashboard" className="secondary-button">
                    <ArrowLeft size={16} /> Kembali
                </Link>
            </section>

            {error ? <div className="auth-alert error" style={{ margin: "0 0 16px" }}>{error}</div> : null}
            {success ? <div className="auth-alert success" style={{ margin: "0 0 16px" }}>{success}</div> : null}

            <section className="dashboard-panel clay-card">
                <h2>Menunggu Verifikasi ({pendingWartawan?.length ?? 0})</h2>

                {!pendingWartawan?.length ? (
                    <p>Tidak ada pendaftaran wartawan yang menunggu verifikasi.</p>
                ) : (
                    <div className="wartawan-list">
                        {pendingWartawan.map((w) => (
                            <article key={w.id} className="wartawan-card clay-card" style={{ padding: 20, marginBottom: 16 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <div>
                                        <small style={{ color: "var(--teal-muted)", fontWeight: 700 }}>NAMA LENGKAP</small>
                                        <p style={{ fontWeight: 600, fontSize: 16 }}>{w.full_name || "—"}</p>
                                    </div>
                                    <div>
                                        <small style={{ color: "var(--teal-muted)", fontWeight: 700 }}>USERNAME</small>
                                        <p>{w.username || "—"}</p>
                                    </div>
                                    <div>
                                        <small style={{ color: "var(--teal-muted)", fontWeight: 700 }}>EMAIL</small>
                                        <p>{w.email}</p>
                                    </div>
                                    <div>
                                        <small style={{ color: "var(--teal-muted)", fontWeight: 700 }}>WHATSAPP</small>
                                        <p>
                                            <a href={`https://wa.me/${w.whatsapp?.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--teal-primary)" }}>
                                                {w.whatsapp || "—"}
                                            </a>
                                        </p>
                                    </div>
                                    <div>
                                        <small style={{ color: "var(--teal-muted)", fontWeight: 700 }}>INSTAGRAM</small>
                                        <p>{w.instagram_handle || "—"}</p>
                                    </div>
                                    <div>
                                        <small style={{ color: "var(--teal-muted)", fontWeight: 700 }}>ALAMAT</small>
                                        <p>{w.address || "—"}</p>
                                    </div>
                                </div>

                                {w.ktp_url ? (
                                    <div style={{ marginTop: 12 }}>
                                        <small style={{ color: "var(--teal-muted)", fontWeight: 700 }}>FOTO KTP</small>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={w.ktp_url}
                                            alt={`KTP ${w.full_name}`}
                                            style={{ width: "100%", maxHeight: 240, objectFit: "contain", borderRadius: 8, marginTop: 6, border: "1px solid rgba(0,0,0,0.1)" }}
                                        />
                                    </div>
                                ) : null}

                                <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                                    <form action={approveWartawanAction}>
                                        <input type="hidden" name="user_id" value={w.id} />
                                        <button type="submit" className="primary-button" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <CheckCircle2 size={16} /> Setujui Sebagai Wartawan
                                        </button>
                                    </form>
                                    <form action={rejectWartawanAction}>
                                        <input type="hidden" name="user_id" value={w.id} />
                                        <button
                                            type="submit"
                                            className="secondary-button danger"
                                            style={{ display: "flex", alignItems: "center", gap: 6 }}
                                            onClick={(e) => { if (typeof window !== "undefined" && !confirm("Yakin ingin menolak pendaftaran wartawan ini?")) e.preventDefault(); }}
                                        >
                                            <XCircle size={16} /> Tolak Pendaftaran
                                        </button>
                                    </form>
                                </div>

                                <small style={{ color: "var(--teal-muted)", marginTop: 8, display: "block" }}>
                                    Didaftarkan {new Date(w.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                                </small>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="dashboard-panel clay-card" style={{ marginTop: 24 }}>
                <h2>Riwayat Verifikasi</h2>
                {!allWartawan?.length ? (
                    <p>Belum ada riwayat verifikasi wartawan.</p>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ textAlign: "left", borderBottom: "2px solid rgba(0,0,0,0.08)" }}>
                                <th style={{ padding: "8px 12px" }}>Nama</th>
                                <th style={{ padding: "8px 12px" }}>Email</th>
                                <th style={{ padding: "8px 12px" }}>Status</th>
                                <th style={{ padding: "8px 12px" }}>Tanggal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allWartawan.map((w) => (
                                <tr key={w.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                                    <td style={{ padding: "8px 12px" }}>{w.full_name || "—"}</td>
                                    <td style={{ padding: "8px 12px" }}>{w.email}</td>
                                    <td style={{ padding: "8px 12px" }}>
                                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: w.wartawan_status === "approved" ? "#d1fae5" : "#fecaca", color: w.wartawan_status === "approved" ? "#065f46" : "#991b1b" }}>
                                            {w.wartawan_status === "approved" ? "Disetujui" : "Ditolak"}
                                        </span>
                                    </td>
                                    <td style={{ padding: "8px 12px" }}>{new Date(w.created_at).toLocaleDateString("id-ID")}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </DashboardLayout>
    );
}
