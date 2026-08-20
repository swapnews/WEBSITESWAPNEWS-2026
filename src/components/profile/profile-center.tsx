"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useMemo, useState } from "react";
import {
    Activity, ArrowLeft, BadgeCheck, Banknote, CheckCircle2, ChevronRight,
    CircleDollarSign, Coins, Eye, EyeOff, FileCheck2, Gift, KeyRound,
    LockKeyhole, Mail, Phone, Save, ShieldCheck, Sparkles, UserRound,
} from "lucide-react";

import { AvatarUpload } from "@/components/wartawan/avatar-upload";
import {
    changeEmailAction, changePasswordAction, updatePayoutAction, updateProfileAction,
} from "@/app/profile/actions";
import type { AppRole } from "@/lib/auth/roles";

export type ProfileCenterData = {
    profile: {
        id: string;
        email: string;
        full_name: string | null;
        role: AppRole;
        is_member: boolean;
        avatar_url: string | null;
        username: string | null;
        whatsapp: string | null;
        instagram_handle: string | null;
        address: string | null;
        bio: string | null;
        birth_date: string | null;
        gender: string | null;
        profession: string | null;
        city: string | null;
        province: string | null;
        postal_code: string | null;
        press_card_number: string | null;
        wartawan_status: string | null;
    };
    payout: {
        payout_type: string;
        provider_name: string;
        account_number: string;
        account_holder: string;
    } | null;
    points: number;
    approvedThisMonth: number;
    submissionCount: number;
    roleLabel: string;
    statusLabel: string;
    redemptions: Array<{ id: string; type: string; points: number; status: string; created_at: string }>;
    ledger: Array<{ id: string; entry_type: string; points: number; note: string | null; created_at: string }>;
};

type TabId = "profile" | "contact" | "payout" | "security" | "activity";

const tabs: Array<{ id: TabId; label: string; icon: typeof UserRound }> = [
    { id: "profile", label: "Profil", icon: UserRound },
    { id: "contact", label: "Kontak", icon: Phone },
    { id: "payout", label: "Pembayaran", icon: Banknote },
    { id: "security", label: "Keamanan", icon: ShieldCheck },
    { id: "activity", label: "Aktivitas", icon: Activity },
];

function SubmitButton({ children, id, tone = "primary" }: { children: React.ReactNode; id: string; tone?: "primary" | "dark" }) {
    const { pending } = useFormStatus();
    return <button id={id} className={`profile-submit ${tone}`} type="submit" disabled={pending}>
        {pending ? <span className="profile-spinner" /> : <Save size={17} />}
        {pending ? "Menyimpan..." : children}
    </button>;
}

function PasswordInput({ id, name, label, autoComplete }: { id: string; name: string; label: string; autoComplete: string }) {
    const [visible, setVisible] = useState(false);
    return <label className="profile-field">
        <span>{label}</span>
        <span className="profile-password-wrap">
            <input id={id} name={name} type={visible ? "text" : "password"} minLength={8} required autoComplete={autoComplete} />
            <button type="button" onClick={() => setVisible((value) => !value)} aria-label={`${visible ? "Sembunyikan" : "Tampilkan"} ${label.toLowerCase()}`}>
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
        </span>
    </label>;
}

function Field({ id, name, label, defaultValue, type = "text", placeholder, required = false, maxLength }: {
    id: string; name: string; label: string; defaultValue?: string | null; type?: string;
    placeholder?: string; required?: boolean; maxLength?: number;
}) {
    return <label className="profile-field">
        <span>{label}{required && <i>*</i>}</span>
        <input id={id} name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} required={required} maxLength={maxLength} />
    </label>;
}

function EmptyActivity({ text }: { text: string }) {
    return <div className="profile-empty"><Sparkles size={22} /><p>{text}</p></div>;
}

