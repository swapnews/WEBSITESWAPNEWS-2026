import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isAdminRole } from "@/lib/auth/roles";
import { MonitoringClient } from "@/components/monitoring/monitoring-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "System Monitoring — SwapNews", description: "Monitoring kesehatan layanan SwapNews." };

export default async function MonitoringPage() {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin" || !isAdminRole(profile.role)) {
        redirect("/panelswap?next=/dashboard/monitoring");
    }
    return <DashboardLayout profile={profile}><MonitoringClient /></DashboardLayout>;
}
