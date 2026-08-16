"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    BarChart3, CheckCircle2, Clipboard as ClipboardIcon, Copy, ExternalLink, FileSearch, Gauge, LayoutList,
    Link2, ListChecks, Newspaper, Network, RefreshCw, Save, Search, Settings as SettingsIcon,
    ShieldCheck, Sparkles, TriangleAlert, XCircle,
} from "lucide-react";

type SeoSettings = {
    site_name: string; tagline: string; default_og_image: string | null;
    organization_name: string; organization_url: string; organization_logo: string | null;
    same_as: string[]; google_site_verification: string | null; yandex_verification: string | null;
    bing_site_verification: string | null; robots_policy: string; ai_crawler_policy: string;
    llms_txt_enabled: boolean; indexnow_enabled: boolean; default_schema_type: string; updated_at: string;
};

type ArticleAuditRow = {
    id: string; slug: string; title: string; status: string; seo_title: string | null;
    meta_description: string | null; focus_keyword: string | null; tags: string[];
    published_at: string | null; updated_at: string; featured_media_id: string | null;
    score: number; issues: string[];
};

type Stats = {
    total: number; published: number; missing_title: number; missing_description: number;
    missing_media: number; average_score: number; fresh_48h: number;
};

type Tab = "overview" | "articles" | "settings" | "schema" | "sitemap";
const tabs: { key: Tab; label: string; icon: typeof Gauge }[] = [
    { key: "overview", label: "Overview", icon: Gauge },
    { key: "articles", label: "Article Audit", icon: ListChecks },
    { key: "settings", label: "Settings", icon: SettingsIcon },
    { key: "schema", label: "Schema Tools", icon: Sparkles },
    { key: "sitemap", label: "Sitemap & News", icon: Network },
];

const scoreTone = (score: number) => score >= 80 ? "bg-emerald-50 text-emerald-700" : score >= 55 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700";
const scoreBar = (score: number) => score >= 80 ? "bg-emerald-500" : score >= 55 ? "bg-amber-500" : "bg-rose-500";

const defaultSettings: SeoSettings = {
    site_name: "SwapNews", tagline: "Bukan Berita Biasa", default_og_image: null,
    organization_name: "SwapNews", organization_url: "https://swapnews.co.id",
    organization_logo: "https://swapnews.co.id/swapnews-logo.png", same_as: [],
    google_site_verification: null, yandex_verification: null, bing_site_verification: null,
    robots_policy: "index,follow", ai_crawler_policy: "search-allowed-training-review",
    llms_txt_enabled: false, indexnow_enabled: false, default_schema_type: "NewsArticle",
    updated_at: new Date(0).toISOString(),
};

const schemaExamples: Record<string, { label: string; build: (s: SeoSettings) => Record<string, unknown> }> = {
    NewsArticle: {
        label: "Berita (NewsArticle)",
        build: (s) => ({
            "@context": "https://schema.org", "@type": "NewsArticle",
            headline: "Contoh Judul Berita SwapNews", description: "Deskripsi singkat yang akurat dan informatif.",
            image: [s.default_og_image || "https://swapnews.co.id/swapnews-logo.png"],
            datePublished: new Date().toISOString(), dateModified: new Date().toISOString(),
            author: { "@type": "Person", name: "Redaksi SwapNews" },
            publisher: { "@type": "NewsMediaOrganization", name: s.organization_name, logo: { "@type": "ImageObject", url: s.organization_logo } },
            mainEntityOfPage: "https://swapnews.co.id/contoh-slug", inLanguage: "id-ID", isAccessibleForFree: true,
        }),
    },
    Organization: {
        label: "Organisasi (NewsMediaOrganization)",
        build: (s) => ({
            "@context": "https://schema.org", "@type": "NewsMediaOrganization",
            name: s.organization_name, url: s.organization_url,
            logo: { "@type": "ImageObject", url: s.organization_logo || "https://swapnews.co.id/swapnews-logo.png" },
            sameAs: s.same_as, publishingPrinciples: `${s.organization_url}/page/kebijakan-redaksi`,
        }),
    },
    WebSite: {
        label: "Situs (WebSite)",
        build: (s) => ({
            "@context": "https://schema.org", "@type": "WebSite",
            name: s.site_name, url: s.organization_url, description: s.tagline,
        }),
    },
    Breadcrumb: {
        label: "Breadcrumb (BreadcrumbList)",
        build: () => ({
            "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
                { "@type": "ListItem", position: 1, name: "Beranda", item: "https://swapnews.co.id" },
                { "@type": "ListItem", position: 2, name: "Kategori", item: "https://swapnews.co.id/kanal/kategori" },
                { "@type": "ListItem", position: 3, name: "Judul Berita", item: "https://swapnews.co.id/judul-berita" },
            ],
        }),
    },
};

