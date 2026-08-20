import Link from "next/link";
import Image from "next/image";

type ArticleItem = {
    id: string;
    title: string;
    category_name?: string | null;
    author_name?: string | null;
    view_count?: number;
    featured_media_url?: string | null;
};

type StandingsTableProps = {
    articles: ArticleItem[];
};

export function StandingsTable({ articles }: StandingsTableProps) {
    const displayArticles = articles.slice(0, 6);

    return (
        <div className="mint-table-card mint-clay-card">
            <div className="mint-card-header">
                <h2 className="mint-card-title">Peringkat Artikel Populer</h2>
                <Link href="/dashboard/articles" className="mint-card-link">
                    Lihat Semua
                </Link>
            </div>

            <table className="mint-standings-table">
                <thead>
                    <tr>
                        <th className="mint-rank-cell">#</th>
                        <th>Artikel</th>
                        <th>Kategori</th>
                        <th>Dibaca</th>
                    </tr>
                </thead>
                <tbody>
                    {displayArticles.length === 0 ? (
                        <tr>
                            <td colSpan={4} style={{ textAlign: "center", color: "var(--teal-muted)", padding: 20 }}>
                                Belum ada artikel terbit.
                            </td>
                        </tr>
                    ) : (
                        displayArticles.map((article, idx) => (
                            <tr key={article.id}>
                                <td className="mint-rank-cell">{idx + 1}</td>
                                <td>
                                    <div className="mint-article-cell">
                                        <Image
                                            src={article.featured_media_url || "/swapnews-logo.png"}
                                            alt={article.title}
                                            className="mint-article-thumb"
                                            width={72}
                                            height={72}
                                        />
                                        <div className="mint-article-info">
                                            <strong>{article.title}</strong>
                                            <small>{article.author_name || "Redaksi"}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>{article.category_name || "Umum"}</td>
                                <td>
                                    <strong>{(article.view_count || 0).toLocaleString("id-ID")}</strong>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
