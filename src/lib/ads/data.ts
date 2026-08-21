import { unstable_cache } from "next/cache";
import { cache } from "react";

import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

import { AD_SLOT_COLUMNS, AD_SLOT_KEYS, type AdSlot } from "./types";

const AD_SLOT_ORDER = new Map(AD_SLOT_KEYS.map((key, index) => [key, index]));

function sortCanonicalSlots(slots: AdSlot[]) {
    return slots.sort((a, b) => (AD_SLOT_ORDER.get(a.slot_key) ?? 99) - (AD_SLOT_ORDER.get(b.slot_key) ?? 99));
}

const queryActiveAdSlots = unstable_cache(async (): Promise<AdSlot[]> => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
        .from("ad_slots")
        .select(AD_SLOT_COLUMNS)
        .not("slot_key", "is", null)
        .eq("is_active", true);

    if (error) {
        console.error("[ads] public slot query failed", error.code);
        return [];
    }

    return sortCanonicalSlots((data ?? []) as AdSlot[]);
}, ["active-ad-slots"], { tags: ["public-ads"], revalidate: 60 });

export const getActiveAdSlots = cache(queryActiveAdSlots);

export async function getActiveAdSlot(slotKey: AdSlot["slot_key"]) {
    const slots = await getActiveAdSlots();
    return slots.find((slot) => slot.slot_key === slotKey) ?? null;
}

export async function getAllAdSlotsForDashboard(): Promise<{ slots: AdSlot[]; error: string | null }> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("ad_slots")
        .select(AD_SLOT_COLUMNS)
        .not("slot_key", "is", null);

    return {
        slots: sortCanonicalSlots((data ?? []) as AdSlot[]),
        error: error ? "Data iklan gagal dimuat. Pastikan migrasi database sudah diterapkan." : null,
    };
}
