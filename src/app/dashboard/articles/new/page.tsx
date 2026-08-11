import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isEditorialRole } from "@/lib/auth/roles";
import { getCategories } from "@/lib/articles";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ArticleForm } from "@/components/article-form";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Artikel Baru",
    description: "Buat artikel baru untuk SwapNews.",
};

type NewArticlePageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

export default async function NewArticlePage({ searchParams }: NewArticlePageProps) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/login?next=/dashboard/articles/new");
    if (!isEditorialRole(profile.role)) redirect("/dashboard");

    const categories = await getCategories();
    const params = await searchParams;
    const error = getParam(params, "error");

    return (
        <DashboardLayout profile={profile}>
            <section className="dashboard-hero clay-card">
                <div>
                    <span className="eyebrow">Form Redaksi</span>
                    <h1>Tulis Artikel Baru</h1>
                    <p>Isi metadata, unggah gambar utama (WebP 40%), dan tulis konten artikel.</p>
                </div>

                <Link href="/dashboard/articles" className="secondary-button">
                    <ArrowLeft size={16} />
                    Kembali
                </Link>
            </section>

            <section className="dashboard-panel clay-card">
                {error ? <div className="auth-alert error">{error}</div> : null}
                <ArticleForm categories={categories} />
            </section>
        </DashboardLayout>
    );
}
