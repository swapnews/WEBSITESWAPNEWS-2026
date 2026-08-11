import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Context = { params: Promise<{ id: string }> };

type CommentBody = { name?: unknown; email?: unknown; content?: unknown };

function clean(value: unknown) {
    return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export async function GET(_request: Request, { params }: Context) {
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: "ID artikel tidak valid." }, { status: 400 });
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("comments")
        .select("id,guest_name,content,created_at")
        .eq("article_id", id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(100);
    if (error) return NextResponse.json({ error: "Komentar gagal dimuat." }, { status: 500 });
    return NextResponse.json({ comments: data ?? [] });
}

export async function POST(request: Request, { params }: Context) {
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: "ID artikel tidak valid." }, { status: 400 });

    let payload: CommentBody;
    try {
        payload = await request.json() as CommentBody;
    } catch {
        return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
    }

    const name = clean(payload.name);
    const email = clean(payload.email).toLowerCase();
    const content = clean(payload.content);
    if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Nama harus 2–60 karakter." }, { status: 400 });
    if (email.length > 160 || !EMAIL.test(email)) return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    if (content.length < 3 || content.length > 1500) return NextResponse.json({ error: "Komentar harus 3–1500 karakter." }, { status: 400 });

    const supabase = await createClient();
    const { data: article } = await supabase.from("articles").select("id").eq("id", id).eq("status", "published").maybeSingle();
    if (!article) return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });

    const { error } = await supabase.from("comments").insert({
        article_id: id,
        guest_name: name,
        guest_email: email,
        content,
        status: "pending",
    });
    if (error) {
        console.error("Failed to submit guest comment", error);
        return NextResponse.json({ error: "Komentar gagal dikirim." }, { status: 500 });
    }
    return NextResponse.json({ message: "Komentar menunggu moderasi." }, { status: 201 });
}
