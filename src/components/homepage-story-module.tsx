import Image from "next/image";
import Link from "next/link";
import { Bookmark, ChevronRight } from "lucide-react";
import type { HomepageModule } from "@/lib/homepage-modules";
import type { PublicArticle, PublicHomeData, PublicSection } from "@/lib/public-articles";
import { BaliLiveHub } from "@/components/bali-live-hub";

const image = (article: PublicArticle) => article.featured_media?.secure_url || "/og-default.jpg";
const date = (article: PublicArticle) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(article.published_at));

function StoryGrid({ module, articles }: { module: HomepageModule; articles: PublicArticle[] }) {
    if (!articles.length) return null;
    return <section className={`editorial-feed composed-story-feed style-${module.style_variant}`} aria-labelledby={`${module.section_key}-title`}>
        <header><span>PILIHAN REDAKSI</span><h2 id={`${module.section_key}-title`}>{module.title}</h2>{module.category_slug && <Link href={`/kanal/${module.category_slug}`}>Semua berita <ChevronRight size={16} /></Link>}</header>
        <div className="composed-story-grid">{articles.slice(0, 6).map((article) => <Link href={`/${article.slug}`} key={article.id}><div><Image src={image(article)} alt={article.featured_media?.alt_text || article.title} fill sizes="(max-width: 600px) 90vw, 360px" /></div><small>{article.category_name} · {date(article)}</small><h3>{article.title}</h3><p>{article.excerpt}</p></Link>)}</div>
    </section>;
}

