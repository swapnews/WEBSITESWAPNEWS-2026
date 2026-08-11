import { Banknote, Cloud, Eye, Star } from "lucide-react";

type MetricGridCardsProps = {
    totalViews: number;
    mediaBytes: number;
    royaltyPoints?: number;
    seoScore?: number;
};

export function MetricGridCards({ totalViews, mediaBytes, royaltyPoints = 0, seoScore = 8.7 }: MetricGridCardsProps) {
    const storageMb = mediaBytes / (1024 * 1024);
    const storageLabel = storageMb >= 1024 ? `${(storageMb / 1024).toFixed(1)} GB` : `${storageMb.toFixed(1)} MB`;

    const cards = [
        { label: "TOTAL DIBACA", value: totalViews.toLocaleString("id-ID"), icon: Eye, color: "purple" },
        { label: "ESTIMASI ROYALTI", value: `Rp ${royaltyPoints.toLocaleString("id-ID")}`, icon: Banknote, color: "pink" },
        { label: "STORAGE WEBP", value: storageLabel, icon: Cloud, color: "orange" },
        { label: "SKOR SEO", value: seoScore.toFixed(1), icon: Star, color: "teal" },
    ];

    return (
        <div className="mint-metric-2x2">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div className="mint-metric-card mint-clay-card sm" key={card.label}>
                        <div className={`mint-metric-icon ${card.color}`}><Icon size={16} /></div>
                        <div className="mint-metric-data"><span>{card.label}</span><strong>{card.value}</strong></div>
                    </div>
                );
            })}
        </div>
    );
}
