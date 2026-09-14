"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Star, ShieldCheck, Sparkles, Truck, Package } from "lucide-react";
import type { SiteConfigMap } from "@/lib/site-config";

export type MerchandiseItem = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    category_product?: string | null;
    sku?: string | null;
    weight_grams?: number | null;
    price_idr: number;
    original_price_idr?: number | null;
    price_points: number;
    stock: number;
    rating?: number | null;
    sales_count?: number | null;
    variants?: string | string[] | null;
    image_url: string | null;
    is_active: boolean;
};

type Props = {
    products: MerchandiseItem[];
    config: SiteConfigMap;
    isMember: boolean;
};

export function ShopeeCatalogView({ products, config, isMember }: Props) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Semua");
    const [sortBy, setSortBy] = useState<"popular" | "price_asc" | "price_desc">("popular");

    const categories = useMemo(() => {
        const set = new Set<string>();
        set.add("Semua");
        for (const p of products) {
            if (p.category_product) set.add(p.category_product);
        }
        return Array.from(set);
    }, [products]);

    const filtered = useMemo(() => {
        return products.filter((p) => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = selectedCategory === "Semua" || p.category_product === selectedCategory;
            return matchesSearch && matchesCategory;
        }).sort((a, b) => {
            if (sortBy === "price_asc") return a.price_idr - b.price_idr;
            if (sortBy === "price_desc") return b.price_idr - a.price_idr;
            return (b.sales_count || 0) - (a.sales_count || 0);
        });
    }, [products, searchQuery, selectedCategory, sortBy]);

    return (
        <div className="shopee-store">
            {/* Shopee Style Hero Banner */}
            <section className="shopee-hero-banner">
                <div className="shopee-hero-content">
                    <h1>{config.merchandise_store_title}</h1>
                    <p>{config.merchandise_store_subtitle}</p>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                    {isMember ? (
                        <Link
                            href="/member/redeem"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10, background: "#ffffff", color: "#ea580c", textDecoration: "none", fontSize: 13, fontWeight: 800 }}
                        >
                            <Sparkles size={16} /> Tukar Poin Member
                        </Link>
                    ) : (
                        <Link
                            href="/membership"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10, background: "#ffffff", color: "#ea580c", textDecoration: "none", fontSize: 13, fontWeight: 800 }}
                        >
                            <Sparkles size={16} /> Jadi Member & Kumpulkan Poin
                        </Link>
                    )}
                </div>
            </section>

            {/* Shopee Trust / Guarantee Badges */}
            <div className="shopee-trust-badges">
                <div className="shopee-trust-item">
                    <ShieldCheck size={24} />
                    <div>
                        <strong>100% Original SwapNews</strong>
                        <small>Merchandise resmi langsung dari redaksi</small>
                    </div>
                </div>
                <div className="shopee-trust-item">
                    <Truck size={24} />
                    <div>
                        <strong>Pengiriman Cepat</strong>
                        <small>
                            {config.merchandise_free_shipping_min > 0
                                ? `Gratis ongkir min. Rp${config.merchandise_free_shipping_min.toLocaleString("id-ID")}`
                                : "Ke seluruh wilayah Indonesia"}
                        </small>
                    </div>
                </div>
                <div className="shopee-trust-item">
                    <Sparkles size={24} />
                    <div>
                        <strong>Bayar Rupiah / Poin</strong>
                        <small>Pakasir QRIS otomatis atau poin member</small>
                    </div>
                </div>
            </div>

            {/* Category Filter Chips */}
            <div className="shopee-filter-bar">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`shopee-category-chip ${selectedCategory === cat ? "active" : ""}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Search and Sort Toolbar */}
            <div className="shopee-toolbar">
                <div className="shopee-search-wrap">
                    <Search size={17} className="shopee-search-icon" />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari kaos, topi, souvenir, majalah..."
                        className="shopee-search-input"
                    />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ color: "#64748b", fontWeight: 600 }}>Urutkan:</span>
                    <button
                        type="button"
                        onClick={() => setSortBy("popular")}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid", borderColor: sortBy === "popular" ? "#ea580c" : "#cbd5e1", background: sortBy === "popular" ? "#fff7ed" : "#fff", color: sortBy === "popular" ? "#ea580c" : "#334155", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                    >
                        Terpopuler
                    </button>
                    <button
                        type="button"
                        onClick={() => setSortBy("price_asc")}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid", borderColor: sortBy === "price_asc" ? "#ea580c" : "#cbd5e1", background: sortBy === "price_asc" ? "#fff7ed" : "#fff", color: sortBy === "price_asc" ? "#ea580c" : "#334155", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                    >
                        Harga Terendah
                    </button>
                    <button
                        type="button"
                        onClick={() => setSortBy("price_desc")}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid", borderColor: sortBy === "price_desc" ? "#ea580c" : "#cbd5e1", background: sortBy === "price_desc" ? "#fff7ed" : "#fff", color: sortBy === "price_desc" ? "#ea580c" : "#334155", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                    >
                        Harga Tertinggi
                    </button>
                </div>
            </div>

            {/* Shopee Product Grid */}
            {!filtered.length ? (
                <div style={{ textAlign: "center", padding: "64px 20px", background: "#ffffff", borderRadius: 16, border: "1px solid #e2e8f0" }}>
                    <Package size={48} style={{ color: "#94a3b8", margin: "0 auto 12px" }} />
                    <h3 style={{ fontSize: 18, color: "#0f172a", margin: "0 0 6px" }}>Produk tidak ditemukan</h3>
                    <p style={{ color: "#64748b", fontSize: 13 }}>Coba kata kunci lain atau pilih kategori yang berbeda.</p>
                </div>
            ) : (
                <div className="shopee-grid">
                    {filtered.map((product) => {
                        const discountPct = product.original_price_idr && product.original_price_idr > product.price_idr
                            ? Math.round(((product.original_price_idr - product.price_idr) / product.original_price_idr) * 100)
                            : null;

                        return (
                            <Link href={`/merchandise/${product.slug}`} key={product.id} className="shopee-card">
                                <div className="shopee-card-img">
                                    {product.image_url ? (
                                        <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 640px) 50vw, 240px" />
                                    ) : (
                                        <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#94a3b8" }}><Package size={32} /></div>
                                    )}
                                    <span className="shopee-badge-mall">OFFICIAL</span>
                                    {discountPct && <span className="shopee-badge-discount">-{discountPct}%</span>}
                                </div>

                                <div className="shopee-card-body">
                                    <h3 className="shopee-card-title">{product.name}</h3>

                                    <div className="shopee-card-pricing">
                                        <span className="shopee-price-main">Rp{product.price_idr.toLocaleString("id-ID")}</span>
                                        {product.original_price_idr && product.original_price_idr > product.price_idr && (
                                            <span className="shopee-price-original">Rp{product.original_price_idr.toLocaleString("id-ID")}</span>
                                        )}
                                    </div>

                                    <div className="shopee-points-pill">
                                        <Sparkles size={12} /> {product.price_points} Poin
                                    </div>

                                    <div className="shopee-card-footer">
                                        <span className="shopee-rating">
                                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                                            {product.rating || 5.0}
                                        </span>
                                        <span>{product.sales_count || 0} terjual</span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
