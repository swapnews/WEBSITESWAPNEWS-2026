import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderTree, Pencil, Trash2 } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard-layout";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/content-management/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kategori", description: "Kelola kategori SwapNews." };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const param = (params: Record<string, string | string[] | undefined>, key: string) => Array.isArray(params[key]) ? params[key]?.[0] : params[key];

export default async function CategoriesPage({ searchParams }: Props) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/login?next=/dashboard/categories");
    if (profile.role !== "super_admin") redirect("/dashboard");
    const params = await searchParams;
    const editId = Number(param(params, "edit")) || null;
    const supabase = await createClient();
    const { data = [] } = await supabase.from("categories").select("id,name,slug,description,parent_id,sort_order,is_active").order("sort_order");
    const categories = data ?? [];
    const editing = categories.find((category) => category.id === editId);
    const parents = categories.filter((category) => !category.parent_id && category.id !== editId);

    return <DashboardLayout profile={profile}>
        <section className="dashboard-hero clay-card">
            <div><span className="eyebrow">Super Admin</span><h1>Taksonomi Kategori</h1><p>Kelola kanal induk, subkanal, urutan, dan visibilitas navigasi.</p></div>
            <FolderTree size={42} />
        </section>
        {param(params, "error") && <p className="cms-alert error">{param(params, "error")}</p>}
        {param(params, "success") && <p className="cms-alert success">{param(params, "success")}</p>}
        <section className="dashboard-panel clay-card">
            <h2>{editing ? `Edit ${editing.name}` : "Tambah Kategori"}</h2>
            <form action={saveCategoryAction} className="cms-form-grid">
                {editing && <input type="hidden" name="id" value={editing.id} />}
                <label>Nama<input name="name" required defaultValue={editing?.name ?? ""} /></label>
                <label>Slug<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={editing?.slug ?? ""} placeholder="otomatis-dari-nama" /></label>
                <label className="full">Deskripsi<textarea name="description" rows={2} defaultValue={editing?.description ?? ""} /></label>
                <label>Kategori Induk<select name="parent_id" defaultValue={editing?.parent_id ?? ""}><option value="">— Kanal Induk —</option>{parents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>Urutan<input name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} /></label>
                <label className="checkbox"><input name="is_active" type="checkbox" defaultChecked={editing?.is_active ?? true} /><span>Aktif</span></label>
                <div className="cms-actions"><button className="primary-button" type="submit">Simpan Kategori</button>{editing && <Link className="secondary-button" href="/dashboard/categories">Batal</Link>}</div>
            </form>
        </section>
        <section className="dashboard-panel clay-card">
            <div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Nama</th><th>Slug</th><th>Induk</th><th>Urutan</th><th>Status</th><th>Aksi</th></tr></thead>
                <tbody>{categories.map((category) => <tr key={category.id}>
                    <td><strong>{category.parent_id ? "— " : ""}{category.name}</strong></td><td>/{category.slug}</td>
                    <td>{categories.find((item) => item.id === category.parent_id)?.name ?? "Induk"}</td><td>{category.sort_order}</td><td><span className={`status-badge ${category.is_active ? "published" : "draft"}`}>{category.is_active ? "Aktif" : "Nonaktif"}</span></td>
                    <td><div className="cms-inline-actions"><a className="icon-link" href={`/dashboard/categories?edit=${category.id}`} aria-label={`Edit ${category.name}`}><Pencil size={15} /></a><form action={deleteCategoryAction}><input type="hidden" name="id" value={category.id} /><button className="icon-link danger" aria-label={`Hapus ${category.name}`}><Trash2 size={15} /></button></form></div></td>
                </tr>)}</tbody></table></div>
        </section>
    </DashboardLayout>;
}
