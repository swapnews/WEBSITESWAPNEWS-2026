import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { DashboardLayout } from "@/components/dashboard-layout";
import { UserManagementClient } from "@/components/admin/user-management-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manajemen Akun — SwapNews", description: "Kelola akun Member dan Wartawan." };

export default async function AccountManagementPage() {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin") redirect("/panelswap?next=/dashboard/accounts");
    return <DashboardLayout profile={profile}><UserManagementClient /></DashboardLayout>;
}
