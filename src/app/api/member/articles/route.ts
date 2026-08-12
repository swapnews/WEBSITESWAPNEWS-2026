import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { generateUniqueSlug } from "@/lib/articles";
import { createClient } from "@/lib/supabase/server";

function clean(value: unknown, max: number) {
    return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

type Body = {
    title?: unknown; category_id?: unknown; location?: unknown; event_date?: unknown;
    content?: unknown; sources?: unknown; originality_statement?: unknown; terms_accepted?: unknown;
};

export async function POST(request: Request) {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
    const isWartawan = profile.role === "wartawan" || profile.role === "admin" || profile.role === "super_admin";
    if (!profile.is_member && !isWartawan) return NextResponse.json({ error: "Membership aktif atau status Wartawan diperlukan." }, { status: 403 });

    let body: Body;
    try { body = await request.json() as Body; }
    catch { return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 }); }

    const title = clean(body.title, 160);
    const location = clean(body.location, 120);
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const sources = clean(body.sources, 1000);
    const categoryId = Number(body.category_id);
    if (title.length < 8) return NextResponse.json({ error: "Judul minimal 8 karakter." }, { status: 400 });
    if (!Number.isInteger(categoryId) || categoryId <= 0) return NextResponse.json({ error: "Kategori wajib dipilih." }, { status: 400 });
    if (content.length < 300) return NextResponse.json({ error: "Isi berita minimal 300 karakter." }, { status: 400 });
    if (!sources) return NextResponse.json({ error: "Sumber/fakta pendukung wajib diisi." }, { status: 400 });
    if (body.originality_statement !== true || body.terms_accepted !== true) {
        return NextResponse.json({ error: "Pernyataan orisinalitas dan persetujuan syarat wajib dicentang." }, { status: 400 });
    }

    const supabase = await createClient();

    // Check daily article limit (Max 20 articles/day)
    const today = new Date().toISOString().split("T")[0];
    const { count: dailyCount } = await supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("author_id", profile.id)
        .gte("created_at", `${today}T00:00:00.000Z`);

    if ((dailyCount ?? 0) >= 20) {
        return NextResponse.json({ error: "Batas menulis artikel perhari adalah 20 Artikel." }, { status: 400 });
    }

    const slug = await generateUniqueSlug(title);
    const { data: article, error } = await supabase.from("articles").insert({
        slug, title, content, excerpt: content.replace(/\s+/g, " ").slice(0, 157),
        status: "in_review", category_id: categoryId, author_id: profile.id,
    }).select("id").single();
    if (error || !article) return NextResponse.json({ error: "Berita gagal disimpan." }, { status: 500 });

    const eventDate = typeof body.event_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.event_date) ? body.event_date : null;
    const { error: submissionError } = await supabase.from("contributor_submissions").insert({
        article_id: article.id, user_id: profile.id, location: location || null, event_date: eventDate,
        sources, originality_statement: true, terms_accepted: true,
    });
    if (submissionError) return NextResponse.json({ error: "Data kontributor gagal disimpan." }, { status: 500 });

    return NextResponse.json({ message: "Berita terkirim dan menunggu review redaksi.", article_id: article.id }, { status: 201 });
}
