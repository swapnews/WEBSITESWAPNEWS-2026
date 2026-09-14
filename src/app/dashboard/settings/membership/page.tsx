import { redirect } from "next/navigation";
import { Crown, Save, CheckCircle2, ShieldAlert } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getSiteConfig } from "@/lib/site-config";
import { updateMembershipSettingsAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = {
    title: "Pengaturan Membership — Dashboard SwapNews",
    description: "Kelola harga, deskripsi, dan benefit paket membership tahunan.",
};

export default async function MembershipSettingsPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap?next=/dashboard/settings/membership");
    if (profile.role !== "super_admin") redirect("/dashboard?error=Akses%20khusus%20Super%20Admin");

    const config = await getSiteConfig();
    const params = await searchParams;
    const successMsg = typeof params.success === "string" ? params.success : "";
    const errorMsg = typeof params.error === "string" ? params.error : "";

    return (
        <div className="membership-settings-page" style={{ maxWidth: 840, margin: "0 auto" }}>
            <header className="dash-header" style={{ marginBottom: 24 }}>
                <div>
                    <span className="dash-header-eyebrow">PENGATURAN MONETISASI</span>
                    <h1 className="dash-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Crown size={28} style={{ color: "var(--dash-accent, #f97316)" }} />
                        Paket Membership Tahunan
                    </h1>
                    <p className="dash-page-desc">
                        Ubah harga, nama paket, deskripsi, dan poin keuntungan member secara dinamis tanpa perlu deploy ulang kode.
                    </p>
                </div>
            </header>

            {successMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderRadius: 12, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", marginBottom: 20, fontSize: 13, fontWeight: 700 }}>
                    <CheckCircle2 size={18} /> {successMsg}
                </div>
            )}

            {errorMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", marginBottom: 20, fontSize: 13, fontWeight: 700 }}>
                    <ShieldAlert size={18} /> {errorMsg}
                </div>
            )}

            <div className="dashboard-panel" style={{ background: "#ffffff", padding: 28, borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <form action={updateMembershipSettingsAction} style={{ display: "grid", gap: 20 }}>
                    <label style={{ display: "grid", gap: 8 }}>
                        <strong style={{ fontSize: 14, color: "#000000" }}>Harga Membership Tahunan (Rp)</strong>
                        <input
                            name="price_idr"
                            type="number"
                            min="1000"
                            step="100"
                            defaultValue={config.membership_price_idr}
                            required
                            style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14, color: "#000000", fontWeight: 700 }}
                        />
                        <small style={{ color: "#64748b", fontSize: 12 }}>
                            Contoh: <code>49900</code> untuk Rp49.900/tahun. Nilai ini otomatis digunakan pada payment gateway Pakasir.
                        </small>
                    </label>

                    <label style={{ display: "grid", gap: 8 }}>
                        <strong style={{ fontSize: 14, color: "#000000" }}>Judul Paket</strong>
                        <input
                            name="title"
                            type="text"
                            defaultValue={config.membership_title}
                            required
                            maxLength={100}
                            style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14, color: "#000000" }}
                        />
                    </label>

                    <label style={{ display: "grid", gap: 8 }}>
                        <strong style={{ fontSize: 14, color: "#000000" }}>Deskripsi / Sub-headline</strong>
                        <textarea
                            name="description"
                            rows={3}
                            defaultValue={config.membership_description}
                            maxLength={500}
                            style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14, color: "#000000", resize: "vertical" }}
                        />
                    </label>

                    <label style={{ display: "grid", gap: 8 }}>
                        <strong style={{ fontSize: 14, color: "#000000" }}>Daftar Keuntungan Member (1 baris per poin)</strong>
                        <textarea
                            name="benefits"
                            rows={5}
                            defaultValue={config.membership_benefits.join("\n")}
                            placeholder={"Artikel eksklusif tanpa batas\nPengalaman baca bebas iklan\nBadge member terverifikasi"}
                            style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14, color: "#000000", resize: "vertical", fontFamily: "inherit" }}
                        />
                        <small style={{ color: "#64748b", fontSize: 12 }}>
                            Setiap baris baru akan dijadikan item centang pada kartu membership frontend.
                        </small>
                    </label>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
                        <button
                            type="submit"
                            className="primary-button"
                            style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 24px", borderRadius: 10, background: "var(--dash-accent, #f97316)", color: "#fff", border: "none", fontWeight: 800, cursor: "pointer" }}
                        >
                            <Save size={16} /> Simpan Pengaturan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
