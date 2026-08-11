import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { sendManualPush } from "@/lib/onesignal";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function clean(value: unknown, max: number) {
    return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

export async function POST(request: Request) {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin") return NextResponse.json({ error: "Hanya Super Admin." }, { status: 403 });

    let body: { article_id?: unknown; title?: unknown; message?: unknown; target_type?: unknown; category_id?: unknown };
    try { body = await request.json() as typeof body; }
    catch { return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 }); }

    const title = clean(body.title, 80);
    const message = clean(body.message, 180);
    const targetType = body.target_type === "category" ? "category" : "all";
    const categoryId = targetType === "category" ? Number(body.category_id) : null;
    const articleId = typeof body.article_id === "string" ? body.article_id : null;
    if (!title || !message) return NextResponse.json({ error: "Judul dan pesan wajib diisi." }, { status: 400 });
    if (targetType === "category" && (!categoryId || !Number.isInteger(categoryId))) return NextResponse.json({ error: "Kategori target tidak valid." }, { status: 400 });

    const supabase = await createClient();
    let url = "/";
    if (articleId) {
        const { data: article } = await supabase.from("articles").select("slug,status").eq("id", articleId).maybeSingle();
        if (!article || article.status !== "published") return NextResponse.json({ error: "Artikel harus berstatus published." }, { status: 400 });
        url = `/${article.slug}`;
    }

    const { data: campaign, error } = await supabase.from("push_campaigns").insert({
        article_id: articleId, title, message, target_type: targetType, category_id: categoryId, status: "draft", sent_by: profile.id,
    }).select("id").single();
    if (error || !campaign) return NextResponse.json({ error: "Campaign gagal dibuat." }, { status: 500 });

    try {
        const result = await sendManualPush({ title, message, url, categoryId });
        await supabase.from("push_campaigns").update({ status: "sent", recipient_count: result.recipients ?? null, onesignal_notification_id: result.id, sent_at: new Date().toISOString() }).eq("id", campaign.id);
        return NextResponse.json({ success: true, campaign_id: campaign.id, recipients: result.recipients ?? 0 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Pengiriman gagal.";
        await supabase.from("push_campaigns").update({ status: "failed", error_message: message }).eq("id", campaign.id);
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
