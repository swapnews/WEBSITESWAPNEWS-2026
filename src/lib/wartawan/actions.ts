"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/auth/roles";

async function requireAdmin() {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap?next=/dashboard/wartawan");
    if (!isAdminRole(profile.role)) redirect("/dashboard?error=Akses%20khusus%20Admin");
    return profile;
}

export async function approveWartawanAction(formData: FormData) {
    await requireAdmin();
    const userId = formData.get("user_id") as string;
    if (!userId) redirect("/dashboard/wartawan?error=ID%20tidak%20valid");

    const supabase = await createClient();

    const { data: target } = await supabase
        .from("profiles")
        .select("email,full_name,wartawan_status")
        .eq("id", userId)
        .single();

    if (!target || target.wartawan_status !== "pending") {
        redirect("/dashboard/wartawan?error=Wartawan%20tidak%20ditemukan%20atau%20sudah%20diproses");
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            role: "wartawan",
            wartawan_status: "approved",
            is_member: true,
        })
        .eq("id", userId);

    if (error) redirect(`/dashboard/wartawan?error=${encodeURIComponent(error.message)}`);

    // Send approval email via Supabase Edge Function or SMTP
    // For now we use a simple fetch to a hypothetical endpoint
    try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        await fetch(`${siteUrl}/api/wartawan/notify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: target.email,
                name: target.full_name,
                action: "approved",
            }),
        }).catch(() => { /* notification is best-effort */ });
    } catch {
        // best-effort notification
    }

    revalidatePath("/dashboard/wartawan");
    redirect("/dashboard/wartawan?success=Wartawan%20berhasil%20disetujui");
}

export async function rejectWartawanAction(formData: FormData) {
    await requireAdmin();
    const userId = formData.get("user_id") as string;
    if (!userId) redirect("/dashboard/wartawan?error=ID%20tidak%20valid");

    const supabase = await createClient();

    const { error } = await supabase
        .from("profiles")
        .update({
            wartawan_status: "rejected",
        })
        .eq("id", userId);

    if (error) redirect(`/dashboard/wartawan?error=${encodeURIComponent(error.message)}`);

    revalidatePath("/dashboard/wartawan");
    redirect("/dashboard/wartawan?success=Pendaftaran%20wartawan%20ditolak");
}
