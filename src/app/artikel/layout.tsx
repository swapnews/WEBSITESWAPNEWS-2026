import "../../styles/news-portal.css";
import "../../styles/editorial-feeds.css";
import "../../styles/homepage-control.css";
import "../../styles/channels.css";
import "../../styles/search-discovery.css";
import "../../styles/homepage-2026.css";
import "../../styles/article-2026.css";
import "../../styles/optimization.css";
import "../../styles/psychology-showcase.css";
import "../../styles/footer-pages.css";
import "../../styles/footer-wide.css";
import "../../styles/topic-feed.css";
import "../../styles/bali-live.css";
import "../../styles/bali-integration.css";
import "../../styles/public-pages-2026.css";
import "../../styles/reels-fix.css";

import { ManagedSiteFooter } from "@/components/managed-site-footer";

export default function ArticlePublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <ManagedSiteFooter />
        </>
    );
}
