import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2, Search } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isEditorialRole, isAdminRole } from "@/lib/auth/roles";
import { getApprovedWartawan, getArticlesForDashboard, getCategories, type ArticleStatus } from "@/lib/articles";
import { reviewCursor, UUID_PATTERN } from "@/lib/editorial-review";
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
    const requestedStatus = getParam(params, "status");
    const statusFilter = requestedStatus && Object.hasOwn(STATUS_LABELS, requestedStatus) ? requestedStatus as ArticleStatus : undefined;
    const search = (getParam(params, "search") ?? "").slice(0, 120);
    const categoryFilter = getParam(params, "category") ?? "";
    const categoryId = Number(categoryFilter);
    const isAdmin = isAdminRole(profile.role);
    const authorFilter = isAdmin ? getParam(params, "author") ?? "" : "";
    const error = getParam(params, "error");
    const success = getParam(params, "success");
    const isSuperAdmin = profile.role === "super_admin";
    const cursor = reviewCursor(getParam(params, "before"), getParam(params, "before_id"));
    const [result, categories, wartawan] = await Promise.all([
        getArticlesForDashboard(profile, 51, !isAdmin, {
            status: statusFilter, search,
            category: Number.isSafeInteger(categoryId) && categoryId > 0 ? categoryId : undefined,
            author: UUID_PATTERN.test(authorFilter) ? authorFilter : undefined,
            before: cursor ? { updatedAt: cursor.date, id: cursor.id } : undefined,
        }).then(articles => ({ articles, loadError: "" })).catch(() => ({ articles: [], loadError: "Daftar artikel gagal dimuat. Muat ulang untuk mencoba lagi." })),
        getCategories(),
        isAdmin ? getApprovedWartawan() : Promise.resolve([]),
    ]);
    const filtered = result.articles.slice(0, 50);
    const last = filtered.at(-1);
    const nextParams = new URLSearchParams();
    if (statusFilter) nextParams.set("status", statusFilter);
    if (search) nextParams.set("search", search);
    if (categoryFilter) nextParams.set("category", categoryFilter);
    if (authorFilter) nextParams.set("author", authorFilter);
    if (last) { nextParams.set("before", last.updated_at); nextParams.set("before_id", last.id); }

    const canDelete = isAdmin;

    return (
        <DashboardLayout profile={profile}>
            <section className="dashboard-hero clay-card">
                <div>
                    <span className="eyebrow">Daftar Konten</span>
                    <h1>{isAdmin ? "Manajemen Artikel Redaksi" : "Berita saya"}</h1>
                    <p>{isAdmin ? "Kelola artikel seluruh redaksi dengan filter penulis, status, dan kategori." : "Hanya berita yang Anda tulis. Review berita penulis lain tersedia di ruang kerja editorial."}</p>
                    {!isAdmin && <Link id="my-articles-review-queue" href="/dashboard/wartawan/workspace" className="secondary-button">Antrean review</Link>}
                </div>

                <Link href="/dashboard/articles/new" className="primary-button">
                    <FilePlus2 size={16} />
                    Tulis Artikel Baru
                </Link>
            </section>

            {error ? <div className="auth-alert error" style={{ margin: "0 0 16px" }}>{error}</div> : null}
            {success ? <div className="auth-alert success" style={{ margin: "0 0 16px" }}>{success}</div> : null}

            {result.loadError && <div role="alert" className="auth-alert error">{result.loadError} <Link href="/dashboard/articles">Coba lagi</Link></div>}
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

                        <label>
                            Kategori
                            <select name="category" defaultValue={categoryFilter}>
                                <option value="">Semua Kategori</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                            </select>
                        </label>

                        {wartawan.length ? (
                            <label>
                                Penulis
                                <select name="author" defaultValue={authorFilter}>
                                    <option value="">Semua Penulis</option>
                                    {wartawan.map((item) => (
                                        <option key={item.id} value={item.id}>{item.full_name ?? item.username ?? item.email}</option>
                                    ))}
                                </select>
                            </label>
                        ) : null}

                        <label className="cms-search">
                            Pencarian
                            <input name="search" type="search" placeholder="Cari judul berita..." defaultValue={search} />
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
                    canTransfer={isSuperAdmin}
                    wartawan={wartawan}
                    categories={categories.map(({ id, name }) => ({ id, name }))}
                    statusLabels={STATUS_LABELS}
                    statusColors={STATUS_COLORS}
                />
                <nav aria-label="Halaman artikel" className="wartawan-hero-actions">
                    {cursor && <Link id="articles-first-page" href="/dashboard/articles" className="secondary-button">Halaman pertama</Link>}
                    {result.articles.length > 50 && <Link id="articles-next-page" href={`/dashboard/articles?${nextParams}`} className="secondary-button">Berikutnya</Link>}
                </nav>
            </section>
        </DashboardLayout>
    );
}
