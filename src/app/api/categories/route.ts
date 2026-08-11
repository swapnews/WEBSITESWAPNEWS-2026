import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("categories")
        .select("id,name,slug,parent_id,sort_order")
        .eq("is_active", true)
        .order("sort_order");
    if (error) return NextResponse.json({ error: "Kategori gagal dimuat." }, { status: 500 });
    return NextResponse.json({ categories: data ?? [] });
}
