import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { DashboardLayout } from "@/components/dashboard-layout";
import { SeoDashboardClient } from "@/components/admin/seo-dashboard-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "SEO Panel — SwapNews", description: "Audit, konfigurasi global, dan alat SEO untuk SwapNews." };

export default async function SeoDashboardPage() {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin") redirect("/panelswap?next=/dashboard/seo");
    return <DashboardLayout profile={profile}><SeoDashboardClient /></DashboardLayout>;
}
