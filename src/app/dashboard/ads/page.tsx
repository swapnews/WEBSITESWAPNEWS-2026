import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdsManagementClient } from "@/components/admin/ads-management-client";
import { DashboardLayout } from "@/components/dashboard-layout";
import { getAllAdSlotsForDashboard } from "@/lib/ads/data";
import { getCurrentProfile } from "@/lib/auth/get-profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Ads Management — SwapNews",
    description: "Kelola inventori iklan SwapNews.",
    robots: { index: false, follow: false },
};

export default async function AdsManagementPage() {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap?next=/dashboard/ads");
    if (profile.role !== "super_admin") redirect("/dashboard");

    const { slots, error } = await getAllAdSlotsForDashboard();
    return <DashboardLayout profile={profile}>
        <AdsManagementClient slots={slots} loadError={error} />
    </DashboardLayout>;
}
