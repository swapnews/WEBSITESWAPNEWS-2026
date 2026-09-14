"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Sparkles, CheckCircle2, ShieldCheck, Zap, Crown,
    Gift, AlertCircle, ArrowRight, LoaderCircle, Lock
} from "lucide-react";
import type { SiteConfigMap } from "@/lib/site-config";
import type { Profile } from "@/lib/auth/get-profile";
import type { MembershipDetails } from "@/lib/membership/actions";
import { startFreeTrialAction } from "@/lib/membership/actions";
import MembershipCheckoutButton from "./checkout-button";

type Props = {
    config: SiteConfigMap;
    profile: Profile | null;
    membershipDetails: MembershipDetails;
};

export default function MembershipClientView({ config, profile, membershipDetails }: Props) {
    const router = useRouter();
    const [isActivatingTrial, setIsActivatingTrial] = useState(false);
    const [trialMessage, setTrialMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const formattedPrice = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(config.membership_price_idr);

    const handleClaimTrial = async () => {
        if (!profile) {
            router.push("/panelswap?redirect=/membership");
            return;
        }

        setIsActivatingTrial(true);
        setTrialMessage(null);
        try {
            const res = await startFreeTrialAction();
            if (res.error) {
                setTrialMessage({ type: "error", text: res.error });
            } else if (res.success) {
                setTrialMessage({ type: "success", text: res.success });
                router.refresh();
            }
        } catch (err: unknown) {
            setTrialMessage({ type: "error", text: err instanceof Error ? err.message : "Terjadi kesalahan." });
        } finally {
            setIsActivatingTrial(false);
        }
    };

    return (
        <div style={{ background: "#f8fafc", minHeight: "100vh", padding: "40px 16px 80px" }}>
            <div style={{ maxWidth: 1040, margin: "0 auto" }}>
                {/* Hero Header */}
                <header style={{ textAlign: "center", marginBottom: 48 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 99, background: "linear-gradient(135deg, #fff3e8, #fef3c7)", border: "1px solid #fcd34d", color: "#d97706", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
                        <Sparkles size={15} />
                        Akses Jurnalistik Independen & Fitur Eksklusif
                    </div>
                    <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.03em", margin: "0 0 16px", lineHeight: 1.15 }}>
                        {config.membership_title || "SwapNews Premium Membership"}
                    </h1>
                    <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#475569", maxWidth: 640, margin: "0 auto", lineHeight: 1.6 }}>
                        {config.membership_description || "Dukung independensi redaksi dan dapatkan akses tanpa batas ke semua artikel eksklusif, pengalaman bebas iklan, serta pengumpulan poin member."}
                    </p>
                </header>

                {trialMessage && (
                    <div style={{ maxWidth: 720, margin: "0 auto 32px", padding: "16px 20px", borderRadius: 14, background: trialMessage.type === "success" ? "#ecfdf5" : "#fef2f2", border: `1px solid ${trialMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`, color: trialMessage.type === "success" ? "#065f46" : "#991b1b", display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 700 }}>
                        {trialMessage.type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        {trialMessage.text}
                    </div>
                )}

                {/* Dual Pricing Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginBottom: 56 }}>
                    {/* Card 1: 7-Day Free Trial */}
                    <div style={{ background: "#ffffff", borderRadius: 24, border: "2px solid #ea580c", padding: 32, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", boxShadow: "0 20px 40px -15px rgba(234, 88, 12, 0.12)" }}>
                        <div style={{ position: "absolute", top: -14, left: 28, background: "linear-gradient(135deg, #ea580c, #f97316)", color: "#fff", padding: "4px 14px", borderRadius: 99, fontSize: 11, fontWeight: 900, letterSpacing: "0.05em", textTransform: "uppercase", boxShadow: "0 4px 12px rgba(234,88,12,0.3)" }}>
                            ✨ PILIHAN UJI COBA
                        </div>

                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#ea580c", marginBottom: 8, marginTop: 4 }}>
                                <Gift size={26} />
                                <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.05em", textTransform: "uppercase" }}>GRATIS 7 HARI</span>
                            </div>
                            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 12px" }}>
                                Coba 7 Hari Free
                            </h2>
                            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px", lineHeight: 1.5 }}>
                                Nikmati semua manfaat member tanpa bayar senilai Rp0 selama 7 hari pertama. Tanpa komitmen.
                            </p>

                            <div style={{ background: "#fff7ed", padding: "16px 20px", borderRadius: 16, border: "1px solid #ffedd5", marginBottom: 24 }}>
                                <div style={{ fontSize: 24, fontWeight: 900, color: "#ea580c" }}>
                                    Rp0 <span style={{ fontSize: 14, fontWeight: 600, color: "#9a3412" }}>/ 7 Hari Pertama</span>
                                </div>
                                <small style={{ color: "#c2410c", fontSize: 12, fontWeight: 700, display: "block", marginTop: 4 }}>
                                    Otomatis mengaktifkan status member instan untuk 7 hari.
                                </small>
                            </div>

                            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "grid", gap: 12, fontSize: 14, color: "#334155" }}>
                                <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <CheckCircle2 size={18} style={{ color: "#ea580c", flexShrink: 0 }} />
                                    <span>Akses penuh artikel eksklusif selama 7 hari</span>
                                </li>
                                <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <CheckCircle2 size={18} style={{ color: "#ea580c", flexShrink: 0 }} />
                                    <span>Pengalaman membaca bebas iklan</span>
                                </li>
                                <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <CheckCircle2 size={18} style={{ color: "#ea580c", flexShrink: 0 }} />
                                    <span>Kirim berita kontributor & kumpulkan poin</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            {membershipDetails.isTrial ? (
                                <div style={{ padding: "14px 18px", borderRadius: 14, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", textAlign: "center", fontSize: 14, fontWeight: 800 }}>
                                    ✅ Status Masa Coba Gratis Aktif ({membershipDetails.trialDaysRemaining} Hari Tersisa)
                                </div>
                            ) : membershipDetails.hasClaimedTrial ? (
                                <div style={{ padding: "14px 18px", borderRadius: 14, background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#475569", textAlign: "center", fontSize: 13, fontWeight: 700 }}>
                                    Masa Coba Gratis Sudah Pernah Digunakan
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => void handleClaimTrial()}
                                    disabled={isActivatingTrial}
                                    style={{ width: "100%", padding: "15px 24px", borderRadius: 14, background: "linear-gradient(135deg, #ea580c, #f97316)", color: "#fff", border: "none", fontSize: 15, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 8px 20px rgba(234,88,12,0.3)" }}
                                >
                                    {isActivatingTrial ? (
                                        <>
                                            <LoaderCircle size={18} className="animate-spin" /> Memproses...
                                        </>
                                    ) : (
                                        <>
                                            {profile ? "Aktifkan 7 Hari Gratis Sekarang" : "Login & Klaim 7 Hari Gratis"}
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Card 2: Annual Paid Membership */}
                    <div style={{ background: "#0f172a", color: "#ffffff", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.35)" }}>
                        <div style={{ position: "absolute", top: -14, right: 28, background: "#f59e0b", color: "#000", padding: "4px 14px", borderRadius: 99, fontSize: 11, fontWeight: 900, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                            ⭐ REKOMENDASI TERPOPULER
                        </div>

                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#f59e0b", marginBottom: 8, marginTop: 4 }}>
                                <Crown size={26} />
                                <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.05em", textTransform: "uppercase" }}>SWAPNEWS PRO TAHUNAN</span>
                            </div>
                            <h2 style={{ fontSize: 26, fontWeight: 900, color: "#ffffff", margin: "0 0 12px" }}>
                                Langganan 1 Tahun
                            </h2>
                            <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 24px", lineHeight: 1.5 }}>
                                Akses penuh selama 365 hari tanpa batas. Bayar praktis via QRIS Pakasir tanpa perlu perpanjang manual tiap bulan.
                            </p>

                            <div style={{ background: "rgba(255,255,255,0.06)", padding: "16px 20px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", marginBottom: 24 }}>
                                <div style={{ fontSize: 32, fontWeight: 900, color: "#f59e0b" }}>
                                    {formattedPrice} <span style={{ fontSize: 14, fontWeight: 600, color: "#cbd5e1" }}>/ tahun</span>
                                </div>
                                <small style={{ color: "#94a3b8", fontSize: 12, display: "block", marginTop: 4 }}>
                                    Hanya Rp4.158 per bulan! Bebas pembatalan kapan saja.
                                </small>
                            </div>

                            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "grid", gap: 12, fontSize: 14, color: "#e2e8f0" }}>
                                {(config.membership_benefits || []).map((benefit, i) => (
                                    <li key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <CheckCircle2 size={18} style={{ color: "#f59e0b", flexShrink: 0 }} />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <MembershipCheckoutButton />
                        </div>
                    </div>
                </div>

                {/* Trust & Value Proposition Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                    <div style={{ background: "#ffffff", padding: 24, borderRadius: 18, border: "1px solid #e2e8f0" }}>
                        <ShieldCheck size={28} style={{ color: "#ea580c", marginBottom: 12 }} />
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>Bebas Risiko & Aman</h3>
                        <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                            Pembayaran resmi menggunakan sistem QRIS Pakasir terverifikasi Bank Indonesia.
                        </p>
                    </div>

                    <div style={{ background: "#ffffff", padding: 24, borderRadius: 18, border: "1px solid #e2e8f0" }}>
                        <Zap size={28} style={{ color: "#ea580c", marginBottom: 12 }} />
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>Aktivasi Otomatis</h3>
                        <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                            Status member Anda langsung aktif detik itu juga setelah klaim trial atau sukses pembayaran.
                        </p>
                    </div>

                    <div style={{ background: "#ffffff", padding: 24, borderRadius: 18, border: "1px solid #e2e8f0" }}>
                        <Lock size={28} style={{ color: "#ea580c", marginBottom: 12 }} />
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>Redaksi Bebas Intervensi</h3>
                        <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
                            Dukungan membership Anda menjaga kualitas berita investigasi dan independensi redaksi SwapNews.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
