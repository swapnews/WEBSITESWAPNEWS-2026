import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { getSiteConfig } from "@/lib/site-config";
import MembershipCheckoutButton from "./checkout-button";

export async function generateMetadata(): Promise<Metadata> {
    const config = await getSiteConfig();
    const formattedPrice = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(config.membership_price_idr);
    return {
        title: `${config.membership_title} — SwapNews`,
        description: `Membership SwapNews ${formattedPrice}/tahun: ${config.membership_description}`,
    };
}

export default async function MembershipPage() {
    const config = await getSiteConfig();
    const formattedPrice = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(config.membership_price_idr);

    return (
        <main className="member-page membership-page">
            <header className="member-head">
                <span>MEMBERSHIP</span>
                <h1>{config.membership_title}</h1>
                <p>{config.membership_description}</p>
            </header>
            <section className="membership-card">
                <div className="membership-price"><small>Tahunan</small><strong>{formattedPrice}</strong><span>/tahun</span></div>
                <ul>
                    {config.membership_benefits.map((benefit, i) => (
                        <li key={i}><CheckCircle2 size={18} style={{ color: "var(--dash-accent, #f97316)" }} /> {benefit}</li>
                    ))}
                </ul>
                <MembershipCheckoutButton />
            </section>
        </main>
    );
}
