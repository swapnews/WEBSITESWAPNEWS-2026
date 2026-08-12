import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";

function clean(value: unknown, max: number) {
    return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

type Body = { type?: unknown; points?: unknown; product_id?: unknown; payout_account?: unknown; payout_owner?: unknown; note?: unknown };

export async function POST(request: Request) {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
    const isWartawan = profile.role === "wartawan" || profile.role === "admin" || profile.role === "super_admin";
    if (!profile.is_member && !isWartawan) return NextResponse.json({ error: "Membership aktif atau status Wartawan diperlukan." }, { status: 403 });

    let body: Body;
    try { body = await request.json() as Body; }
    catch { return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 }); }

    const type = body.type === "cash" ? "cash" : body.type === "product" ? "product" : null;
    const points = Math.floor(Number(body.points));
    if (!type || !Number.isFinite(points) || points <= 0) return NextResponse.json({ error: "Tipe atau jumlah poin tidak valid." }, { status: 400 });
    if (type === "cash" && points < 5000) return NextResponse.json({ error: "Redeem cash minimal 5.000 poin." }, { status: 400 });

    const supabase = await createClient();
    const { data: balance } = await supabase.rpc("point_balance", { target_user: profile.id });
    if ((balance ?? 0) < points) return NextResponse.json({ error: "Saldo poin tidak mencukupi." }, { status: 400 });

    let productId: string | null = null;
    if (type === "product") {
        productId = typeof body.product_id === "string" ? body.product_id : "";
        const { data: product } = await supabase.from("products").select("id,price_points,stock").eq("id", productId).eq("is_active", true).maybeSingle();
        if (!product || product.stock < 1) return NextResponse.json({ error: "Produk tidak tersedia." }, { status: 404 });
        if (product.price_points !== points) return NextResponse.json({ error: "Jumlah poin tidak sesuai harga produk." }, { status: 400 });
    } else {
        const account = clean(body.payout_account, 120);
        const owner = clean(body.payout_owner, 80);
        if (!account || !owner) return NextResponse.json({ error: "Rekening/e-wallet dan nama pemilik wajib diisi." }, { status: 400 });
        body.payout_account = account;
        body.payout_owner = owner;
    }

    const { data, error } = await supabase.from("redemptions").insert({
        user_id: profile.id, type, points, product_id: productId,
        payout_account: type === "cash" ? body.payout_account : null,
        payout_owner: type === "cash" ? body.payout_owner : null,
        note: clean(body.note, 500) || null, status: "pending",
    }).select("id").single();
    if (error || !data) return NextResponse.json({ error: "Pengajuan redeem gagal disimpan." }, { status: 500 });

    return NextResponse.json({ message: "Pengajuan redeem menunggu review Admin.", redemption_id: data.id }, { status: 201 });
}
