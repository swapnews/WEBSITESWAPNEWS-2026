import { notFound, redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { PageForm, type PageRecord } from "@/components/page-form";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/login?next=/dashboard/pages");
    if (profile.role !== "super_admin") redirect("/dashboard");
    const { id } = await params;
    const supabase = await createClient();
    const { data } = await supabase.from("pages").select("id,title,slug,excerpt,content,featured_media_id,status,focus_keyword,seo_title,meta_description,tags,featured_media:media_assets(secure_url,alt_text)").eq("id", id).single();
    if (!data) notFound();
    return <DashboardLayout profile={profile}><section className="dashboard-hero clay-card"><div><span className="eyebrow">Page Builder</span><h1>Edit {data.title}</h1><p>Kelola isi, gambar, status publikasi, dan SEO.</p></div></section><section className="dashboard-panel clay-card"><PageForm page={data as unknown as PageRecord} /></section></DashboardLayout>;
}