export function HomepageStoryModule({ module, data, visibleSections }: { module: HomepageModule; data: PublicHomeData; visibleSections: PublicSection[] }) {
    const key = module.section_key;
    const defaultSlug = ({ games: "games", sports: "sport", bali: "bali", psychology: "psikologi" } as Record<string, string>)[key];
    const usesDefault = !module.category_slug || module.category_slug === defaultSlug;
    const selected = data.articles.filter(article => article.category_slug === module.category_slug);
    const stories = usesDefault ? (key === "games" ? data.games : key === "sports" ? data.sports : key === "bali" ? data.bali : selected) : selected;
    const headingId = `${key}-feed-title`;
    if (key === "latest") {
        const sections = module.category_slug ? visibleSections.filter(section => section.slug === module.category_slug) : visibleSections;
        if (module.style_variant === "mosaic") return <StoryGrid module={module} articles={sections.flatMap(section => [section.lead, ...section.items])} />;
        return <section aria-labelledby="composed-latest-title"><div className="news-section-head"><h2 id="composed-latest-title">{module.title}</h2></div>{sections.map((section) => <section className="news-section" key={section.slug} aria-labelledby={`section-${section.slug}`}>
            <div className="news-section-head"><h3 id={`section-${section.slug}`}>{section.title}</h3><Link href={`/kanal/${section.slug}`}>Lihat semua</Link></div>
            <div className="news-block"><Link href={`/${section.lead.slug}`} className="lead-story"><div className="lead-image"><Image src={image(section.lead)} alt={section.lead.featured_media?.alt_text || section.lead.title} fill sizes="240px" /><div className="news-image-shade" /></div><h3>{section.lead.title}</h3><small>{date(section.lead)}</small></Link><div className="mini-list">{section.items.map(item => <Link href={`/${item.slug}`} key={item.id} className="mini-story"><Image src={image(item)} alt={item.featured_media?.alt_text || item.title} width={72} height={52} /><span><strong>{item.title}</strong><small>{date(item)}</small></span><Bookmark /></Link>)}</div></div>
        </section>)}</section>;
    }
    if (!stories.length) return null;
    if (key === "games" && module.style_variant === "arena") return <section className="editorial-feed games-feed" aria-labelledby={headingId}>
        <header><span>PLAY • COMPETE • DISCOVER</span><h2 id={headingId}>{module.title}</h2><p>Game, esports, dan kultur pemain Indonesia.</p></header>
        <div className="games-grid">{stories.slice(0, 6).map((item, index) => <Link href={`/${item.slug}`} className={index === 0 ? "games-lead" : `games-card games-card-${index + 1}`} key={item.id}><div><Image src={image(item)} alt={item.featured_media?.alt_text || item.title} fill sizes={index === 0 ? "520px" : "320px"} /><span className="news-image-shade" /></div><small>{item.category_name} · {String(index + 1).padStart(2, "0")}</small><h3>{item.title}</h3></Link>)}</div>
    </section>;
    if (key === "sports" && module.style_variant === "scoreboard") return <section className="editorial-feed sports-feed" aria-labelledby={headingId}>
        <header><span>LIVE SCOREBOARD</span><h2 id={headingId}>{module.title}</h2><p>Momentum, rivalitas, dan kemenangan.</p></header>
        <div className="sports-slider">{stories.slice(0, 8).map((item, index) => <Link href={`/${item.slug}`} className={index === 0 ? "sports-slide sports-slide-lead" : "sports-slide"} key={item.id}><div className="sports-thumb"><Image src={image(item)} alt={item.featured_media?.alt_text || item.title} fill sizes={index === 0 ? "460px" : "320px"} /></div><span>{String(index + 1).padStart(2, "0")}</span><div className="sports-slide-copy"><small>{item.category_name}</small><h3>{item.title}</h3><em>{date(item)}</em></div></Link>)}</div>
    </section>;
    if (key === "bali" && module.style_variant === "mosaic") return <><section className="editorial-feed bali-feed" aria-labelledby={headingId}>
        <header><span>ISLAND STORIES</span><h2 id={headingId}>{module.title}</h2><p>Budaya hidup, destinasi, dan suara lokal.</p></header>
        <div className="bali-mosaic">{stories.slice(0, 8).map((item, index) => <Link href={`/${item.slug}`} className={`bali-card bali-${index + 1}`} key={item.id}><Image src={image(item)} alt={item.featured_media?.alt_text || item.title} fill sizes="500px" /><span className="news-image-shade" /><div><small>{item.category_name}</small><h3>{item.title}</h3></div></Link>)}</div>
    </section>{usesDefault && <BaliLiveHub articles={stories} />}</>;
    if (key === "psychology" && module.style_variant === "mosaic") {
        const [lead, ...items] = stories;
        return <section className="psychology-showcase" aria-labelledby="psychology-title"><header><div><span>MIND • LIFE • WELLBEING</span><h2 id="psychology-title">{module.title}</h2><p>Memahami diri, relasi, dan kesehatan mental melalui perspektif tepercaya.</p></div><Link href={`/kanal/${module.category_slug || "psikologi"}`}>Lihat semua <ChevronRight /></Link></header><div className="psychology-layout"><div className="psychology-main"><Link href={`/${lead.slug}`} className="psychology-lead"><div><Image src={image(lead)} alt={lead.featured_media?.alt_text || lead.title} fill sizes="680px" /><span className="news-image-shade" /><b>{lead.category_name}</b></div><section><h3>{lead.title}</h3><p>{lead.excerpt}</p><small>{date(lead)} · {lead.reading_time_minutes} menit baca</small></section></Link><div className="psychology-grid">{items.slice(0, 3).map(item => <Link href={`/${item.slug}`} key={item.id}><div><Image src={image(item)} alt={item.featured_media?.alt_text || item.title} fill sizes="240px" /></div><h3>{item.title}</h3><small>{date(item)}</small></Link>)}</div></div><aside className="psychology-recent"><span>RECENT STORIES</span><h3>Terbaru di {lead.category_name}</h3>{stories.slice(0, 4).map((item, index) => <Link href={`/${item.slug}`} key={item.id}><b>{String(index + 1).padStart(2, "0")}</b><Image src={image(item)} alt="" width={76} height={58} /><div><strong>{item.title}</strong><small>{date(item)}</small></div></Link>)}</aside></div></section>;
    }
    return <StoryGrid module={module} articles={stories} />;
}
