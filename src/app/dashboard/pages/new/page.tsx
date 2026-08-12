import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageForm } from "@/components/page-form";
import { getCurrentProfile } from "@/lib/auth/get-profile";

export const metadata = { title: "Buat Page" };
export default async function NewPage() {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap?next=/dashboard/pages/new");
    if (profile.role !== "super_admin") redirect("/dashboard");
    return <DashboardLayout profile={profile}><section className="dashboard-hero clay-card"><div><span className="eyebrow">Page Builder</span><h1>Buat Page Baru</h1><p>Editor page menggunakan struktur konten dan SEO yang sama dengan artikel.</p></div></section><section className="dashboard-panel clay-card"><PageForm /></section></DashboardLayout>;
}
