import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2, Search } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isEditorialRole, isAdminRole } from "@/lib/auth/roles";
import { getArticlesForDashboard, type ArticleStatus } from "@/lib/articles";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ArticlesTableClient } from "./articles-table-client";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Artikel — SwapNews Dashboard",
    description: "Kelola artikel dan hapus masal SwapNews.",
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

const STATUS_COLORS: Record<ArticleStatus, string> = {
    draft: "draft",
    in_review: "review",
    revision: "revision",
    scheduled: "scheduled",
    published: "published",
    rejected: "rejected",
    archived: "draft",
};

type ArticlesPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap?next=/dashboard/articles");
    if (!isEditorialRole(profile.role)) redirect("/dashboard");

    const params = await searchParams;
    const statusFilter = getParam(params, "status") as ArticleStatus | null;
    const search = getParam(params, "search") ?? "";
    const error = getParam(params, "error");
    const success = getParam(params, "success");

    const articles = await getArticlesForDashboard(profile);

    const filtered = articles
        .filter((article) => {
            if (statusFilter && article.status !== statusFilter) return false;
            if (search) {
                const haystack = `${article.title} ${article.excerpt ?? ""} ${article.author_name ?? ""}`.toLowerCase();
                if (!haystack.includes(search.toLowerCase())) return false;
            }
            return true;
        })
        .map((article) => ({
            id: article.id,
            slug: article.slug,
            title: article.title,
            status: article.status,
            updated_at: article.updated_at,
            author_name: article.author_name,
            category_name: article.category_name,
        }));

    const canDelete = isAdminRole(profile.role);

    return (
        <DashboardLayout profile={profile}>
            <section className="dashboard-hero clay-card">
                <div>
                    <span className="eyebrow">Daftar Konten</span>
                    <h1>Manajemen Artikel Redaksi</h1>
                    <p>Filter status, cari artikel, hapus masal dengan checklist, dan kontrol workflow editorial.</p>
                </div>

                <Link href="/dashboard/articles/new" className="primary-button">
                    <FilePlus2 size={16} />
                    Tulis Artikel Baru
                </Link>
            </section>

            {error ? <div className="auth-alert error" style={{ margin: "0 0 16px" }}>{error}</div> : null}
            {success ? <div className="auth-alert success" style={{ margin: "0 0 16px" }}>{success}</div> : null}

            <section className="dashboard-panel clay-card">
                <form method="get" className="cms-filter">
                    <div className="cms-filter-row">
                        <label>
                            Status Workflow
                            <select name="status" defaultValue={statusFilter ?? ""}>
                                <option value="">Semua Status</option>
                                {(Object.keys(STATUS_LABELS) as ArticleStatus[]).map((status) => (
                                    <option key={status} value={status}>
                                        {STATUS_LABELS[status]}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="cms-search">
                            Pencarian
                            <input name="search" type="search" placeholder="Judul, ringkasan, atau penulis..." defaultValue={search} />
                        </label>

                        <button type="submit" className="secondary-button">
                            <Search size={16} />
                            Filter
                        </button>
                    </div>
                </form>

                <ArticlesTableClient
                    articles={filtered}
                    canDelete={canDelete}
                    statusLabels={STATUS_LABELS}
                    statusColors={STATUS_COLORS}
                />
            </section>
        </DashboardLayout>
    );
}
