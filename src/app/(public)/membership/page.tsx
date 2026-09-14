import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getSiteConfig } from "@/lib/site-config";
import { getUserMembershipDetails } from "@/lib/membership/actions";
import MembershipClientView from "./membership-client";

export async function generateMetadata(): Promise<Metadata> {
    const config = await getSiteConfig();
    const formattedPrice = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(config.membership_price_idr);
    return {
        title: `${config.membership_title} — SwapNews`,
        description: `Membership SwapNews ${formattedPrice}/tahun: ${config.membership_description}`,
    };
}

export default async function MembershipPage() {
    const [config, profile] = await Promise.all([
        getSiteConfig(),
        getCurrentProfile(),
    ]);

    const membershipDetails = await getUserMembershipDetails(profile?.id);

    return <MembershipClientView config={config} profile={profile} membershipDetails={membershipDetails} />;
}
