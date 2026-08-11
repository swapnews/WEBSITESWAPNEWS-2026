import type { Metadata } from "next";
import { BadgeCheck, Ban, Crown, Newspaper } from "lucide-react";

import MembershipCheckoutButton from "./checkout-button";

export const metadata: Metadata = {
    title: "Membership Eksklusif — SwapNews",
    description: "Membership SwapNews Rp99.900/tahun: artikel eksklusif, bebas iklan, badge member, dan hak kirim berita kontributor.",
};

export default function MembershipPage() {
    return (
        <main className="member-page membership-page">
            <header className="member-head">
                <span>MEMBERSHIP</span>
                <h1>SwapNews Eksklusif</h1>
                <p>Satu paket tahunan. Dukung jurnalisme warga dan dapatkan akses penuh.</p>
            </header>
            <section className="membership-card">
                <div className="membership-price"><small>Tahunan</small><strong>Rp99.900</strong><span>/tahun</span></div>
                <ul>
                    <li><Newspaper /> Artikel eksklusif tanpa batas</li>
                    <li><Ban /> Pengalaman baca bebas iklan</li>
                    <li><BadgeCheck /> Badge member terverifikasi</li>
                    <li><Crown /> Kirim berita sebagai kontributor dan kumpulkan poin</li>
                </ul>
                <MembershipCheckoutButton />
            </section>
        </main>
    );
}
