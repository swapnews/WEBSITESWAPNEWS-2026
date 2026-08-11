import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createPakasirTransaction } from "@/lib/pakasir";
import { createClient } from "@/lib/supabase/server";

type CheckoutBody = { type?: unknown; product_id?: unknown; quantity?: unknown; method?: unknown };

export async function POST(request: Request) {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });

    let body: CheckoutBody;
    try { body = await request.json() as CheckoutBody; }
    catch { return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 }); }

    const type = body.type === "product" ? "product" : body.type === "membership" ? "membership" : null;
    const method = typeof body.method === "string" && /^[a-z0-9_-]{2,30}$/i.test(body.method) ? body.method : "qris";
    if (!type) return NextResponse.json({ error: "Tipe checkout tidak valid." }, { status: 400 });

    const supabase = await createClient();
    const orderId = `${type === "membership" ? "MEM" : "ORD"}-${crypto.randomUUID()}`;
    let amount = 99900;
    let recordId: string;

    if (type === "membership") {
        const { data, error } = await supabase.from("memberships").insert({
            user_id: profile.id, status: "pending", price_idr: amount, transaction_id: orderId,
        }).select("id").single();
        if (error || !data) return NextResponse.json({ error: "Membership pending gagal dibuat." }, { status: 500 });
        recordId = data.id;
    } else {
        const productId = typeof body.product_id === "string" ? body.product_id : "";
        const quantity = Math.min(Math.max(Number(body.quantity) || 1, 1), 10);
        const { data: product } = await supabase.from("products").select("id,price_idr,stock,is_active").eq("id", productId).eq("is_active", true).maybeSingle();
        if (!product || product.stock < quantity) return NextResponse.json({ error: "Produk tidak tersedia atau stok kurang." }, { status: 404 });
        amount = product.price_idr * quantity;
        const { data, error } = await supabase.from("orders").insert({
            user_id: profile.id, product_id: product.id, quantity, payment_method: "pakasir", total_idr: amount, status: "pending", transaction_id: orderId,
        }).select("id").single();
        if (error || !data) return NextResponse.json({ error: "Order pending gagal dibuat." }, { status: 500 });
        recordId = data.id;
    }

    try {
        const payment = await createPakasirTransaction(orderId, amount, method);
        return NextResponse.json({ checkout_id: recordId, transaction_id: orderId, amount, payment });
    } catch (error) {
        console.error("Pakasir checkout failed", error);
        if (type === "membership") await supabase.from("memberships").delete().eq("id", recordId).eq("status", "pending");
        else await supabase.from("orders").delete().eq("id", recordId).eq("status", "pending");
        return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout gagal." }, { status: 502 });
    }
}
