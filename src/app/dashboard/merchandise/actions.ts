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
const floatNum = (form: FormData, key: string) => Math.max(0, Number(form.get(key)) || 0);
const slugify = (value: string) =>
    value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");

export async function saveProductAction(form: FormData) {
    const supabase = await adminClient();
    const id = text(form, "id");
    const name = text(form, "name").slice(0, 140);
    const slug = slugify(text(form, "slug") || name);
    const priceIdr = integer(form, "price_idr");
    const originalPriceIdr = integer(form, "original_price_idr") || null;
    const pricePoints = integer(form, "price_points");
    const categoryProduct = text(form, "category_product") || "Umum";
    const sku = text(form, "sku") || null;
    const weightGrams = integer(form, "weight_grams") || 200;
    const stock = integer(form, "stock");
    const rating = Math.min(5, Math.max(1, floatNum(form, "rating") || 5.0));
    const salesCount = integer(form, "sales_count");
    const variantsRaw = text(form, "variants");
    const variants = variantsRaw
        ? variantsRaw.split(",").map((v) => v.trim()).filter(Boolean)
        : [];

    if (!name || !slug || priceIdr < 1 || pricePoints < 1) {
        redirect("/dashboard/merchandise?error=Nama,%20slug,%20dan%20harga%20wajib%20valid");
    }

    const payload = {
        slug,
        name,
        description: text(form, "description").slice(0, 2000) || null,
        category_product: categoryProduct,
        sku,
        weight_grams: weightGrams,
        price_idr: priceIdr,
        original_price_idr: originalPriceIdr,
        price_points: pricePoints,
        stock,
        rating,
        sales_count: salesCount,
        variants: JSON.stringify(variants),
        image_url: text(form, "image_url") || null,
        is_active: form.get("is_active") === "on" || form.get("is_active") === "true",
        updated_at: new Date().toISOString(),
    };

    const query = id
        ? supabase.from("products").update(payload).eq("id", id)
        : supabase.from("products").insert(payload);

    const { error } = await query;
    if (error) redirect(`/dashboard/merchandise?error=${encodeURIComponent(error.message)}`);

    revalidatePath("/merchandise");
    revalidatePath(`/merchandise/${slug}`);
    revalidatePath("/dashboard/merchandise");
    redirect("/dashboard/merchandise?success=Data%20produk%20berhasil%20disimpan");
}

export async function deleteProductAction(form: FormData) {
    const supabase = await adminClient();
    const id = text(form, "id");
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
        redirect(`/dashboard/merchandise?error=${encodeURIComponent("Produk memiliki riwayat transaksi; nonaktifkan produk sebagai gantinya.")}`);
    }
    revalidatePath("/merchandise");
    revalidatePath("/dashboard/merchandise");
    redirect("/dashboard/merchandise?success=Produk%20berhasil%20dihapus");
}

export async function updateOrderStatusAction(form: FormData) {
    const supabase = await adminClient();
    const id = text(form, "id");
    const status = text(form, "status");
    const allowed = ["paid", "processing", "shipped", "completed", "refunded", "cancelled"];
    if (!allowed.includes(status)) redirect("/dashboard/merchandise?error=Status%20pesanan%20tidak%20valid");
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) redirect(`/dashboard/merchandise?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/dashboard/merchandise");
    redirect("/dashboard/merchandise?success=Status%20pesanan%20berhasil%20diperbarui");
}

export async function saveShopSettingsAction(form: FormData) {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin") redirect("/dashboard");

    const supabase = await createClient();
    const storeTitle = text(form, "merchandise_store_title") || "Produk resmi SwapNews";
    const storeSubtitle = text(form, "merchandise_store_subtitle") || "Bayar via Pakasir atau tukar poin member.";
    const freeShippingMin = integer(form, "merchandise_free_shipping_min");

    const updates = [
        { key: "merchandise_store_title", value: JSON.stringify(storeTitle) as unknown as number, description: "Judul halaman merchandise", updated_by: profile.id, updated_at: new Date().toISOString() },
        { key: "merchandise_store_subtitle", value: JSON.stringify(storeSubtitle) as unknown as number, description: "Subjudul halaman merchandise", updated_by: profile.id, updated_at: new Date().toISOString() },
        { key: "merchandise_free_shipping_min", value: freeShippingMin as unknown as number, description: "Minimal belanja gratis ongkir", updated_by: profile.id, updated_at: new Date().toISOString() },
    ];

    for (const item of updates) {
        await supabase.from("site_config").upsert(item as Record<string, unknown>, { onConflict: "key" });
    }

    revalidatePath("/merchandise");
    revalidatePath("/dashboard/merchandise");
    redirect("/dashboard/merchandise?tab=settings&success=Pengaturan%20toko%20berhasil%20disimpan");
}
