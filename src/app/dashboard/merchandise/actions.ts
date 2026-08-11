"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";

async function adminClient() {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin") redirect("/dashboard");
    return createClient();
}
const text = (form: FormData, key: string) => String(form.get(key) || "").trim();
const integer = (form: FormData, key: string) => Math.max(0, Math.floor(Number(form.get(key)) || 0));
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");

export async function saveProductAction(form: FormData) {
    const supabase = await adminClient();
    const id = text(form, "id");
    const name = text(form, "name").slice(0, 140);
    const slug = slugify(text(form, "slug") || name);
    const priceIdr = integer(form, "price_idr");
    const pricePoints = integer(form, "price_points");
    if (!name || !slug || priceIdr < 1 || pricePoints < 1) redirect("/dashboard/merchandise?error=Nama, slug, dan harga wajib valid");
    const payload = { slug, name, description: text(form, "description").slice(0, 1000) || null, price_idr: priceIdr, price_points: pricePoints, stock: integer(form, "stock"), image_url: text(form, "image_url") || null, is_active: form.get("is_active") === "on" };
    const query = id ? supabase.from("products").update(payload).eq("id", id) : supabase.from("products").insert(payload);
    const { error } = await query;
    if (error) redirect(`/dashboard/merchandise?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/merchandise"); revalidatePath("/dashboard/merchandise");
    redirect("/dashboard/merchandise?success=Produk tersimpan");
}

export async function deleteProductAction(form: FormData) {
    const supabase = await adminClient();
    const id = text(form, "id");
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) redirect(`/dashboard/merchandise?error=${encodeURIComponent("Produk memiliki transaksi; nonaktifkan produk sebagai gantinya.")}`);
    revalidatePath("/merchandise"); redirect("/dashboard/merchandise?success=Produk dihapus");
}

export async function updateOrderStatusAction(form: FormData) {
    const supabase = await adminClient();
    const id = text(form, "id");
    const status = text(form, "status");
    const allowed = ["paid", "processing", "shipped", "completed", "refunded", "cancelled"];
    if (!allowed.includes(status)) redirect("/dashboard/merchandise?error=Status pesanan tidak valid");
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) redirect(`/dashboard/merchandise?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/dashboard/merchandise"); redirect("/dashboard/merchandise?success=Status pesanan diperbarui");
}
