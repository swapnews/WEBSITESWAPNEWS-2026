import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });

    let body: { article_id?: unknown };
    try { body = await request.json() as { article_id?: unknown }; }
    catch { return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 }); }

    const articleId = typeof body.article_id === "string" ? body.article_id : "";
    if (!UUID_RE.test(articleId)) return NextResponse.json({ error: "ID artikel tidak valid." }, { status: 400 });

    const supabase = await createClient();
    const { data: article } = await supabase.from("articles").select("id,category_id").eq("id", articleId).eq("status", "published").maybeSingle();
    if (!article) return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });

    const { error } = await supabase.from("reading_history").upsert({
        user_id: profile.id,
        article_id: article.id,
        category_id: article.category_id,
        read_at: new Date().toISOString(),
    }, { onConflict: "user_id,article_id" });
    if (error) return NextResponse.json({ error: "Riwayat baca gagal disimpan." }, { status: 500 });
    return NextResponse.json({ success: true });
}
