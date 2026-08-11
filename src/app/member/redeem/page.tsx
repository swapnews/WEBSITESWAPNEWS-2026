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
    if (!profile) redirect("/login");

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
                <p>Cash cair ≤ 7 hari kerja setelah disetujui Admin. Produk langsung diproses.</p>
            </header>
            {profile.is_member
                ? <RedeemForm products={products ?? []} balance={balance ?? 0} />
                : <section className="member-cta"><h2>Membership diperlukan</h2><p>Aktifkan membership untuk mengumpulkan dan menukar poin.</p><Link href="/membership">Aktifkan membership</Link></section>}
        </main>
    );
}
