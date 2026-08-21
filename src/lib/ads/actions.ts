"use server";

import { revalidatePath, updateTag } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";

import { isAdSlotKey } from "./types";
import { validateAdForm } from "./validation";

export type AdActionState = {
    status: "idle" | "success" | "error";
    message: string;
    slotKey?: string;
};

export const INITIAL_AD_ACTION_STATE: AdActionState = { status: "idle", message: "" };

export async function updateAdSlotAction(
    _previousState: AdActionState,
    formData: FormData,
): Promise<AdActionState> {
    const profile = await getCurrentProfile();
    if (!profile) return { status: "error", message: "Sesi berakhir. Silakan login kembali." };
    if (profile.role !== "super_admin") return { status: "error", message: "Akses hanya untuk Super Admin." };

    const rawSlotKey = formData.get("slot_key");
    const slotKey = typeof rawSlotKey === "string" ? rawSlotKey : "";
    if (!isAdSlotKey(slotKey)) return { status: "error", message: "Slot iklan tidak valid." };

    const validation = validateAdForm(formData);
    if (!validation.ok) return { status: "error", message: validation.message, slotKey };

    const supabase = await createClient();
    const { data: trustedSlot, error: lookupError } = await supabase
        .from("ad_slots")
        .select("id,slot_key")
        .eq("slot_key", slotKey)
        .maybeSingle();

    if (lookupError || !trustedSlot) {
        return { status: "error", message: "Slot tidak ditemukan atau akses ditolak.", slotKey };
    }

    const { error } = await supabase
        .from("ad_slots")
        .update({ ...validation.data, updated_by: profile.id })
        .eq("id", trustedSlot.id)
        .eq("slot_key", trustedSlot.slot_key);

    if (error) {
        console.error("[ads] update failed", error.code);
        return { status: "error", message: "Perubahan gagal disimpan. Periksa materi dan jadwal.", slotKey };
    }

    updateTag("public-ads");
    revalidatePath("/dashboard/ads");
    revalidatePath("/", "layout");

    return { status: "success", message: "Slot iklan berhasil diperbarui.", slotKey };
}
