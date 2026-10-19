"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

type CalloutBannerProps = {
    draftCount?: number;
    eyebrow?: string;
    title?: string;
    linkHref?: string;
    linkText?: string;
};

export function CalloutBanner({
    draftCount = 3,
    eyebrow = "PERHATIAN REDAKSI",
    title,
    linkHref = "/dashboard/articles?status=in_review",
    linkText = "Tinjau Sekarang",
}: CalloutBannerProps) {
    const heading = title ?? `Tinjau ${draftCount} Artikel Menunggu Persetujuan Publikasi`;

    return (
        <div className="mint-callout-banner">
            <div className="mint-shape-3d" />
            <div className="mint-callout-content">
                <span>{eyebrow}</span>
                <h3>{heading}</h3>
                <Link href={linkHref}>
                    <button type="button" className="mint-callout-btn">
                        {linkText} <ArrowRight size={13} style={{ display: "inline", marginLeft: 4 }} />
                    </button>
                </Link>
            </div>
        </div>
    );
}
