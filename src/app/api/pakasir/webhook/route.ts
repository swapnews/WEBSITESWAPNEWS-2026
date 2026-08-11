import { NextResponse } from "next/server";

import { isCompletedPayment, verifyPakasirPayment } from "@/lib/pakasir";
import { createClient } from "@/lib/supabase/server";

type WebhookBody = {
    amount?: unknown;
    order_id?: unknown;
    project?: unknown;
    status?: unknown;
    payment_method?: unknown;
    completed_at?: unknown;
};

export async function POST(request: Request) {
    let body: WebhookBody;
    try { body = await request.json() as WebhookBody; }
    catch { return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 }); }

    const orderId = typeof body.order_id === "string" ? body.order_id : "";
    const amount = Number(body.amount);
    const status = typeof body.status === "string" ? body.status : "";
    if (!orderId || !Number.isFinite(amount) || !status) {
        return NextResponse.json({ error: "Payload webhook tidak lengkap." }, { status: 400 });
    }

    const supabase = await createClient();
    const { error: eventError } = await supabase.from("payment_events").insert({
        transaction_id: orderId,
        event_type: status,
        payload: body,
    });
    if (eventError) {
        return NextResponse.json({ received: true, duplicate: true });
    }

    let verified;
    try {
        verified = await verifyPakasirPayment(orderId, amount);
    } catch (error) {
        console.error("Pakasir verification failed", error);
        return NextResponse.json({ error: "Transaksi gagal diverifikasi." }, { status: 401 });
    }
    if (!isCompletedPayment(verified)) return NextResponse.json({ received: true, status: verified.status });

    const completedAt = typeof body.completed_at === "string" ? body.completed_at : new Date().toISOString();
    const { data: membership } = await supabase.from("memberships").select("id,user_id").eq("transaction_id", orderId).maybeSingle();
    if (membership) {
        const expiresAt = new Date(completedAt);
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        await supabase.from("memberships").update({ status: "active", starts_at: completedAt, expires_at: expiresAt.toISOString() }).eq("id", membership.id);
        return NextResponse.json({ received: true, membership: "active" });
    }

    const { data: order } = await supabase.from("orders").select("id,status,product_id,quantity").eq("transaction_id", orderId).maybeSingle();
    if (order) {
        if (order.status !== "paid") {
            const { data: product } = await supabase.from("products").select("stock").eq("id", order.product_id).single();
            if (!product || product.stock < order.quantity) return NextResponse.json({ error: "Stok produk tidak mencukupi." }, { status: 409 });
            const { error: stockError } = await supabase.from("products").update({ stock: product.stock - order.quantity }).eq("id", order.product_id).gte("stock", order.quantity);
            if (stockError) return NextResponse.json({ error: "Stok gagal diperbarui." }, { status: 409 });
            await supabase.from("orders").update({ status: "paid" }).eq("id", order.id).eq("status", "pending");
        }
        return NextResponse.json({ received: true, order: "paid" });
    }

    return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
}
