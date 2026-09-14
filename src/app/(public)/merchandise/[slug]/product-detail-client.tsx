"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Star, ShieldCheck, Truck, Sparkles, ShoppingBag,
    Coins, ChevronRight, Package, Check
} from "lucide-react";
import type { MerchandiseItem } from "@/components/merchandise/shopee-catalog-view";
import type { SiteConfigMap } from "@/lib/site-config";

type Props = {
    product: MerchandiseItem;
    config: SiteConfigMap;
    isMember: boolean;
};

export function ShopeeProductDetailClient({ product, config, isMember }: Props) {
    const router = useRouter();
    let variants: string[] = [];
    try {
        variants = typeof product.variants === "string" ? JSON.parse(product.variants) : product.variants || [];
    } catch {
        variants = [];
    }

    const [selectedVariant, setSelectedVariant] = useState(variants[0] || "");
    const [quantity, setQuantity] = useState(1);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [checkoutError, setCheckoutError] = useState("");

    const discountPct = product.original_price_idr && product.original_price_idr > product.price_idr
        ? Math.round(((product.original_price_idr - product.price_idr) / product.original_price_idr) * 100)
        : null;

    const totalPrice = product.price_idr * quantity;
    const totalPoints = product.price_points * quantity;

    const handleBuyRupiah = async () => {
        setIsCheckingOut(true);
        setCheckoutError("");
        try {
            const res = await fetch("/api/pakasir/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "product",
                    product_id: product.id,
                    quantity,
                    variant: selectedVariant,
                }),
            });
            const data = await res.json();
            if (res.status === 401) {
                router.push(`/panelswap?redirect=/merchandise/${product.slug}`);
                return;
            }
            if (!res.ok) {
                setCheckoutError(data.error || "Gagal membuat transaksi Pakasir.");
                setIsCheckingOut(false);
                return;
            }
            if (data.payment?.payment_url) {
                window.location.href = data.payment.payment_url;
                return;
            }
            setCheckoutError("Transaksi berhasil dibuat. Ikuti petunjuk pembayaran.");
        } catch (err: unknown) {
            setCheckoutError(err instanceof Error ? err.message : "Terjadi kesalahan jaringan.");
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <div className="shopee-detail-container">
            {/* Breadcrumb */}
            <nav className="shopee-breadcrumb">
                <Link href="/">Beranda</Link>
                <ChevronRight size={14} />
                <Link href="/merchandise">Merchandise</Link>
                <ChevronRight size={14} />
                <span>{product.name}</span>
            </nav>

            {/* Main Product Box */}
            <div className="shopee-detail-box">
                {/* Left: Product Image */}
                <div>
                    <div className="shopee-detail-gallery">
                        {product.image_url ? (
                            <Image
                                src={product.image_url}
                                alt={product.name}
                                fill
                                style={{ objectFit: "cover" }}
                                priority
                                sizes="(max-width: 860px) 100vw, 420px"
                            />
                        ) : (
                            <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#94a3b8" }}>
                                <Package size={64} />
                            </div>
                        )}
                        <span className="shopee-badge-mall">OFFICIAL</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12 }}>
                            <ShieldCheck size={18} style={{ color: "#ea580c" }} />
                            <span>100% Original</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12 }}>
                            <Truck size={18} style={{ color: "#ea580c" }} />
                            <span>Garansi Kirim</span>
                        </div>
                    </div>
                </div>

                {/* Right: Product Info & Buy Actions */}
                <div className="shopee-detail-info">
                    <h1>{product.name}</h1>

                    <div className="shopee-detail-stats">
                        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#ea580c", fontWeight: 800 }}>
                            <span>{product.rating || 5.0}</span>
                            <div style={{ display: "flex" }}>
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />
                                ))}
                            </div>
                        </div>
                        <span>|</span>
                        <span><b>{product.sales_count || 0}</b> Terjual</span>
                        <span>|</span>
                        <span>Kategori: <b>{product.category_product || "Umum"}</b></span>
                    </div>

                    {/* Price Box */}
                    <div className="shopee-detail-price-box">
                        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                            <span className="shopee-detail-price-idr">Rp{totalPrice.toLocaleString("id-ID")}</span>
                            {product.original_price_idr && product.original_price_idr > product.price_idr && (
                                <>
                                    <span style={{ fontSize: 16, color: "#94a3b8", textDecoration: "line-through" }}>
                                        Rp{(product.original_price_idr * quantity).toLocaleString("id-ID")}
                                    </span>
                                    <span className="shopee-badge-discount" style={{ position: "static", fontSize: 12, padding: "3px 8px" }}>
                                        Diskon {discountPct}%
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="shopee-detail-price-points">
                            ✨ Atau tukar <strong>{totalPoints} Poin</strong> Member SwapNews
                        </div>
                    </div>

                    {/* Specs / Details */}
                    <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 18, marginBottom: 18 }}>
                        {product.sku && (
                            <div className="shopee-spec-row">
                                <span className="shopee-spec-label">Kode SKU</span>
                                <span className="shopee-spec-value"><code>{product.sku}</code></span>
                            </div>
                        )}
                        <div className="shopee-spec-row">
                            <span className="shopee-spec-label">Berat Satuan</span>
                            <span className="shopee-spec-value">{product.weight_grams || 200} gram</span>
                        </div>
                        <div className="shopee-spec-row">
                            <span className="shopee-spec-label">Ongkos Kirim</span>
                            <span className="shopee-spec-value" style={{ color: "#15803d" }}>
                                {config.merchandise_free_shipping_min > 0
                                    ? `Gratis Ongkir Min. Belanja Rp${config.merchandise_free_shipping_min.toLocaleString("id-ID")}`
                                    : "Tersedia kurir ekspres seluruh Indonesia"}
                            </span>
                        </div>
                        <div className="shopee-spec-row">
                            <span className="shopee-spec-label">Stok Tersedia</span>
                            <span className="shopee-spec-value" style={{ color: product.stock > 0 ? "#15803d" : "#dc2626" }}>
                                {product.stock > 0 ? `${product.stock} pcs` : "Stok Habis"}
                            </span>
                        </div>
                    </div>

                    {/* Variant Selector */}
                    {variants.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                                Pilihan Varian: {selectedVariant && <b>({selectedVariant})</b>}
                            </span>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                {variants.map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setSelectedVariant(v)}
                                        className={`shopee-variant-btn ${selectedVariant === v ? "active" : ""}`}
                                    >
                                        {selectedVariant === v && <Check size={13} style={{ display: "inline", marginRight: 4 }} />}
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quantity Selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Kuantitas:</span>
                        <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden" }}>
                            <button
                                type="button"
                                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                style={{ width: 36, height: 36, background: "#f8fafc", border: "none", fontSize: 16, cursor: "pointer", fontWeight: 700 }}
                            >
                                -
                            </button>
                            <span style={{ width: 44, textAlign: "center", fontSize: 14, fontWeight: 800 }}>{quantity}</span>
                            <button
                                type="button"
                                onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                                style={{ width: 36, height: 36, background: "#f8fafc", border: "none", fontSize: 16, cursor: "pointer", fontWeight: 700 }}
                            >
                                +
                            </button>
                        </div>
                        <small style={{ color: "#64748b", fontSize: 12 }}>Tersisa {product.stock} buah</small>
                    </div>

                    {checkoutError && (
                        <div style={{ padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 13, marginBottom: 16 }}>
                            {checkoutError}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="shopee-detail-actions">
                        <button
                            type="button"
                            onClick={() => void handleBuyRupiah()}
                            disabled={isCheckingOut || product.stock <= 0}
                            className="shopee-btn-buy"
                        >
                            <ShoppingBag size={18} />
                            {isCheckingOut ? "Memproses..." : `Beli Sekarang (Rp${totalPrice.toLocaleString("id-ID")})`}
                        </button>

                        {isMember ? (
                            <Link href="/member/redeem" className="shopee-btn-redeem">
                                <Coins size={18} style={{ color: "#ea580c" }} />
                                Tukar {totalPoints} Poin
                            </Link>
                        ) : (
                            <Link href="/membership" className="shopee-btn-redeem">
                                <Sparkles size={18} style={{ color: "#ea580c" }} />
                                Tukar Poin Member
                            </Link>
                        )}
                    </div>

                    {/* Description Section */}
                    {product.description && (
                        <div style={{ marginTop: 36, borderTop: "1px solid #e2e8f0", paddingTop: 24 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 850, color: "#0f172a", margin: "0 0 12px" }}>
                                Deskripsi Produk
                            </h3>
                            <div style={{ fontSize: 14, lineHeight: 1.7, color: "#334155", whiteSpace: "pre-line" }}>
                                {product.description}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
