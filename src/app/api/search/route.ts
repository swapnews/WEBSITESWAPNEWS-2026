import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function cleanQuery(value: string | null) {
    return (value ?? "").replace(/[\\%_(),."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function GET(request: Request) {
    const query = cleanQuery(new URL(request.url).searchParams.get("q"));
    if (query.length < 2) return NextResponse.json({ error: "Kata kunci minimal 2 karakter." }, { status: 400 });

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_published_articles", { search_query: query, result_limit: 10 });
    if (!error) return NextResponse.json({ results: data ?? [] });

    const { data: fallback, error: fallbackError } = await supabase
        .from("articles")
        .select("id,slug,title,excerpt,published_at,view_count")
        .eq("status", "published")
        .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
        .order("published_at", { ascending: false })
        .limit(10);
    if (fallbackError) return NextResponse.json({ error: "Pencarian gagal." }, { status: 500 });
    return NextResponse.json({ results: fallback ?? [] });
}
