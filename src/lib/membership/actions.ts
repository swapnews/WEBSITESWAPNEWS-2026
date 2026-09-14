"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";

export type MembershipDetails = {
    isMember: boolean;
    isTrial: boolean;
    trialDaysRemaining: number;
    hasClaimedTrial: boolean;
    expiresAt: string | null;
    status: string | null;
};

export async function getUserMembershipDetails(userId?: string): Promise<MembershipDetails> {
    const supabase = await createClient();
    let targetId = userId;

    if (!targetId) {
        const profile = await getCurrentProfile();
        if (!profile) {
            return {
                isMember: false,
                isTrial: false,
                trialDaysRemaining: 0,
                hasClaimedTrial: false,
                expiresAt: null,
                status: null,
            };
        }
        targetId = profile.id;
    }

    const { data: memberships } = await supabase
        .from("memberships")
        .select("id,status,price_idr,transaction_id,starts_at,expires_at")
        .eq("user_id", targetId)
        .order("created_at", { ascending: false });

    if (!memberships || memberships.length === 0) {
        return {
            isMember: false,
            isTrial: false,
            trialDaysRemaining: 7,
            hasClaimedTrial: false,
            expiresAt: null,
            status: null,
        };
    }

    const activeMembership = memberships.find((m) => m.status === "active" && m.expires_at && new Date(m.expires_at) > new Date());
    const hasClaimedTrial = memberships.some((m) => m.price_idr === 0 || m.transaction_id?.startsWith("trial_"));

    if (!activeMembership) {
        return {
            isMember: false,
            isTrial: false,
            trialDaysRemaining: 0,
            hasClaimedTrial,
            expiresAt: memberships[0]?.expires_at || null,
            status: memberships[0]?.status || "expired",
        };
    }

    const isTrial = activeMembership.price_idr === 0 || Boolean(activeMembership.transaction_id?.startsWith("trial_"));
    const expiresDate = new Date(activeMembership.expires_at!);
    const diffMs = expiresDate.getTime() - Date.now();
    const trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    return {
        isMember: true,
        isTrial,
        trialDaysRemaining,
        hasClaimedTrial: true,
        expiresAt: activeMembership.expires_at,
        status: "active",
    };
}

export async function startFreeTrialAction(): Promise<{ error?: string; success?: string }> {
    const profile = await getCurrentProfile();
    if (!profile) {
        redirect("/panelswap?redirect=/membership");
    }

    const supabase = await createClient();

    // Check if user already claimed trial or active membership
    const { data: existing } = await supabase
        .from("memberships")
        .select("id,price_idr,transaction_id")
        .eq("user_id", profile.id);

    if (existing && existing.length > 0) {
        return { error: "Anda sudah pernah mengklaim masa coba gratis atau memiliki membership." };
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const { error } = await supabase.from("memberships").insert({
        user_id: profile.id,
        status: "active",
        price_idr: 0,
        transaction_id: `trial_${profile.id}_${Date.now()}`,
        starts_at: now.toISOString(),
        expires_at: trialEndsAt.toISOString(),
    });

    if (error) {
        return { error: `Gagal mengaktifkan masa coba gratis: ${error.message}` };
    }

    // Sync profile is_member = true
    await supabase.from("profiles").update({ is_member: true }).eq("id", profile.id);

    revalidatePath("/membership");
    revalidatePath("/member");
    revalidatePath("/");

    return { success: "Selamat! Masa Coba 7 Hari Gratis SwapNews telah aktif!" };
}
