import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import RedeemForm from "./redeem-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Redeem Poin — SwapNews" };

export default async function RedeemPage() {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap");

    const isWartawan = profile.role === "wartawan" || profile.role === "admin" || profile.role === "super_admin";
    const canRedeem = profile.is_member || isWartawan;

    const supabase = await createClient();
    const [{ data: balance }, { data: products }] = await Promise.all([
        supabase.rpc("point_balance", { target_user: profile.id }),
        supabase.from("products").select("id,name,price_points,stock").eq("is_active", true).gt("stock", 0).order("price_points"),
    ]);

    return (
        <main className="member-page">
            <header className="member-head">
                <span>REDEEM POIN</span>
                <h1>Tukar poin</h1>
                <p>5.000 Poin = Cash Rp 500.000. Cash cair ≤ 7 hari kerja setelah disetujui Admin.</p>
            </header>
            {canRedeem
                ? <RedeemForm products={products ?? []} balance={balance ?? 0} />
                : <section className="member-cta"><h2>Akses Ditutup</h2><p>Aktifkan membership atau kumpulkan poin sebagai Wartawan untuk menukar poin.</p><Link href="/membership">Aktifkan membership</Link></section>}
        </main>
    );
}
