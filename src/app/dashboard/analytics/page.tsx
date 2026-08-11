import { redirect } from "next/navigation";
import { Eye, FileText, Gift, ShoppingBag, UserCheck, Users } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isAdminRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
    const profile = await getCurrentProfile();
    if (!profile || !isAdminRole(profile.role)) redirect("/dashboard");

    const supabase = await createClient();
    const [{ data: summary }, { data: popular }] = await Promise.all([
        supabase.rpc("dashboard_analytics", { days_back: 30 }),
        supabase.rpc("popular_articles_analytics", { result_limit: 10 }),
    ]);
    const stats = (summary ?? {}) as Record<string, number>;

    const cards = [
        { label: "Total views 30 hari", value: stats.total_views, icon: Eye },
        { label: "Artikel terbit", value: stats.published_articles, icon: FileText },
        { label: "Member aktif", value: stats.active_members, icon: UserCheck },
        { label: "Order dibayar", value: stats.paid_orders, icon: ShoppingBag },
        { label: "Kontributor approved", value: stats.contributor_approved, icon: Users },
        { label: "Redeem pending", value: stats.pending_redemptions, icon: Gift },
    ];

    return (
        <main className="member-page">
            <header className="member-head"><span>ANALITIK</span><h1>Dashboard performa</h1><p>Ringkasan 30 hari terakhir.</p></header>
            <section className="member-stats analytics-grid">
                {cards.map(({ label, value, icon: Icon }) => <article key={label}><Icon /><small>{label}</small><strong>{(value ?? 0).toLocaleString("id-ID")}</strong></article>)}
            </section>
            <section className="member-panel">
                <h2>Artikel terpopuler</h2>
                {!popular?.length && <p>Belum ada data.</p>}
                {popular?.map((article: { id: string; title: string; view_count: number }, index: number) => (
                    <div className="member-row" key={article.id}><span>#{index + 1} {article.title}</span><b>{article.view_count.toLocaleString("id-ID")} views</b></div>
                ))}
            </section>
        </main>
    );
}
