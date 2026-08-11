import Link from "next/link";

type StatsProgressCardProps = {
    publishedCount: number;
    draftCount: number;
    inReviewCount: number;
    revisionCount: number;
};

export function StatsProgressCard({ publishedCount, draftCount, inReviewCount, revisionCount }: StatsProgressCardProps) {
    const total = publishedCount + draftCount + inReviewCount + revisionCount;
    const safe = (v: number) => (total ? Math.max((v / total) * 100, v > 0 ? 8 : 0) : 0);

    return (
        <div className="mint-stats-card mint-clay-card">
            <div className="mint-card-header">
                <h2 className="mint-card-title">Progress Editorial</h2>
                <Link href="/dashboard/articles" className="mint-card-link">Semua</Link>
            </div>

            <div className="mint-progress-segmented">
                <div className="mint-segment terbit" style={{ width: `${safe(publishedCount)}%` }} />
                <div className="mint-segment draft" style={{ width: `${safe(draftCount)}%` }} />
                <div className="mint-segment revisi" style={{ width: `${safe(inReviewCount)}%` }} />
                <div className="mint-segment ditolak" style={{ width: `${safe(revisionCount)}%` }} />
            </div>

            <div className="mint-stats-grid">
                <div className="mint-stat-item"><span className="mint-stat-label">TOTAL</span><strong className="mint-stat-val">{total}</strong></div>
                <div className="mint-stat-item"><span className="mint-stat-label">TERBIT</span><strong className="mint-stat-val">{publishedCount}</strong></div>
                <div className="mint-stat-item"><span className="mint-stat-label">DRAFT</span><strong className="mint-stat-val">{draftCount}</strong></div>
                <div className="mint-stat-item"><span className="mint-stat-label">REVISI</span><strong className="mint-stat-val">{revisionCount}</strong></div>
            </div>
        </div>
    );
}
