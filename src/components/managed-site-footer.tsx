import { SiteFooter } from "@/components/site-footer";
import { getActiveAdSlot } from "@/lib/ads/data";

export async function ManagedSiteFooter() {
    const footerAd = await getActiveAdSlot("global_footer_leaderboard");
    return <SiteFooter footerAd={footerAd} />;
}
