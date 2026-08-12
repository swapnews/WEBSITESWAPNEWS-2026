import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, FileEdit, FilePlus2, Trash2 } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard-layout";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { deletePageAction } from "@/lib/content-management/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pages", description: "Kelola halaman statis SwapNews." };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const param = (params: Record<string, string | string[] | undefined>, key: string) => Array.isArray(params[key]) ? params[key]?.[0] : params[key];

export default async function PagesDashboard({ searchParams }: Props) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap?next=/dashboard/pages");
    if (profile.role !== "super_admin") redirect("/dashboard");
    const params = await searchParams;
    const supabase = await createClient();
    const { data: pages = [] } = await supabase.from("pages").select("id,title,slug,status,updated_at,published_at").order("updated_at", { ascending: false });

    return <DashboardLayout profile={profile}>
        <section className="dashboard-hero clay-card"><div><span className="eyebrow">Super Admin</span><h1>Manajemen Page</h1><p>Buat halaman profil, kebijakan, pedoman media siber, dan konten evergreen.</p></div><Link href="/dashboard/pages/new" className="primary-button"><FilePlus2 size={16} /> Buat Page</Link></section>
        {param(params, "error") && <p className="cms-alert error">{param(params, "error")}</p>}
        {param(params, "success") && <p className="cms-alert success">{param(params, "success")}</p>}
        <section className="dashboard-panel clay-card"><div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Judul & Slug</th><th>Status</th><th>Update</th><th>Aksi</th></tr></thead>
            <tbody>{!pages?.length ? <tr><td colSpan={4} className="cms-empty">Belum ada page.</td></tr> : pages.map((page) => <tr key={page.id}><td><div className="cms-title"><strong>{page.title}</strong><small>/page/{page.slug}</small></div></td><td><span className={`status-badge ${page.status === "published" ? "published" : "draft"}`}>{page.status === "published" ? "Terbit" : "Draft"}</span></td><td>{new Date(page.updated_at).toLocaleDateString("id-ID")}</td><td><div className="cms-inline-actions">{page.status === "published" && <Link className="icon-link" href={`/page/${page.slug}`} target="_blank" aria-label="Lihat page"><ExternalLink size={15} /></Link>}<Link className="icon-link" href={`/dashboard/pages/${page.id}`} aria-label="Edit page"><FileEdit size={15} /></Link><form action={deletePageAction}><input type="hidden" name="id" value={page.id} /><button className="icon-link danger" aria-label="Hapus page"><Trash2 size={15} /></button></form></div></td></tr>)}</tbody>
        </table></div></section>
    </DashboardLayout>;
}
