"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";

export async function updateMembershipSettingsAction(formData: FormData) {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin") {
        redirect("/dashboard?error=Akses%20khusus%20Super%20Admin");
    }

    const priceRaw = Number(formData.get("price_idr"));
    const price = Number.isSafeInteger(priceRaw) && priceRaw >= 1000 ? priceRaw : 49900;
    const title = String(formData.get("title") || "").trim().slice(0, 100) || "SwapNews Eksklusif";
    const description = String(formData.get("description") || "").trim().slice(0, 500) || "Satu paket tahunan. Dukung jurnalisme warga dan dapatkan akses penuh.";
    const benefitsRaw = String(formData.get("benefits") || "");
    const benefits = benefitsRaw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 10);

    const supabase = await createClient();

    const updates = [
        { key: "membership_price_idr", value: price as unknown as number, description: "Harga membership tahunan dalam Rupiah", updated_by: profile.id, updated_at: new Date().toISOString() },
        { key: "membership_title", value: JSON.stringify(title) as unknown as number, description: "Judul paket membership", updated_by: profile.id, updated_at: new Date().toISOString() },
        { key: "membership_description", value: JSON.stringify(description) as unknown as number, description: "Deskripsi membership", updated_by: profile.id, updated_at: new Date().toISOString() },
        { key: "membership_benefits", value: JSON.stringify(benefits) as unknown as number, description: "Daftar keuntungan member", updated_by: profile.id, updated_at: new Date().toISOString() },
    ];

    for (const item of updates) {
        const { error } = await supabase
            .from("site_config")
            .upsert(item as Record<string, unknown>, { onConflict: "key" });

        if (error) {
            console.error("Failed to update site_config:", item.key, error);
            redirect(`/dashboard/settings/membership?error=${encodeURIComponent(`Gagal menyimpan ${item.key}: ${error.message}`)}`);
        }
    }

    revalidatePath("/membership");
    revalidatePath("/member");
    revalidatePath("/dashboard/settings/membership");
    redirect("/dashboard/settings/membership?success=Pengaturan%20membership%20berhasil%20disimpan");
}
