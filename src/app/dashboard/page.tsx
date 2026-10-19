import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isAdminRole, isEditorialRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getArticlesForDashboard } from "@/lib/articles";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { HeadlineCard } from "@/components/dashboard/headline-card";
import { StandingsTable } from "@/components/dashboard/standings-table";
import { StatsProgressCard } from "@/components/dashboard/stats-progress-card";
import { MetricGridCards } from "@/components/dashboard/metric-cards";
import { CalloutBanner } from "@/components/dashboard/callout-banner";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Dashboard",
    description: "Dashboard redaksi SwapNews.",
};

type CountResult = { count: number | null };

async function getCount(query: Promise<{ count: number | null }>) {
    const { count } = await query;
    return count ?? 0;
}

export default async function DashboardPage() {
    const profile = await getCurrentProfile();

    if (!profile) redirect("/panelswap?next=/dashboard");

    const supabase = await createClient();
    const canEdit = isEditorialRole(profile.role);
    const canAdmin = isAdminRole(profile.role);
    const isWartawan = profile.role === "wartawan";

    // Bagi wartawan: hitung hanya artikel milik mereka sendiri.
    // Bagi admin: hitung global portal.
    let inReviewQuery = supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "in_review");
    let revisionQuery = supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "revision");
    let publishedQuery = supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published");

    if (isWartawan) {
        inReviewQuery = inReviewQuery.eq("author_id", profile.id);
        revisionQuery = revisionQuery.eq("author_id", profile.id);
        publishedQuery = publishedQuery.eq("author_id", profile.id);
    }

    const [inReviewCount, revisionCount, publishedCount, mediaRows, dashboardArticles, userPointBalance] = await Promise.all([
        canAdmin || isWartawan
            ? getCount(inReviewQuery as unknown as Promise<CountResult>)
            : Promise.resolve(0),
        canAdmin || isWartawan
            ? getCount(revisionQuery as unknown as Promise<CountResult>)
            : Promise.resolve(0),
        getCount(publishedQuery as unknown as Promise<CountResult>),
        canEdit
            ? (isWartawan
                ? supabase.from("media_assets").select("bytes").eq("uploaded_by", profile.id)
                : supabase.from("media_assets").select("bytes"))
            : Promise.resolve({ data: [] as { bytes: number | null }[], error: null }),
        canEdit ? getArticlesForDashboard(profile, 100, isWartawan) : Promise.resolve([]),
        supabase.rpc("point_balance", { target_user: profile.id }),
    ]);

    if (mediaRows.error) {
        console.error("Dashboard media metrics query failed:", mediaRows.error.message);
    }

    const mappedArticles = dashboardArticles.map((art) => ({
        id: art.id,
        title: art.title,
        category_name: art.category_name,
        author_name: art.author_name,
        view_count: art.view_count,
        published_at: art.published_at,
        featured_media_url: art.featured_media?.secure_url || null,
    }));

    const headlineArticle =
        [...mappedArticles]
            .filter((a) => a.published_at)
            .sort((a, b) => new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime())[0] || null;

    const publishedArticles = mappedArticles.filter((a) => a.published_at);
    const standingArticles = [...publishedArticles].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 6);

    const draftCount = dashboardArticles.filter((a) => a.status === "draft").length;
    const totalViews = publishedArticles.reduce((sum, a) => sum + (a.view_count || 0), 0);
    const mediaBytes = (mediaRows.data ?? []).reduce((sum, m) => sum + (m.bytes ?? 0), 0);

    const points = Number(userPointBalance.data ?? 0);
    // Nilai konversi resmi sistem SwapNews: 1 poin = Rp1.000
    const pointValueRupiah = points * 1000;

    return (
        <DashboardLayout profile={profile}>
            <DashboardHeader profile={profile} />

            <div className="mint-dashboard-grid">
                <div className="mint-column">
                    <HeadlineCard article={headlineArticle} />
                    <StandingsTable articles={standingArticles} />
                </div>

                <div className="mint-column">
                    <StatsProgressCard
                        publishedCount={publishedCount}
                        draftCount={draftCount}
                        inReviewCount={inReviewCount}
                        revisionCount={revisionCount}
                    />

                    <MetricGridCards
                        totalViews={totalViews}
                        mediaBytes={mediaBytes}
                        royaltyPoints={pointValueRupiah}
                        royaltyLabel={isWartawan ? `POIN ANDA (${points.toLocaleString("id-ID")})` : "ESTIMASI ROYALTI"}
                        pointsDisplay={`Rp ${pointValueRupiah.toLocaleString("id-ID")}`}
                        seoScore={8.7}
                    />

                    {isWartawan ? (
                        <CalloutBanner
                            eyebrow="RUANG KERJA WARTAWAN"
                            title={
                                inReviewCount > 0
                                    ? `Ada ${inReviewCount} Berita Anda Sedang Dalam Peninjauan`
                                    : revisionCount > 0
                                        ? `Ada ${revisionCount} Berita Anda Memerlukan Revisi`
                                        : "Tulis dan Terbitkan Berita Baru untuk Menambah Poin"
                            }
                            linkHref={
                                revisionCount > 0
                                    ? "/dashboard/articles?status=revision"
                                    : inReviewCount > 0
                                        ? "/dashboard/articles?status=in_review"
                                        : "/dashboard/articles/new"
                            }
                            linkText={
                                revisionCount > 0
                                    ? "Perbaiki Berita"
                                    : inReviewCount > 0
                                        ? "Lihat Status"
                                        : "+ Tulis Berita Baru"
                            }
                        />
                    ) : (
                        <CalloutBanner draftCount={inReviewCount || draftCount} />
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
