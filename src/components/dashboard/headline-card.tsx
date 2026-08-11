import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Newspaper } from "lucide-react";

type HeadlineArticle = {
    id: string;
    title: string;
    category_name?: string | null;
    published_at?: string | null;
    featured_media_url?: string | null;
};

export function HeadlineCard({ article }: { article?: HeadlineArticle | null }) {
    const publishedLabel = article?.published_at
        ? new Date(article.published_at).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        })
        : "Belum dijadwalkan";

    return (
        <div className="mint-headline-card mint-clay-card">
            <div className="mint-card-header">
                <h2 className="mint-card-title">Headline Redaksi</h2>
                <Link href="/dashboard/articles?status=published" className="mint-card-link">Lihat Artikel</Link>
            </div>

            {article ? (
                <div className="mint-headline-content">
                    <div className="mint-sub-header-pill">
                        <CalendarDays size={14} /> {article.category_name || "UMUM"} • {publishedLabel}
                    </div>
                    <div className="mint-live-headline">
                        {article.featured_media_url ? (
                            <Image src={article.featured_media_url} alt={article.title} width={144} height={144} />
                        ) : (
                            <div className="mint-team-logo"><Newspaper size={20} /></div>
                        )}
                        <div>
                            <strong>{article.title}</strong>
                            <span>Artikel terbit terbaru SwapNews</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="mint-empty-inline"><Newspaper size={20} /> Belum ada artikel terbit.</div>
            )}
        </div>
    );
}
