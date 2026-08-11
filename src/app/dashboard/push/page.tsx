import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import PushForm from "./push-form";

export const dynamic = "force-dynamic";

export default async function PushPage() {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin") redirect("/dashboard");

    const supabase = await createClient();
    const { data: campaigns } = await supabase.from("push_campaigns").select("id,title,status,recipient_count,sent_at,created_at").order("created_at", { ascending: false }).limit(10);

    return (
        <main className="member-page">
            <header className="member-head"><span>PUSH MANUAL</span><h1>Kirim notifikasi</h1><p>Hanya Super Admin. Tidak ada trigger otomatis.</p></header>
            <PushForm />
            <section className="member-panel" style={{ marginTop: 22 }}>
                <h2>Riwayat campaign</h2>
                {!campaigns?.length && <p>Belum ada campaign.</p>}
                {campaigns?.map((campaign) => <div className="member-row" key={campaign.id}>
                    <span>{campaign.title}</span><b>{campaign.status}{campaign.recipient_count ? ` · ${campaign.recipient_count}` : ""}</b>
                </div>)}
            </section>
        </main>
    );
}