export function ProfileCenter({ data, initialSection, success, error }: {
    data: ProfileCenterData; initialSection: string; success: string; error: string;
}) {
    const initialTab = tabs.some((tab) => tab.id === initialSection) ? initialSection as TabId : "profile";
    const [active, setActive] = useState<TabId>(initialTab);
    const profile = data.profile;
    const name = profile.full_name || profile.email.split("@")[0];
    const backHref = profile.role === "wartawan" ? "/dashboard/wartawan/workspace" : profile.role === "visitor" ? "/member" : "/dashboard";
    const completion = useMemo(() => {
        const values = [profile.full_name, profile.avatar_url, profile.whatsapp, profile.bio, profile.profession, profile.city, data.payout?.account_number];
        return Math.round((values.filter(Boolean).length / values.length) * 100);
    }, [profile, data.payout]);

    const selectTab = (id: TabId) => {
        setActive(id);
        window.history.replaceState(null, "", `/profile?section=${id}`);
    };

    return <main className="profile-page">
        <div className="profile-orb profile-orb-one" /><div className="profile-orb profile-orb-two" />
        <div className="profile-container">
            <nav className="profile-topbar" aria-label="Navigasi profile">
                <Link id="profile-back-link" href={backHref}><ArrowLeft size={17} /> Kembali</Link>
                <Link href="/" className="profile-brand"><span>SWAP</span>NEWS</Link>
                <span className="profile-secure"><LockKeyhole size={14} /> Area privat</span>
            </nav>

            <header className="profile-hero">
                <div className="profile-identity">
                    <AvatarUpload avatarUrl={profile.avatar_url} name={name} />
                    <div>
                        <span className="profile-eyebrow"><BadgeCheck size={15} /> PUSAT AKUN</span>
                        <h1>{name}</h1>
                        <p>{data.roleLabel} · {data.statusLabel}</p>
                    </div>
                </div>
                <div className="profile-hero-stats">
                    <article><Coins /><span><small>Saldo poin</small><strong>{data.points.toLocaleString("id-ID")}</strong></span></article>
                    <article><CircleDollarSign /><span><small>Estimasi nilai</small><strong>Rp{(data.points * 1000).toLocaleString("id-ID")}</strong></span></article>
                    <article><CheckCircle2 /><span><small>Kelengkapan</small><strong>{completion}%</strong></span></article>
                </div>
            </header>

            {(success || error) && <div className={`profile-notice ${error ? "error" : "success"}`} role="status">
                {error ? <ShieldCheck size={18} /> : <CheckCircle2 size={18} />}{error || success}
            </div>}

            <div className="profile-layout">
                <aside className="profile-sidebar">
                    <div className="profile-progress-card">
                        <div><span>Profile lengkap</span><b>{completion}%</b></div>
                        <span className="profile-progress-track"><i style={{ width: `${completion}%` }} /></span>
                        <p>Profile lengkap mempermudah verifikasi dan pembayaran poin.</p>
                    </div>
                    <div className="profile-tabs" role="tablist" aria-label="Bagian profile">
                        {tabs.map((tab) => {
                            const Icon = tab.icon; return <button id={`profile-tab-${tab.id}`} key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => selectTab(tab.id)}>
                                <Icon size={18} /><span>{tab.label}</span><ChevronRight size={15} />
                            </button>;
                        })}
                    </div>
                </aside>

                <section className="profile-content">
                    <form action={updateProfileAction}>
                        <div className="profile-panel" role="tabpanel" hidden={active !== "profile"}>
                            <div className="profile-panel-head"><div><span>IDENTITAS</span><h2>Informasi pribadi</h2><p>Data yang membantu tim mengenali akun Anda.</p></div><UserRound /></div>
                            <div className="profile-form-grid">
                                <Field id="profile-full-name" name="full_name" label="Nama lengkap" defaultValue={profile.full_name} required maxLength={100} />
                                <Field id="profile-username" name="username" label="Username" defaultValue={profile.username} placeholder="nama.pengguna" maxLength={40} />
                                <Field id="profile-birth-date" name="birth_date" label="Tanggal lahir" defaultValue={profile.birth_date} type="date" />
                                <label className="profile-field"><span>Jenis kelamin</span><select id="profile-gender" name="gender" defaultValue={profile.gender ?? ""}><option value="">Pilih</option><option value="pria">Pria</option><option value="wanita">Wanita</option><option value="lainnya">Lainnya</option><option value="tidak_disebutkan">Tidak ingin menyebutkan</option></select></label>
                                <Field id="profile-profession" name="profession" label="Pekerjaan / profesi" defaultValue={profile.profession} placeholder="Jurnalis, pengusaha, mahasiswa..." maxLength={80} />
                                {profile.role === "wartawan" && <Field id="profile-press-card" name="press_card_number" label="Nomor kartu pers" defaultValue={profile.press_card_number} maxLength={80} />}
                            </div>
                            <label className="profile-field profile-field-wide"><span>Bio singkat</span><textarea id="profile-bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={500} rows={4} placeholder="Ceritakan minat, bidang liputan, atau keahlian Anda." /></label>
                            <div className="profile-actions"><SubmitButton id="profile-save-identity">Simpan profil</SubmitButton></div>
                        </div>

                        <div className="profile-panel" role="tabpanel" hidden={active !== "contact"}>
                            <div className="profile-panel-head"><div><span>KONTAK & DOMISILI</span><h2>Informasi yang dapat dihubungi</h2><p>Pastikan WhatsApp aktif untuk komunikasi redaksi dan pembayaran.</p></div><Phone /></div>
                            <div className="profile-form-grid">
                                <Field id="profile-whatsapp" name="whatsapp" label="Nomor WhatsApp" defaultValue={profile.whatsapp} placeholder="+62 812 3456 7890" maxLength={24} />
                                <Field id="profile-instagram" name="instagram_handle" label="Instagram" defaultValue={profile.instagram_handle} placeholder="username" maxLength={40} />
                                <Field id="profile-city" name="city" label="Kota / Kabupaten" defaultValue={profile.city} maxLength={80} />
                                <Field id="profile-province" name="province" label="Provinsi" defaultValue={profile.province} maxLength={80} />
                                <Field id="profile-postal-code" name="postal_code" label="Kode pos" defaultValue={profile.postal_code} maxLength={10} />
                            </div>
                            <label className="profile-field profile-field-wide"><span>Alamat lengkap</span><textarea id="profile-address" name="address" defaultValue={profile.address ?? ""} maxLength={300} rows={4} placeholder="Nama jalan, nomor, kecamatan" /></label>
                            <div className="profile-actions"><SubmitButton id="profile-save-contact">Simpan kontak</SubmitButton></div>
                        </div>
                    </form>

                    <div className="profile-panel" role="tabpanel" hidden={active !== "payout"}>
                        <div className="profile-panel-head"><div><span>PEMBAYARAN</span><h2>Rekening pencairan poin</h2><p>Data terenkripsi saat transit dan hanya dapat dibaca dari akun Anda.</p></div><Banknote /></div>
                        <div className="profile-privacy"><LockKeyhole size={18} /><p><b>Data privat.</b> Nomor rekening tidak ditampilkan pada profil publik atau artikel.</p></div>
                        <form action={updatePayoutAction}>
                            <div className="profile-form-grid">
                                <label className="profile-field"><span>Jenis akun</span><select id="profile-payout-type" name="payout_type" defaultValue={data.payout?.payout_type ?? "bank"}><option value="bank">Rekening bank</option><option value="ewallet">E-wallet</option></select></label>
                                <Field id="profile-provider" name="provider_name" label="Nama bank / e-wallet" defaultValue={data.payout?.provider_name} placeholder="BCA, BRI, DANA, GoPay" required maxLength={60} />
                                <Field id="profile-account-number" name="account_number" label="Nomor rekening / e-wallet" defaultValue={data.payout?.account_number} placeholder="Masukkan nomor tujuan" required maxLength={50} />
                                <Field id="profile-account-holder" name="account_holder" label="Nama pemilik rekening" defaultValue={data.payout?.account_holder} placeholder="Sesuai buku tabungan" required maxLength={100} />
                            </div>
                            <div className="profile-actions"><SubmitButton id="profile-save-payout">Simpan pembayaran</SubmitButton></div>
                        </form>
                    </div>

                    <div className="profile-panel" role="tabpanel" hidden={active !== "security"}>
                        <div className="profile-panel-head"><div><span>KEAMANAN</span><h2>Email & password</h2><p>Perubahan sensitif selalu meminta password saat ini.</p></div><ShieldCheck /></div>
                        <div className="profile-security-grid">
                            <form action={changeEmailAction} className="profile-security-card">
                                <div className="profile-security-icon"><Mail /></div><h3>Ganti email</h3><p>Email saat ini: <b>{profile.email}</b></p>
                                <Field id="profile-new-email" name="new_email" label="Email baru" type="email" required maxLength={160} />
                                <PasswordInput id="profile-email-password" name="current_password" label="Password saat ini" autoComplete="current-password" />
                                <SubmitButton id="profile-change-email" tone="dark">Kirim verifikasi</SubmitButton>
                            </form>
                            <form action={changePasswordAction} className="profile-security-card">
                                <div className="profile-security-icon"><KeyRound /></div><h3>Ganti password</h3><p>Gunakan minimal 8 karakter dan kombinasi unik.</p>
                                <PasswordInput id="profile-current-password" name="current_password" label="Password saat ini" autoComplete="current-password" />
                                <PasswordInput id="profile-new-password" name="new_password" label="Password baru" autoComplete="new-password" />
                                <PasswordInput id="profile-confirm-password" name="confirm_password" label="Ulangi password baru" autoComplete="new-password" />
                                <SubmitButton id="profile-change-password" tone="dark">Perbarui password</SubmitButton>
                            </form>
                        </div>
                    </div>

                    <div className="profile-panel" role="tabpanel" hidden={active !== "activity"}>
                        <div className="profile-panel-head"><div><span>AKTIVITAS</span><h2>Poin & kontribusi</h2><p>Ringkasan kontribusi dan transaksi poin Anda.</p></div><Activity /></div>
                        <div className="profile-activity-stats">
                            <article><FileCheck2 /><small>Total kiriman</small><strong>{data.submissionCount}</strong></article>
                            <article><BadgeCheck /><small>Disetujui bulan ini</small><strong>{data.approvedThisMonth}</strong></article>
                            <article><Gift /><small>Pengajuan redeem</small><strong>{data.redemptions.length}</strong></article>
                        </div>
                        <div className="profile-activity-columns">
                            <section><h3>Riwayat poin</h3>{!data.ledger.length ? <EmptyActivity text="Belum ada transaksi poin." /> : <div className="profile-timeline">{data.ledger.map((item) => <article key={item.id}><span className={item.points >= 0 ? "plus" : "minus"}>{item.points >= 0 ? "+" : ""}{item.points}</span><div><b>{item.note || item.entry_type.replaceAll("_", " ")}</b><time>{new Date(item.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</time></div></article>)}</div>}</section>
                            <section><h3>Redeem terakhir</h3>{!data.redemptions.length ? <EmptyActivity text="Belum ada pengajuan redeem." /> : <div className="profile-timeline">{data.redemptions.map((item) => <article key={item.id}><span className="redeem">{item.points}</span><div><b>{item.type === "cash" ? "Pencairan cash" : "Tukar produk"}</b><time>{item.status} · {new Date(item.created_at).toLocaleDateString("id-ID")}</time></div></article>)}</div>}</section>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </main>;
}