function StatCard({ label, value, tone, hint }: { label: string; value: string | number; tone?: "green" | "amber" | "red" | "violet"; hint?: string }) {
    const dot = tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : tone === "red" ? "bg-rose-500" : "bg-violet-500";
    return <article className="rounded-3xl border border-orange-900/10 bg-white/80 p-5 shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5">
        <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-900/50">{label}</span><span className={`h-2.5 w-2.5 rounded-full ${dot}`} /></div>
        <div className="mt-2 font-display text-3xl font-black text-stone-900">{value.toLocaleString("id-ID")}</div>
        {hint && <p className="mt-1 text-xs font-medium text-stone-500">{hint}</p>}
    </article>;
}

export function SeoDashboardClient() {
    const [tab, setTab] = useState<Tab>("overview");
    const [settings, setSettings] = useState<SeoSettings>(defaultSettings);
    const [articles, setArticles] = useState<ArticleAuditRow[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
    const [schemaType, setSchemaType] = useState<keyof typeof schemaExamples>("NewsArticle");
    const [copied, setCopied] = useState(false);

    const load = useCallback(async () => {
        setLoading(true); setError(""); setNotice("");
        try {
            const response = await fetch("/api/admin/seo", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Gagal memuat data SEO");
            setSettings(data.settings); setArticles(data.articles); setStats(data.stats);
        } catch (err) { setError(err instanceof Error ? err.message : "Gagal memuat data SEO"); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { void load(); }, [load]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return articles.filter((article) => {
            if (statusFilter !== "all" && article.status !== statusFilter) return false;
            if (!q) return true;
            return article.title.toLowerCase().includes(q) || article.slug.toLowerCase().includes(q) || article.seo_title?.toLowerCase().includes(q);
        });
    }, [articles, query, statusFilter]);

    async function saveSettings(event: React.FormEvent) {
        event.preventDefault(); setSaving(true); setNotice(""); setError("");
        try {
            const response = await fetch("/api/admin/seo", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...settings, same_as: settings.same_as.filter((value) => value.trim() !== "") }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Gagal menyimpan settings");
            setSettings(data.settings); setNotice("Pengaturan SEO global tersimpan.");
        } catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan settings"); }
        finally { setSaving(false); }
    }

    const currentSchema = useMemo(() => schemaExamples[schemaType].build(settings), [schemaType, settings]);
    const schemaJson = JSON.stringify(currentSchema, null, 2).replace(/</g, "\\u003c");

    async function copySchema() {
        await navigator.clipboard.writeText(schemaJson);
        setCopied(true); setTimeout(() => setCopied(false), 1800);
    }

    const robotsPreview = useMemo(() => {
        const lines = [
            `User-agent: *`, `Allow: /`, `Disallow: /dashboard`, `Disallow: /api`, `Disallow: /panelswap`,
            `Disallow: /login`, `Disallow: /member`, ``, `User-agent: GPTBot`, `Disallow: ${settings.ai_crawler_policy.startsWith("search-allowed") ? "/search?q=" : "/"}`,
            `User-agent: Google-Extended`, `Disallow: /`, ``, `Sitemap: https://swapnews.co.id/sitemap.xml`, `Sitemap: https://swapnews.co.id/sitemap-news.xml`,
        ];
        return lines.join("\n");
    }, [settings.ai_crawler_policy]);

    if (loading && !stats) return <main className="mx-auto max-w-7xl px-6 py-10"><div className="animate-pulse rounded-3xl border border-orange-900/10 bg-white/70 p-6"><div className="h-8 w-64 rounded-lg bg-orange-200/40" /><div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-orange-100/40" />)}</div></div></main>;

    return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-stone-900 via-orange-900 to-rose-800 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div><span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-orange-200/80">Super Admin · SEO Control Room</span>
                <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">SEO Panel SwapNews</h1>
                <p className="mt-1 text-sm font-medium text-orange-100/80">Audit artikel, konfigurasi global, schema builder, dan sitemap berita dalam satu dashboard.</p></div>
            <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25 disabled:opacity-60"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Muat Ulang</button>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
            {tabs.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setTab(key)} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${tab === key ? "bg-stone-900 text-white shadow-lg" : "border border-orange-900/10 bg-white/70 text-stone-700 hover:bg-white"}`}><Icon size={16} /> {label}</button>)}
        </div>

        {error && <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"><XCircle size={16} /> {error}</div>}
        {notice && <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={16} /> {notice}</div>}

        {tab === "overview" && stats && <section className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total Artikel" value={stats.total} hint="Semua status di database" />
                <StatCard label="Published" value={stats.published} tone="green" hint="Artikel aktif terindeks" />
                <StatCard label="Fresh 48 Jam" value={stats.fresh_48h} tone="violet" hint="Untuk news sitemap" />
                <StatCard label="Rata-rata Skor SEO" value={stats.average_score} tone={stats.average_score >= 80 ? "green" : stats.average_score >= 55 ? "amber" : "red"} hint="Skor per artikel / 100" />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-3xl border border-orange-900/10 bg-white/80 p-6 shadow-sm"><div className="flex items-center gap-2 text-sm font-extrabold text-stone-800"><FileSearch size={17} /> Kualitas Metadata</div>
                    <ul className="mt-4 space-y-3">
                        {[["Meta description kosong", stats.missing_description, stats.published], ["SEO title kosong", stats.missing_title, stats.published], ["Featured image/alt hilang", stats.missing_media, stats.published]].map(([label, count, total]) => {
                            const safe = Number(total) || 1; const value = Number(count); const pct = Math.round((value / safe) * 100);
                            return <li key={String(label)}><div className="flex items-center justify-between text-xs font-bold text-stone-600"><span>{label}</span><span className={pct > 20 ? "text-rose-600" : pct > 0 ? "text-amber-600" : "text-emerald-600"}>{value} artikel</span></div>
                                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full ${pct > 20 ? "bg-rose-500" : pct > 0 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div></li>;
                        })}
                    </ul>
                </div>
                <div className="rounded-3xl border border-orange-900/10 bg-white/80 p-6 shadow-sm"><div className="flex items-center gap-2 text-sm font-extrabold text-stone-800"><Network size={17} /> Fondasi Teknis</div>
                    <ul className="mt-4 space-y-2.5 text-xs font-bold text-stone-600">
                        <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-500" /> robots.txt memuat sitemap umum &amp; news</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-500" /> JSON-LD NewsArticle di halaman artikel</li>
                        <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-500" /> Canonical &amp; OG artikel aktif</li>
                        <li className="flex items-center gap-2"><TriangleAlert size={15} className="text-amber-500" /> News sitemap perlu /sitemap-news.xml</li>
                        <li className="flex items-center gap-2"><TriangleAlert size={15} className="text-amber-500" /> Verifikasi Yandex/Bing perlu ditambahkan</li>
                    </ul>
                </div>
                <div className="rounded-3xl border border-orange-900/10 bg-white/80 p-6 shadow-sm"><div className="flex items-center gap-2 text-sm font-extrabold text-stone-800"><ShieldCheck size={17} /> Kebijakan Mesin Cari</div>
                    <div className="mt-4 flex items-center gap-3"><BarChart3 size={18} className="text-violet-500" /><div className="text-xs font-bold text-stone-600"><span className="block text-sm text-stone-900">{settings.robots_policy}</span>Directive robots default</div></div>
                    <div className="mt-3 flex items-center gap-3"><ShieldCheck size={18} className="text-violet-500" /><div className="text-xs font-bold text-stone-600"><span className="block text-sm text-stone-900">{settings.ai_crawler_policy}</span>Kebijakan AI crawler</div></div>
                    <p className="mt-4 rounded-2xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">Skor panel bersifat indikator audit metadata, bukan data GSC/CrUX live.</p>
                </div>
            </div>
        </section>}

        {tab === "articles" && <section className="mt-6 rounded-3xl border border-orange-900/10 bg-white/80 p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari judul/slug..." className="w-full rounded-2xl border border-orange-900/10 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-orange-500/40" /></div>
                <div className="flex gap-2">{[["all", "Semua"], ["published", "Published"], ["draft", "Draft"]].map(([value, label]) => <button key={value} onClick={() => setStatusFilter(value as typeof statusFilter)} className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${statusFilter === value ? "bg-stone-900 text-white" : "border border-orange-900/10 bg-white text-stone-600 hover:bg-stone-50"}`}>{label}</button>)}</div>
            </div>
            <div className="mt-5 overflow-x-auto"><table className="w-full border-collapse text-left text-sm">
                <thead><tr className="border-b-2 border-orange-900/10 text-[10px] font-extrabold uppercase tracking-wider text-stone-400"><th className="px-3 py-2.5">Artikel</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">SEO Title</th><th className="px-3 py-2.5">Meta Description</th><th className="px-3 py-2.5">Media</th><th className="px-3 py-2.5">Skor</th></tr></thead>
                <tbody>{filtered.slice(0, 80).map((article) => <tr key={article.id} className="border-b border-orange-900/5 align-top transition hover:bg-orange-50/40">
                    <td className="px-3 py-3"><div className="max-w-[260px] truncate font-bold text-stone-800">{article.title}</div><a href={`https://swapnews.co.id/${article.slug}`} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:underline">/{article.slug} <ExternalLink size={10} /></a></td>
                    <td className="px-3 py-3"><span className={`rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase ${article.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{article.status}</span></td>
                    <td className="px-3 py-3">{article.seo_title ? <span className="font-semibold text-stone-700">{article.seo_title.slice(0, 48)}</span> : <span className="font-bold text-rose-600">Kosong</span>}</td>
                    <td className="px-3 py-3">{article.meta_description ? <span className="font-semibold text-stone-700">{article.meta_description.slice(0, 60)}…</span> : <span className="font-bold text-rose-600">Kosong</span>}</td>
                    <td className="px-3 py-3">{article.featured_media_id ? <CheckCircle2 size={16} className="text-emerald-500" /> : <XCircle size={16} className="text-rose-500" />}</td>
                    <td className="px-3 py-3"><div className="flex items-center gap-2"><span className={`rounded-lg px-2 py-0.5 text-xs font-extrabold ${scoreTone(article.score)}`}>{article.score}</span><div className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-stone-100 sm:block"><div className={`h-full rounded-full ${scoreBar(article.score)}`} style={{ width: `${article.score}%` }} /></div></div></td>
                </tr>)}</tbody></table>
                {!filtered.length && <div className="py-12 text-center text-sm font-semibold text-stone-400"><Search size={22} className="mx-auto mb-2 opacity-40" /> Tidak ada artikel cocok.</div>}
                {filtered.length > 80 && <p className="mt-3 text-center text-xs font-semibold text-stone-400">Menampilkan 80 dari {filtered.length} artikel.</p>}</div>
        </section>}

        {tab === "settings" && <section className="mt-6 rounded-3xl border border-orange-900/10 bg-white/80 p-5 shadow-sm sm:p-8"><form onSubmit={saveSettings} className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4"><h2 className="font-display text-xl font-black text-stone-900">Identitas Situs</h2>
                <Field label="Nama situs (site_name)"><input value={settings.site_name} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} className="seo-field" /></Field>
                <Field label="Tagline"><input value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} className="seo-field" /></Field>
                <Field label="Default Open Graph image (URL)"><input value={settings.default_og_image || ""} onChange={(e) => setSettings({ ...settings, default_og_image: e.target.value })} className="seo-field" placeholder="https://swapnews.co.id/..." /></Field>
            </div>
            <div className="space-y-4"><h2 className="font-display text-xl font-black text-stone-900">Organisasi &amp; Sosial</h2>
                <Field label="Nama organisasi"><input value={settings.organization_name} onChange={(e) => setSettings({ ...settings, organization_name: e.target.value })} className="seo-field" /></Field>
                <Field label="URL organisasi"><input value={settings.organization_url} onChange={(e) => setSettings({ ...settings, organization_url: e.target.value })} className="seo-field" /></Field>
                <Field label="Logo organisasi (URL)"><input value={settings.organization_logo || ""} onChange={(e) => setSettings({ ...settings, organization_logo: e.target.value })} className="seo-field" /></Field>
                <Field label="sameAs (satu URL per baris)"><textarea rows={3} value={settings.same_as.join("\n")} onChange={(e) => setSettings({ ...settings, same_as: e.target.value.split("\n") })} className="seo-field resize-y" /></Field>
            </div>
            <div className="space-y-4"><h2 className="font-display text-xl font-black text-stone-900">Verifikasi Mesin Cari</h2>
                <Field label="Google site verification"><input value={settings.google_site_verification || ""} onChange={(e) => setSettings({ ...settings, google_site_verification: e.target.value })} className="seo-field" /></Field>
                <Field label="Yandex verification"><input value={settings.yandex_verification || ""} onChange={(e) => setSettings({ ...settings, yandex_verification: e.target.value })} className="seo-field" /></Field>
                <Field label="Bing verification"><input value={settings.bing_site_verification || ""} onChange={(e) => setSettings({ ...settings, bing_site_verification: e.target.value })} className="seo-field" /></Field>
            </div>
            <div className="space-y-4"><h2 className="font-display text-xl font-black text-stone-900">Kebijakan &amp; Schema</h2>
                <Field label="Robots directive default"><select value={settings.robots_policy} onChange={(e) => setSettings({ ...settings, robots_policy: e.target.value })} className="seo-field"><option value="index,follow">index,follow</option><option value="noindex,nofollow">noindex,nofollow (hati-hati)</option></select></Field>
                <Field label="Kebijakan AI crawler"><select value={settings.ai_crawler_policy} onChange={(e) => setSettings({ ...settings, ai_crawler_policy: e.target.value })} className="seo-field"><option value="search-allowed-training-review">Izinkan search, review training AI</option><option value="search-only">Search only, blokir training</option><option value="block-all">Blokir semua AI crawler</option></select></Field>
                <Field label="Default schema article"><select value={settings.default_schema_type} onChange={(e) => setSettings({ ...settings, default_schema_type: e.target.value })} className="seo-field">{Object.entries(schemaExamples).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></Field>
                <div className="flex flex-wrap gap-4 pt-1"><Toggle label="Aktifkan llms.txt" checked={settings.llms_txt_enabled} onChange={(v) => setSettings({ ...settings, llms_txt_enabled: v })} /><Toggle label="Aktifkan IndexNow" checked={settings.indexnow_enabled} onChange={(v) => setSettings({ ...settings, indexnow_enabled: v })} /></div>
            </div>
            <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stone-50 px-4 py-3">
                <p className="text-xs font-semibold text-stone-500">Terakhir diperbarui: {settings.updated_at ? new Date(settings.updated_at).toLocaleString("id-ID") : "belum pernah"}</p>
                <button disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"><Save size={16} /> {saving ? "Menyimpan..." : "Simpan Pengaturan"}</button>
            </div>
        </form></section>}

        {tab === "schema" && <section className="mt-6 grid gap-6 lg:grid-cols-5">
            <div className="rounded-3xl border border-orange-900/10 bg-white/80 p-5 shadow-sm sm:p-6 lg:col-span-2">
                <h2 className="font-display text-xl font-black text-stone-900">Generator JSON-LD</h2><p className="mt-1 text-xs font-semibold text-stone-500">Pilih tipe schema lalu salin JSON-LD untuk dipasang di halaman.</p>
                <div className="mt-4 space-y-2">{Object.entries(schemaExamples).map(([key, value]) => <button key={key} onClick={() => setSchemaType(key as keyof typeof schemaExamples)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${schemaType === key ? "bg-stone-900 text-white shadow-lg" : "border border-orange-900/10 bg-white text-stone-700 hover:bg-stone-50"}`}><Sparkles size={15} /> {value.label}</button>)}</div>
                <div className="mt-5 rounded-2xl bg-violet-50 px-4 py-3 text-[11px] font-semibold text-violet-700"><Link2 size={14} className="mr-1 inline" />JSON-LD di-render server dan karakter &lt; di-escape untuk mencegah XSS.</div>
            </div>
            <div className="rounded-3xl border border-orange-900/10 bg-stone-950 p-5 shadow-xl lg:col-span-3">
                <div className="flex items-center justify-between"><span className="text-[11px] font-extrabold uppercase tracking-widest text-stone-400">&lt;script type="application/ld+json"&gt;</span>
                    <button onClick={() => void copySchema()} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20">{copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />} {copied ? "Tersalin" : "Salin"}</button></div>
                <pre className="mt-4 overflow-x-auto whitespace-pre rounded-2xl bg-black/40 p-4 text-[12px] leading-relaxed text-emerald-300">{schemaJson}</pre>
            </div>
        </section>}

        {tab === "sitemap" && <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-orange-900/10 bg-white/80 p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><Network size={18} className="text-orange-600" /><h2 className="font-display text-xl font-black text-stone-900">Sitemap &amp; News</h2></div>
                <ul className="mt-4 space-y-3 text-sm font-semibold text-stone-700">
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /><a href="https://swapnews.co.id/sitemap.xml" target="_blank" rel="noreferrer" className="text-orange-600 underline-offset-2 hover:underline">/sitemap.xml</a> — semua URL canonical</li>
                    <li className="flex items-center gap-2"><TriangleAlert size={16} className="text-amber-500" /><span>/sitemap-news.xml</span> — buat berisi artikel &lt;48 jam ({stats?.fresh_48h ?? 0} artikel)</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500" /><span>robots.txt memuat kedua sitemap</span></li>
                </ul>
                <div className="mt-5 rounded-2xl bg-stone-50 p-4"><div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-stone-500"><ClipboardIcon size={14} /> Preview robots.txt</div><pre className="mt-2 overflow-x-auto whitespace-pre text-[11px] leading-relaxed text-stone-700">{robotsPreview}</pre></div>
            </div>
            <div className="rounded-3xl border border-orange-900/10 bg-white/80 p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><Newspaper size={18} className="text-orange-600" /><h2 className="font-display text-xl font-black text-stone-900">Artikel 48 Jam Terakhir</h2></div>
                <p className="mt-1 text-xs font-semibold text-stone-500">Kandidat untuk news sitemap (Google News) — artikel yang diterbitkan dalam 48 jam terakhir.</p>
                <ul className="mt-4 space-y-3">{articles.filter((article) => article.status === "published" && article.published_at && Date.now() - new Date(article.published_at).getTime() < 48 * 60 * 60 * 1000).slice(0, 20).map((article) => <li key={article.id} className="flex items-center justify-between gap-3 rounded-2xl border border-orange-900/5 bg-white px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-bold text-stone-800">{article.title}</p><p className="text-[11px] font-semibold text-stone-400">{article.published_at ? new Date(article.published_at).toLocaleString("id-ID") : ""}</p></div><a href={`https://swapnews.co.id/${article.slug}`} target="_blank" rel="noreferrer" className="shrink-0 text-orange-600 hover:opacity-70"><ExternalLink size={15} /></a></li>)}
                    {!articles.filter((article) => article.status === "published" && article.published_at && Date.now() - new Date(article.published_at).getTime() < 48 * 60 * 60 * 1000).length && <div className="py-10 text-center text-sm font-semibold text-stone-400"><LayoutList size={20} className="mx-auto mb-2 opacity-40" /> Belum ada artikel yang terbit dalam 48 jam terakhir.</div>}</ul>
            </div>
        </section>}
    </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
    return <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2 text-xs font-bold text-stone-700"><span className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-orange-500" : "bg-stone-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-4.5" : "left-0.5"}`} /></span>{label}</button>;
}
