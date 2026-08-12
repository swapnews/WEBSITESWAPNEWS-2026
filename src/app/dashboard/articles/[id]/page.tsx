import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isAdminRole, isEditorialRole } from "@/lib/auth/roles";
import { getArticleById, getCategories, type ArticleStatus } from "@/lib/articles";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ArticleForm } from "@/components/article-form";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Edit Artikel",
    description: "Edit artikel SwapNews.",
};

const STATUS_LABELS: Record<ArticleStatus, string> = {
    draft: "Draft",
    in_review: "Menunggu Review",
    revision: "Revisi",
    scheduled: "Terjadwal",
    published: "Terbit",
    rejected: "Ditolak",
    archived: "Diarsipkan",
};

type EditArticlePageProps = {
    params: Promise<{ id: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

export default async function EditArticlePage({ params, searchParams }: EditArticlePageProps) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap");
    if (!isEditorialRole(profile.role)) redirect("/dashboard");

    const { id } = await params;
    const article = await getArticleById(id, profile);
    if (!article) redirect("/dashboard/articles?error=Artikel%20tidak%20ditemukan");

    const categories = await getCategories();
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const [{ data: notes = [] }, { data: audit = [] }] = await Promise.all([
        supabase.from("editorial_notes").select("id,note,created_at,author_id").eq("article_id", id).order("created_at", { ascending: false }),
        isAdminRole(profile.role) ? supabase.from("article_audit_log").select("id,from_status,to_status,created_at,actor_id").eq("article_id", id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
    ]);
    const paramsSearch = await searchParams;
    const error = getParam(paramsSearch, "error");

    const isAdmin = isAdminRole(profile.role);
    const isAuthor = article.author_id === profile.id;
    const canEdit = isAdmin || (isAuthor && article.status !== "published");
    const canReview = isAdmin;

    return (
        <DashboardLayout profile={profile}>
            <section className="dashboard-hero clay-card">
                <div>
                    <span className="eyebrow">Editor Artikel</span>
                    <h1>{article.title}</h1>
                    <p>
                        Status: <strong>{STATUS_LABELS[article.status]}</strong> · Penulis: {article.author_name ?? "—"} · Terakhir update:{" "}
                        {new Date(article.updated_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                </div>

                <Link href="/dashboard/articles" className="secondary-button">
                    <ArrowLeft size={16} />
                    Kembali
                </Link>
            </section>

            <section className="dashboard-panel clay-card">
                {error ? <div className="auth-alert error">{error}</div> : null}
                <ArticleForm article={article} categories={categories} canEdit={canEdit} canReview={canReview} />
            </section>
            <section className="dashboard-panel clay-card editorial-history"><div><span className="eyebrow">Internal Desk</span><h2>Riwayat Editorial</h2></div>{!notes?.length && !audit?.length && <p>Belum ada catatan atau perubahan status.</p>}<div className="editorial-timeline">{notes?.map(note => <article key={note.id}><i /><div><b>Catatan redaksi</b><p>{note.note}</p><small>{new Date(note.created_at).toLocaleString("id-ID")}</small></div></article>)}{audit?.map(item => <article key={`audit-${item.id}`}><i /><div><b>Perubahan status</b><p>{item.from_status || "—"} → {item.to_status}</p><small>{new Date(item.created_at).toLocaleString("id-ID")}</small></div></article>)}</div></section>
        </DashboardLayout>
    );
}
