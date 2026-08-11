"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type Result = { id: string; slug: string; title: string; excerpt: string | null };

export default function SearchBox() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Result[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const value = query.trim();
        if (value.length < 2) {
            const reset = window.setTimeout(() => setResults([]), 0);
            return () => window.clearTimeout(reset);
        }
        const timer = window.setTimeout(async () => {
            setLoading(true);
            const response = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
            const payload = response.ok ? await response.json() : { results: [] };
            setResults(payload.results ?? []);
            setOpen(true);
            setLoading(false);
        }, 280);
        return () => window.clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        const close = (event: MouseEvent) => {
            if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("click", close);
        return () => document.removeEventListener("click", close);
    }, []);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (query.trim().length >= 2) router.push(`/cari?q=${encodeURIComponent(query.trim())}`);
    };

    return (
        <div className="search-box" ref={boxRef}>
            <form onSubmit={submit} role="search">
                <Search aria-hidden="true" />
                <input id="site-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari berita..." aria-label="Cari berita" autoComplete="off" />
                {query && <button id="search-clear" type="button" onClick={() => { setQuery(""); setResults([]); }} aria-label="Hapus pencarian"><X /></button>}
            </form>
            {open && <div className="search-suggest" role="listbox">
                {loading && <p>Mencari...</p>}
                {!loading && !results.length && <p>Tidak ada hasil.</p>}
                {results.map((item) => <Link href={`/${item.slug}`} key={item.id} onClick={() => setOpen(false)}>
                    <b>{item.title}</b><span>{item.excerpt}</span>
                </Link>)}
            </div>}
        </div>
    );
}
