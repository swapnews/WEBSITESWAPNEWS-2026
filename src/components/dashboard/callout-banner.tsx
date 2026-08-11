"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

type CalloutBannerProps = {
    draftCount?: number;
};

export function CalloutBanner({ draftCount = 3 }: CalloutBannerProps) {
    return (
        <div className="mint-callout-banner">
            <div className="mint-shape-3d" />
            <div className="mint-callout-content">
                <span>PERHATIAN REDAKSI</span>
                <h3>Tinjau {draftCount} Artikel Menunggu Persetujuan Publikasi</h3>
                <Link href="/dashboard/articles?status=in_review">
                    <button type="button" className="mint-callout-btn">
                        Tinjau Sekarang <ArrowRight size={13} style={{ display: "inline", marginLeft: 4 }} />
                    </button>
                </Link>
            </div>
        </div>
    );
}
