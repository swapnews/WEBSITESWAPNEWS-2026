import { redirect } from "next/navigation";
import Link from "next/link";
import { Coins, FileText, Gift, Wallet } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MemberDashboardPage() {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap");

    const supabase = await createClient();
    const [{ data: membership }, { data: balance }, { data: monthly }, { data: submissions }, { data: redemptions }] = await Promise.all([
        supabase.from("memberships").select("status,expires_at").eq("user_id", profile.id).eq("status", "active").maybeSingle(),
        supabase.rpc("point_balance", { target_user: profile.id }),
        supabase.rpc("approved_this_month", { target_user: profile.id }),
        supabase.from("contributor_submissions").select("id,created_at,articles(title,status)").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(8),
        supabase.from("redemptions").select("id,type,points,status,created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(8),
    ]);

    const points = balance ?? 0;
    const approved = monthly ?? 0;
    const progress = Math.min((approved / 50) * 100, 100);

    return (
        <main className="member-page">
            <header className="member-head">
                <span>AREA MEMBER</span>
                <h1>Halo, <Link id="member-profile-name" href="/profile">{profile.full_name || profile.email}</Link></h1>
                <p>{membership ? `Membership aktif sampai ${new Date(membership.expires_at).toLocaleDateString("id-ID", { dateStyle: "long" })}` : "Membership belum aktif."}</p>
            </header>

            {!membership && <section className="member-cta">
                <h2>Aktifkan membership</h2>
                <p>Rp99.900/tahun untuk artikel eksklusif, bebas iklan, badge member, dan hak kirim berita.</p>
                <Link href="/membership">Lihat paket membership</Link>
            </section>}

            <section className="member-stats" aria-label="Statistik member">
                <article><FileText /><small>Artikel bulan ini</small><strong>{approved}/50</strong><div className="member-progress"><i style={{ width: `${progress}%` }} /></div></article>
                <article><Coins /><small>Saldo poin</small><strong>{points}</strong><p>1 poin = Rp1.000</p></article>
                <article><Wallet /><small>Estimasi rupiah</small><strong>Rp{(points * 1000).toLocaleString("id-ID")}</strong><p>Redeem cash min 100 poin</p></article>
                <article><Gift /><small>Redeem</small><strong>{redemptions?.length ?? 0}</strong><p>Pengajuan terakhir</p></article>
            </section>

            <div className="member-actions">
                <Link id="member-edit-profile" href="/profile">Edit Profile</Link>
                <Link href="/member/kirim-berita">Kirim berita</Link>
                <Link href="/member/redeem">Redeem poin</Link>
                <Link href="/merchandise">Merchandise</Link>
            </div>

            <section className="member-panel">
                <h2>Riwayat kirim berita</h2>
                {!submissions?.length && <p>Belum ada kiriman berita.</p>}
                {submissions?.map((item) => {
                    const article = Array.isArray(item.articles) ? item.articles[0] : item.articles;
                    return <div className="member-row" key={item.id}><span>{article?.title || "Artikel"}</span><b>{article?.status || "draft"}</b></div>;
                })}
            </section>

            <section className="member-panel">
                <h2>Riwayat redeem</h2>
                {!redemptions?.length && <p>Belum ada pengajuan redeem.</p>}
                {redemptions?.map((item) => <div className="member-row" key={item.id}><span>{item.type} · {item.points} poin</span><b>{item.status}</b></div>)}
            </section>
        </main>
    );
}
