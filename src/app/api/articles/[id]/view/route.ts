import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
    const { id } = await params;
    if (!UUID.test(id)) return NextResponse.json({ error: "ID artikel tidak valid." }, { status: 400 });

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("increment_article_view", { article_uuid: id });
    if (error) {
        console.error("Failed to increment article view", error);
        return NextResponse.json({ error: "Artikel tidak ditemukan atau view belum tersedia." }, { status: 404 });
    }
    if (data === null) return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ view_count: data });
}
