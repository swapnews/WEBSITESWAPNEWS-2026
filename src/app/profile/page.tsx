import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfileCenter, type ProfileCenterData } from "@/components/profile/profile-center";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Edit Profile — SwapNews",
    description: "Kelola identitas, kontak, pembayaran, poin, dan keamanan akun SwapNews.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ProfilePage({ searchParams }: { searchParams: SearchParams }) {
    const sessionProfile = await getCurrentProfile();
    if (!sessionProfile) redirect("/panelswap?next=/profile");

    const supabase = await createClient();
    const [
        profileResult,
        payoutResult,
        balanceResult,
        approvedResult,
        membershipResult,
        submissionsResult,
        redemptionsResult,
        ledgerResult,
    ] = await Promise.all([
        supabase.from("profiles").select("id,email,full_name,role,is_member,avatar_url,username,whatsapp,instagram_handle,address,bio,birth_date,gender,profession,city,province,postal_code,press_card_number,wartawan_status").eq("id", sessionProfile.id).single(),
        supabase.from("profile_payout_accounts").select("payout_type,provider_name,account_number,account_holder").eq("user_id", sessionProfile.id).maybeSingle(),
        supabase.rpc("point_balance", { target_user: sessionProfile.id }),
        supabase.rpc("approved_this_month", { target_user: sessionProfile.id }),
        supabase.from("memberships").select("status,expires_at").eq("user_id", sessionProfile.id).eq("status", "active").maybeSingle(),
        supabase.from("contributor_submissions").select("id", { count: "exact", head: true }).eq("user_id", sessionProfile.id),
        supabase.from("redemptions").select("id,type,points,status,created_at").eq("user_id", sessionProfile.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("point_ledger").select("id,entry_type,points,note,created_at").eq("user_id", sessionProfile.id).order("created_at", { ascending: false }).limit(8),
    ]);

    if (profileResult.error || !profileResult.data) {
        throw new Error(profileResult.error?.message || "Profile tidak ditemukan.");
    }

    const params = await searchParams;
    const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
    const profile = profileResult.data as ProfileCenterData["profile"];
    const points = Number(balanceResult.data ?? 0);
    const membership = membershipResult.data;
    const statusLabel = profile.role === "wartawan"
        ? `Wartawan ${profile.wartawan_status === "approved" ? "Terverifikasi" : "Menunggu Verifikasi"}`
        : membership
            ? `Member aktif hingga ${new Date(membership.expires_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}`
            : profile.is_member ? "Member Aktif" : "Akun SwapNews";

    const data: ProfileCenterData = {
        profile,
        payout: payoutResult.data as ProfileCenterData["payout"],
        points,
        approvedThisMonth: Number(approvedResult.data ?? 0),
        submissionCount: submissionsResult.count ?? 0,
        redemptions: (redemptionsResult.data ?? []) as ProfileCenterData["redemptions"],
        ledger: (ledgerResult.data ?? []) as ProfileCenterData["ledger"],
        roleLabel: ROLE_LABELS[profile.role] || profile.role,
        statusLabel,
    };

    return <ProfileCenter
        data={data}
        initialSection={value("section")}
        success={value("success")}
        error={value("error")}
    />;
}
