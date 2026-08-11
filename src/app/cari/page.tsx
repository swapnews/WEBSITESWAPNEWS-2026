import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pencarian — SwapNews" };

type Result = { id: string; slug: string; title: string; excerpt: string | null; published_at: string; view_count: number; category_id?: number | null };
type Category = { id: number; name: string; slug: string };

function cleanQuery(value: string | string[] | undefined) {
    const raw = Array.isArray(value) ? value[0] : value;
    return (raw ?? "").replace(/[\\%_(),."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const query = cleanQuery(params.q);
    const categorySlug = cleanQuery(params.category).toLowerCase();
    const range = ["24h", "7d", "30d"].includes(cleanQuery(params.range)) ? cleanQuery(params.range) : "all";
    let results: Result[] = [];
    const supabase = await createClient();
    const { data: categories = [] } = await supabase.from("categories").select("id,name,slug").order("name");
    const selectedCategory = (categories as Category[] | null)?.find((item) => item.slug === categorySlug);

    if (query.length >= 2) {
        const { data, error } = await supabase.rpc("search_published_articles", { search_query: query, result_limit: 50 });
        if (!error) results = (data ?? []) as Result[];
        else {
            let fallbackQuery = supabase.from("articles").select("id,slug,title,excerpt,published_at,view_count,category_id")
                .eq("status", "published").or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`).order("published_at", { ascending: false }).limit(50);
            if (selectedCategory) fallbackQuery = fallbackQuery.eq("category_id", selectedCategory.id);
            const fallback = await fallbackQuery;
            results = (fallback.data ?? []) as Result[];
        }
        if (selectedCategory) results = results.filter((item) => !item.category_id || item.category_id === selectedCategory.id);
        if (range !== "all") {
            const days = range === "24h" ? 1 : range === "7d" ? 7 : 30;
            const requestTime = new Date();
            const since = requestTime.setDate(requestTime.getDate() - days);
            results = results.filter((item) => new Date(item.published_at).getTime() >= since);
        }
        results = results.slice(0, 30);
    }

    return (
        <main className="member-page">
            <header className="member-head">
                <span>PENCARIAN</span>
                <h1>{query ? `Hasil “${query}”` : "Cari berita"}</h1>
                <p>{results.length} artikel ditemukan.</p>
            </header>
            <form className="search-filter-bar"><label><span>Kata kunci</span><input name="q" defaultValue={query} placeholder="Cari berita..." /></label><label><span>Kanal</span><select name="category" defaultValue={categorySlug}><option value="">Semua kanal</option>{(categories as Category[] | null)?.map(item => <option value={item.slug} key={item.id}>{item.name}</option>)}</select></label><label><span>Rentang</span><select name="range" defaultValue={range}><option value="all">Semua waktu</option><option value="24h">24 jam</option><option value="7d">7 hari</option><option value="30d">30 hari</option></select></label><button><Search /> Cari</button></form>
            {query.length < 2 && <section className="member-cta"><Search /><h2>Masukkan kata kunci</h2><p>Minimal 2 karakter.</p></section>}
            <section className="search-results">
                {results.map((article) => <Link className="search-result" href={`/${article.slug}`} key={article.id}>
                    <h2>{article.title}</h2>
                    <p>{article.excerpt}</p>
                    <small>{new Date(article.published_at).toLocaleDateString("id-ID")} • {article.view_count.toLocaleString("id-ID")} views</small>
                </Link>)}
            </section>
        </main>
    );
}
