import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
    PackagePlus, Trash2, ShoppingBag, Settings, Layers,
    FileSpreadsheet, CheckCircle2, ShieldAlert, Star, Edit3, Tag
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { getSiteConfig } from "@/lib/site-config";
import { deleteProductAction, saveProductAction, saveShopSettingsAction, updateOrderStatusAction } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const getParam = (params: Record<string, string | string[] | undefined>, key: string) => {
    const val = params[key];
    return Array.isArray(val) ? val[0] : val || "";
};

export default async function MerchandiseDashboard({ searchParams }: Props) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap?next=/dashboard/merchandise");
    if (profile.role !== "super_admin") redirect("/dashboard");

    const params = await searchParams;
    const activeTab = getParam(params, "tab") || "products";
    const editProductId = getParam(params, "edit");
    const successMsg = getParam(params, "success");
    const errorMsg = getParam(params, "error");

    const supabase = await createClient();
    const config = await getSiteConfig();

    const [{ data: products }, { data: orders }] = await Promise.all([
        supabase
            .from("products")
            .select("id,slug,name,description,category_product,sku,weight_grams,price_idr,original_price_idr,price_points,stock,rating,sales_count,variants,image_url,is_active,updated_at")
            .order("updated_at", { ascending: false }),
        supabase
            .from("orders")
            .select("id,quantity,payment_method,total_idr,total_points,status,transaction_id,created_at,products(name,image_url),profiles(full_name,email)")
            .order("created_at", { ascending: false })
            .limit(100),
    ]);

    const editingProduct = editProductId ? (products || []).find((p) => p.id === editProductId) : null;

    return (
        <DashboardLayout profile={profile}>
            <section className="dashboard-hero clay-card" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
                <div>
                    <span className="eyebrow" style={{ color: "var(--dash-accent-strong, #ea580c)" }}>E-COMMERCE CMS • PAKASIR INTEGRATED</span>
                    <h1 style={{ color: "#000000" }}>Manajemen Merchandise SwapNews</h1>
                    <p style={{ color: "#4b5563" }}>
                        Kelola katalog produk detail (SKU, varian, diskon), pantau transaksi Pakasir, dan ubah pengaturan toko dinamis.
                    </p>
                </div>
                <PackagePlus size={44} style={{ color: "var(--dash-accent, #f97316)" }} />
            </section>

            {successMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderRadius: 12, background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", margin: "16px 0", fontSize: 13, fontWeight: 700 }}>
                    <CheckCircle2 size={18} /> {successMsg}
                </div>
            )}

            {errorMsg && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", margin: "16px 0", fontSize: 13, fontWeight: 700 }}>
                    <ShieldAlert size={18} /> {errorMsg}
                </div>
            )}

            {/* Navigation Tabs */}
            <div style={{ display: "flex", gap: 10, borderBottom: "2px solid #e2e8f0", paddingBottom: 12, margin: "20px 0" }}>
                <Link
                    href="/dashboard/merchandise?tab=products"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 18px",
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: 13,
                        textDecoration: "none",
                        background: activeTab === "products" && !editProductId ? "var(--dash-accent, #f97316)" : "#ffffff",
                        color: activeTab === "products" && !editProductId ? "#ffffff" : "#000000",
                        border: "1px solid",
                        borderColor: activeTab === "products" && !editProductId ? "var(--dash-accent, #f97316)" : "#cbd5e1",
                    }}
                >
                    <Layers size={16} /> Katalog Produk ({products?.length || 0})
                </Link>

                <Link
                    href="/dashboard/merchandise?tab=new"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 18px",
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: 13,
                        textDecoration: "none",
                        background: activeTab === "new" || editProductId ? "var(--dash-accent, #f97316)" : "#ffffff",
                        color: activeTab === "new" || editProductId ? "#ffffff" : "#000000",
                        border: "1px solid",
                        borderColor: activeTab === "new" || editProductId ? "var(--dash-accent, #f97316)" : "#cbd5e1",
                    }}
                >
                    <PackagePlus size={16} /> {editingProduct ? `Edit: ${editingProduct.name.slice(0, 20)}...` : "+ Tambah Produk Baru"}
                </Link>

                <Link
                    href="/dashboard/merchandise?tab=orders"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 18px",
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: 13,
                        textDecoration: "none",
                        background: activeTab === "orders" ? "var(--dash-accent, #f97316)" : "#ffffff",
                        color: activeTab === "orders" ? "#ffffff" : "#000000",
                        border: "1px solid",
                        borderColor: activeTab === "orders" ? "var(--dash-accent, #f97316)" : "#cbd5e1",
                    }}
                >
                    <ShoppingBag size={16} /> Pesanan Masuk ({orders?.length || 0})
                </Link>

                <Link
                    href="/dashboard/merchandise?tab=settings"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 18px",
                        borderRadius: 10,
                        fontWeight: 800,
                        fontSize: 13,
                        textDecoration: "none",
                        background: activeTab === "settings" ? "var(--dash-accent, #f97316)" : "#ffffff",
                        color: activeTab === "settings" ? "#ffffff" : "#000000",
                        border: "1px solid",
                        borderColor: activeTab === "settings" ? "var(--dash-accent, #f97316)" : "#cbd5e1",
                    }}
                >
                    <Settings size={16} /> Pengaturan Toko
                </Link>
            </div>

            {/* TAB 1: PRODUCT LIST */}
            {activeTab === "products" && !editProductId && (
                <section className="dashboard-panel clay-card" style={{ background: "#ffffff", padding: 24, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <div>
                            <span className="eyebrow" style={{ color: "var(--dash-accent-strong, #ea580c)" }}>KATALOG RESMI</span>
                            <h2 style={{ fontSize: 20, color: "#000000", margin: "4px 0 0" }}>Daftar Produk Merchandise</h2>
                        </div>
                        <Link
                            href="/merchandise"
                            target="_blank"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "#f1f5f9", color: "#0f172a", textDecoration: "none", fontSize: 12, fontWeight: 700, border: "1px solid #cbd5e1" }}
                        >
                            <ShoppingBag size={14} /> Lihat Tampilan Shopee Frontend ↗
                        </Link>
                    </div>

                    <div className="cms-table-wrap">
                        <table className="cms-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                                    <th style={{ padding: "12px 14px", color: "#000000" }}>Produk</th>
                                    <th style={{ padding: "12px 14px", color: "#000000" }}>Kategori & SKU</th>
                                    <th style={{ padding: "12px 14px", color: "#000000" }}>Harga Jual</th>
                                    <th style={{ padding: "12px 14px", color: "#000000" }}>Poin Member</th>
                                    <th style={{ padding: "12px 14px", color: "#000000" }}>Stok & Berat</th>
                                    <th style={{ padding: "12px 14px", color: "#000000" }}>Performa</th>
                                    <th style={{ padding: "12px 14px", color: "#000000" }}>Status</th>
                                    <th style={{ padding: "12px 14px", color: "#000000", textAlign: "right" }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!products?.length ? (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                                            Belum ada produk. Klik &quot;+ Tambah Produk Baru&quot; untuk menambahkan.
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((p) => {
                                        let parsedVariants: string[] = [];
                                        try {
                                            parsedVariants = typeof p.variants === "string" ? JSON.parse(p.variants) : p.variants || [];
                                        } catch {
                                            parsedVariants = [];
                                        }

                                        return (
                                            <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "14px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                        <div style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", background: "#f1f5f9", flexShrink: 0, position: "relative" }}>
                                                            {p.image_url ? (
                                                                <Image src={p.image_url} alt={p.name} fill style={{ objectFit: "cover" }} sizes="52px" />
                                                            ) : (
                                                                <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#94a3b8" }}><Tag size={20} /></div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <strong style={{ display: "block", fontSize: 13, color: "#000000", lineHeight: 1.3 }}>{p.name}</strong>
                                                            <small style={{ color: "#64748b", fontSize: 11 }}>slug: /{p.slug}</small>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: "14px" }}>
                                                    <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 6, background: "#f1f5f9", fontSize: 11, fontWeight: 700, color: "#334155" }}>
                                                        {p.category_product || "Umum"}
                                                    </span>
                                                    {p.sku && <small style={{ display: "block", color: "#64748b", fontSize: 11, marginTop: 3 }}>SKU: {p.sku}</small>}
                                                </td>
                                                <td style={{ padding: "14px" }}>
                                                    <strong style={{ color: "#ea580c", fontSize: 13 }}>
                                                        Rp{p.price_idr.toLocaleString("id-ID")}
                                                    </strong>
                                                    {p.original_price_idr && p.original_price_idr > p.price_idr && (
                                                        <span style={{ display: "block", fontSize: 11, textDecoration: "line-through", color: "#94a3b8" }}>
                                                            Rp{p.original_price_idr.toLocaleString("id-ID")}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: "14px" }}>
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: "#fff7ed", color: "#c2410c", fontWeight: 800, fontSize: 12 }}>
                                                        ✨ {p.price_points} Poin
                                                    </span>
                                                </td>
                                                <td style={{ padding: "14px" }}>
                                                    <span style={{ fontWeight: 700, color: p.stock > 0 ? "#15803d" : "#dc2626" }}>
                                                        {p.stock > 0 ? `${p.stock} pcs` : "Habis"}
                                                    </span>
                                                    <small style={{ display: "block", color: "#64748b", fontSize: 11 }}>{p.weight_grams || 200}g</small>
                                                </td>
                                                <td style={{ padding: "14px" }}>
                                                    <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 700, color: "#b45309" }}>
                                                        <Star size={13} fill="#f59e0b" color="#f59e0b" /> {p.rating || 5.0}
                                                    </span>
                                                    <small style={{ color: "#64748b", fontSize: 11 }}>{p.sales_count || 0} terjual</small>
                                                </td>
                                                <td style={{ padding: "14px" }}>
                                                    <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800, background: p.is_active ? "#ecfdf5" : "#fef2f2", color: p.is_active ? "#15803d" : "#991b1b" }}>
                                                        {p.is_active ? "Aktif" : "Nonaktif"}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "14px", textAlign: "right" }}>
                                                    <div style={{ display: "inline-flex", gap: 8 }}>
                                                        <Link
                                                            href={`/dashboard/merchandise?edit=${p.id}`}
                                                            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "#f1f5f9", color: "#0f172a", border: "1px solid #cbd5e1" }}
                                                            title="Edit Produk"
                                                        >
                                                            <Edit3 size={15} />
                                                        </Link>
                                                        <form action={deleteProductAction} style={{ display: "inline" }}>
                                                            <input type="hidden" name="id" value={p.id} />
                                                            <button
                                                                type="submit"
                                                                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", cursor: "pointer" }}
                                                                title="Hapus Produk"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </form>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* TAB 2: ADD / EDIT PRODUCT FORM */}
            {(activeTab === "new" || editProductId) && (
                <section className="dashboard-panel clay-card" style={{ background: "#ffffff", padding: 28, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                    <div style={{ marginBottom: 20 }}>
                        <span className="eyebrow" style={{ color: "var(--dash-accent-strong, #ea580c)" }}>
                            {editingProduct ? "PERBARUI PRODUK" : "TAMBAH PRODUK BARU"}
                        </span>
                        <h2 style={{ fontSize: 22, color: "#000000", margin: "4px 0" }}>
                            {editingProduct ? `Edit Detail: ${editingProduct.name}` : "Form Detail Produk & Merchandise"}
                        </h2>
                        <p style={{ color: "#4b5563", fontSize: 13 }}>
                            Semua atribut produk dapat diubah dan langsung tampil di katalog publik Shopee-style.
                        </p>
                    </div>

                    <form action={saveProductAction} style={{ display: "grid", gap: 18 }}>
                        {editingProduct && <input type="hidden" name="id" value={editingProduct.id} />}

                        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
                            <label style={{ display: "grid", gap: 6 }}>
                                <strong style={{ color: "#000000", fontSize: 13 }}>Nama Produk *</strong>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    defaultValue={editingProduct?.name || ""}
                                    placeholder="Contoh: Kaos Official SwapNews Cotton Combed 30s"
                                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13, fontWeight: 700 }}
                                />
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <strong style={{ color: "#000000", fontSize: 13 }}>Slug URL</strong>
                                <input
                                    name="slug"
                                    type="text"
                                    defaultValue={editingProduct?.slug || ""}
                                    placeholder="otomatis dari nama jika kosong"
                                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13 }}
                                />
                            </label>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                            <label style={{ display: "grid", gap: 6 }}>
                                <strong style={{ color: "#000000", fontSize: 13 }}>Kategori Produk</strong>
                                <select
                                    name="category_product"
                                    defaultValue={editingProduct?.category_product || "Pakaian"}
                                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13 }}
                                >
                                    <option value="Pakaian">Pakaian (T-Shirt, Hoodie)</option>
                                    <option value="Aksesoris">Aksesoris (Topi, Tumbler, Pin)</option>
                                    <option value="Buku & Majalah">Buku & Majalah Jurnalistik</option>
                                    <option value="Souvenir">Souvenir & Merchandise</option>
                                    <option value="Digital">Produk Digital / Template</option>
                                    <option value="Umum">Umum</option>
                                </select>
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <strong style={{ color: "#000000", fontSize: 13 }}>SKU (Kode Barang)</strong>
                                <input
                                    name="sku"
                                    type="text"
                                    defaultValue={editingProduct?.sku || ""}
                                    placeholder="SWP-TSHIRT-001"
                                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13 }}
                                />
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <strong style={{ color: "#000000", fontSize: 13 }}>Berat Produk (gram)</strong>
                                <input
                                    name="weight_grams"
                                    type="number"
                                    min="1"
                                    defaultValue={editingProduct?.weight_grams || 250}
                                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13 }}
                                />
                            </label>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
                            <label style={{ display: "grid", gap: 6 }}>
                                <strong style={{ color: "#000000", fontSize: 13 }}>Harga Jual (Rp) *</strong>
                                <input
                                    name="price_idr"
                                    type="number"
                                    min="1"
                                    required
                                    defaultValue={editingProduct?.price_idr || 79000}
                                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13, fontWeight: 700 }}
                                />
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <strong style={{ color: "#000000", fontSize: 13 }}>Harga Asli Coret (Rp)</strong>
                                <input
                                    name="original_price_idr"
                                    type="number"
                                    min="0"
                                    defaultValue={editingProduct?.original_price_idr || 120000}
                                    placeholder="Diskon jika diisi"
                                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13 }}
                                />
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <strong style={{ color: "#000000", fontSize: 13 }}>Harga Poin Member *</strong>
                                <input
                                    name="price_points"
                                    type="number"
                                    min="1"
                                    required
                                    defaultValue={editingProduct?.price_points || 79}
                                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13, fontWeight: 700 }}
                                />
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <strong style={{ color: "#000000", fontSize: 13 }}>Jumlah Stok *</strong>
                                <input
                                    name="stock"
                                    type="number"
                                    min="0"
                                    required
                                    defaultValue={editingProduct?.stock ?? 50}
                                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13 }}
                                />
                            </label>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 16 }}>
                            <label style={{ display: "grid", gap: 6 }}>
                                <strong style={{ color: "#000000", fontSize: 13 }}>URL Gambar Produk (Cloudinary / HTTPS)</strong>
                                <input
                                    name="image_url"
                                    type="url"
                                    defaultValue={editingProduct?.image_url || ""}
                                    placeholder="https://res.cloudinary.com/.../product.jpg"
                                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13 }}
                                />
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <strong style={{ color: "#000000", fontSize: 13 }}>Rating Bintang (1.0 - 5.0)</strong>
                                <input
                                    name="rating"
                                    type="number"
                                    step="0.1"
                                    min="1.0"
                                    max="5.0"
                                    defaultValue={editingProduct?.rating || 4.9}
                                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13 }}
                                />
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                                <strong style={{ color: "#000000", fontSize: 13 }}>Jumlah Terjual (Sales Count)</strong>
                                <input
                                    name="sales_count"
                                    type="number"
                                    min="0"
                                    defaultValue={editingProduct?.sales_count || 120}
                                    style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13 }}
                                />
                            </label>
                        </div>

                        <label style={{ display: "grid", gap: 6 }}>
                            <strong style={{ color: "#000000", fontSize: 13 }}>Pilihan Varian Produk (pisahkan dengan koma)</strong>
                            <input
                                name="variants"
                                type="text"
                                defaultValue={
                                    editingProduct?.variants
                                        ? (typeof editingProduct.variants === "string" ? JSON.parse(editingProduct.variants) : editingProduct.variants).join(", ")
                                        : "S, M, L, XL, XXL"
                                }
                                placeholder="Contoh: S, M, L, XL atau Hitam, Putih, Navy"
                                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13 }}
                            />
                            <small style={{ color: "#64748b", fontSize: 11 }}>
                                Varian ini akan muncul sebagai tombol pilihan ukuran/warna pada halaman detail Shopee.
                            </small>
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <strong style={{ color: "#000000", fontSize: 13 }}>Deskripsi & Spesifikasi Produk Lengkap</strong>
                            <textarea
                                name="description"
                                rows={5}
                                defaultValue={editingProduct?.description || ""}
                                placeholder="Bahan cotton combed 30s premium, sablon discharge berkualitas tinggi..."
                                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13, resize: "vertical" }}
                            />
                        </label>

                        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", marginTop: 4 }}>
                            <input
                                name="is_active"
                                type="checkbox"
                                defaultChecked={editingProduct ? editingProduct.is_active : true}
                                style={{ width: 18, height: 18 }}
                            />
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#000000" }}>
                                Tampilkan Produk di Katalog Publik (Status Aktif)
                            </span>
                        </label>

                        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 14 }}>
                            <Link
                                href="/dashboard/merchandise?tab=products"
                                style={{ padding: "10px 20px", borderRadius: 8, background: "#f1f5f9", color: "#334155", textDecoration: "none", fontSize: 13, fontWeight: 700, border: "1px solid #cbd5e1" }}
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                className="primary-button"
                                style={{ padding: "10px 24px", borderRadius: 8, background: "var(--dash-accent, #f97316)", color: "#ffffff", border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
                            >
                                {editingProduct ? "Simpan Perubahan Produk" : "Tambah Produk Baru"}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {/* TAB 3: ORDERS LIST */}
            {activeTab === "orders" && (
                <section className="dashboard-panel clay-card" style={{ background: "#ffffff", padding: 24, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                    <div style={{ marginBottom: 20 }}>
                        <span className="eyebrow" style={{ color: "var(--dash-accent-strong, #ea580c)" }}>FULFILMENT ORDER</span>
                        <h2 style={{ fontSize: 20, color: "#000000", margin: "4px 0 0" }}>Daftar Pesanan Pakasir & Redeem</h2>
                    </div>

                    <div className="cms-table-wrap">
                        <table className="cms-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                                    <th style={{ padding: "12px 14px", color: "#000000" }}>Pembeli</th>
                                    <th style={{ padding: "12px 14px", color: "#000000" }}>Produk</th>
                                    <th style={{ padding: "12px 14px", color: "#000000" }}>Total Pembayaran</th>
                                    <th style={{ padding: "12px 14px", color: "#000000" }}>ID Transaksi</th>
                                    <th style={{ padding: "12px 14px", color: "#000000" }}>Tanggal</th>
                                    <th style={{ padding: "12px 14px", color: "#000000" }}>Status Pesanan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!orders?.length ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                                            Belum ada pesanan masuk.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((order) => {
                                        const buyer = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles;
                                        const product = Array.isArray(order.products) ? order.products[0] : order.products;

                                        return (
                                            <tr key={order.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "14px" }}>
                                                    <strong style={{ display: "block", color: "#000000", fontSize: 13 }}>
                                                        {buyer?.full_name || buyer?.email || "Member"}
                                                    </strong>
                                                    <small style={{ color: "#64748b", fontSize: 11 }}>{buyer?.email}</small>
                                                </td>
                                                <td style={{ padding: "14px" }}>
                                                    <span style={{ fontWeight: 700, color: "#000000", fontSize: 13 }}>
                                                        {product?.name || "Produk Merchandise"}
                                                    </span>
                                                    <small style={{ display: "block", color: "#64748b", fontSize: 11 }}>Qty: {order.quantity} pcs</small>
                                                </td>
                                                <td style={{ padding: "14px" }}>
                                                    <strong style={{ color: order.total_idr ? "#ea580c" : "#0284c7", fontSize: 13 }}>
                                                        {order.total_idr ? `Rp${order.total_idr.toLocaleString("id-ID")}` : `${order.total_points} Poin`}
                                                    </strong>
                                                    <small style={{ display: "block", color: "#64748b", fontSize: 11 }}>{order.payment_method?.toUpperCase()}</small>
                                                </td>
                                                <td style={{ padding: "14px" }}>
                                                    <code style={{ fontSize: 11, background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, color: "#0f172a" }}>
                                                        {order.transaction_id || "-"}
                                                    </code>
                                                </td>
                                                <td style={{ padding: "14px", fontSize: 12, color: "#475569" }}>
                                                    {new Date(order.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                                                </td>
                                                <td style={{ padding: "14px" }}>
                                                    <form action={updateOrderStatusAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                        <input type="hidden" name="id" value={order.id} />
                                                        <select
                                                            name="status"
                                                            defaultValue={order.status}
                                                            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, color: "#000000", fontWeight: 700 }}
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="paid">Paid (Lunas)</option>
                                                            <option value="processing">Diproses</option>
                                                            <option value="shipped">Dikirim</option>
                                                            <option value="completed">Selesai</option>
                                                            <option value="refunded">Refund</option>
                                                            <option value="cancelled">Dibatalkan</option>
                                                        </select>
                                                        <button
                                                            type="submit"
                                                            style={{ padding: "6px 10px", borderRadius: 6, background: "#0f172a", color: "#fff", border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                                                        >
                                                            Update
                                                        </button>
                                                    </form>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* TAB 4: SHOP SETTINGS */}
            {activeTab === "settings" && (
                <section className="dashboard-panel clay-card" style={{ background: "#ffffff", padding: 28, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                    <div style={{ marginBottom: 20 }}>
                        <span className="eyebrow" style={{ color: "var(--dash-accent-strong, #ea580c)" }}>PENGATURAN TOKO MERCHANDISE</span>
                        <h2 style={{ fontSize: 22, color: "#000000", margin: "4px 0" }}>Pengaturan Tampilan & Promo Toko</h2>
                        <p style={{ color: "#4b5563", fontSize: 13 }}>
                            Dapat diubah kapan saja untuk menyesuaikan banner promosi Shopee-style di frontend tanpa hardcode.
                        </p>
                    </div>

                    <form action={saveShopSettingsAction} style={{ display: "grid", gap: 18, maxWidth: 680 }}>
                        <label style={{ display: "grid", gap: 6 }}>
                            <strong style={{ color: "#000000", fontSize: 13 }}>Judul Halaman Merchandise</strong>
                            <input
                                name="merchandise_store_title"
                                type="text"
                                defaultValue={config.merchandise_store_title}
                                required
                                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13 }}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <strong style={{ color: "#000000", fontSize: 13 }}>Subjudul / Tagline Toko</strong>
                            <input
                                name="merchandise_store_subtitle"
                                type="text"
                                defaultValue={config.merchandise_store_subtitle}
                                required
                                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13 }}
                            />
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                            <strong style={{ color: "#000000", fontSize: 13 }}>Minimal Belanja Gratis Ongkir (Rp)</strong>
                            <input
                                name="merchandise_free_shipping_min"
                                type="number"
                                min="0"
                                step="1000"
                                defaultValue={config.merchandise_free_shipping_min}
                                style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", color: "#000000", fontSize: 13 }}
                            />
                            <small style={{ color: "#64748b", fontSize: 11 }}>
                                Digunakan untuk badge &quot;Gratis Ongkir Min. Belanja Rp...&quot; pada kartu Shopee. Isi 0 untuk menonaktifkan.
                            </small>
                        </label>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                            <button
                                type="submit"
                                className="primary-button"
                                style={{ padding: "11px 24px", borderRadius: 8, background: "var(--dash-accent, #f97316)", color: "#ffffff", border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
                            >
                                Simpan Pengaturan Toko
                            </button>
                        </div>
                    </form>
                </section>
            )}
        </DashboardLayout>
    );
}
