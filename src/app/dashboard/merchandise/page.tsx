import Image from "next/image";
import { redirect } from "next/navigation";
import { PackagePlus, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { deleteProductAction, saveProductAction, updateOrderStatusAction } from "./actions";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const param = (p: Record<string, string | string[] | undefined>, k: string) => Array.isArray(p[k]) ? p[k]?.[0] : p[k];

export default async function MerchandiseDashboard({ searchParams }: Props) {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/login?next=/dashboard/merchandise");
    if (profile.role !== "super_admin") redirect("/dashboard");
    const supabase = await createClient();
    const [{ data: products }, { data: orders }] = await Promise.all([
        supabase.from("products").select("id,slug,name,description,price_idr,price_points,stock,image_url,is_active,updated_at").order("updated_at", { ascending: false }),
        supabase.from("orders").select("id,quantity,payment_method,total_idr,total_points,status,transaction_id,created_at,products(name),profiles(full_name,email)").order("created_at", { ascending: false }).limit(100),
    ]);
    const params = await searchParams;
    return <DashboardLayout profile={profile}>
        <section className="dashboard-hero clay-card"><div><span className="eyebrow">Commerce • Pakasir Connected</span><h1>Produk & Merchandise</h1><p>Kelola katalog, stok, harga rupiah/poin, dan fulfilment pesanan.</p></div><PackagePlus size={42} /></section>
        {param(params, "error") && <p className="cms-alert error">{param(params, "error")}</p>}{param(params, "success") && <p className="cms-alert success">{param(params, "success")}</p>}
        <section className="dashboard-panel clay-card merch-admin"><div className="control-heading"><div><span className="eyebrow">Katalog</span><h2>Tambah Produk</h2></div><strong>PAKASIR</strong></div>
            <form action={saveProductAction} className="merch-product-form"><label>Nama<input name="name" required /></label><label>Slug<input name="slug" placeholder="otomatis-dari-nama" /></label><label>Harga Rupiah<input name="price_idr" type="number" min="1" required /></label><label>Harga Poin<input name="price_points" type="number" min="1" required /></label><label>Stok<input name="stock" type="number" min="0" defaultValue="0" /></label><label>URL Gambar<input name="image_url" type="url" /></label><label className="wide">Deskripsi<textarea name="description" rows={3} /></label><label className="checkbox"><input name="is_active" type="checkbox" defaultChecked /><span>Aktif di katalog</span></label><button className="primary-button">Tambah Produk</button></form>
            <div className="merch-admin-grid">{products?.map(product => <article key={product.id} className="merch-admin-card">{product.image_url && <Image src={product.image_url} alt={product.name} width={120} height={90} />}<form action={saveProductAction}><input type="hidden" name="id" value={product.id} /><label>Nama<input name="name" defaultValue={product.name} required /></label><label>Slug<input name="slug" defaultValue={product.slug} required /></label><div><label>Rp<input name="price_idr" type="number" min="1" defaultValue={product.price_idr} /></label><label>Poin<input name="price_points" type="number" min="1" defaultValue={product.price_points} /></label><label>Stok<input name="stock" type="number" min="0" defaultValue={product.stock} /></label></div><label>URL Gambar<input name="image_url" type="url" defaultValue={product.image_url ?? ""} /></label><label>Deskripsi<textarea name="description" rows={2} defaultValue={product.description ?? ""} /></label><label className="checkbox"><input name="is_active" type="checkbox" defaultChecked={product.is_active} /><span>Aktif</span></label><button className="primary-button">Simpan</button></form><form action={deleteProductAction}><input type="hidden" name="id" value={product.id} /><button className="icon-link danger" aria-label={`Hapus ${product.name}`}><Trash2 size={15} /></button></form></article>)}</div>
        </section>
        <section className="dashboard-panel clay-card"><div className="control-heading"><div><span className="eyebrow">Fulfilment</span><h2>Pesanan Pakasir</h2></div><strong>{orders?.length ?? 0} ORDER</strong></div><div className="cms-table-wrap"><table className="cms-table"><thead><tr><th>Pembeli</th><th>Produk</th><th>Total</th><th>Transaksi</th><th>Status</th></tr></thead><tbody>{!orders?.length ? <tr><td colSpan={5} className="cms-empty">Belum ada pesanan.</td></tr> : orders.map(order => { const buyer = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles; const product = Array.isArray(order.products) ? order.products[0] : order.products; return <tr key={order.id}><td>{buyer?.full_name || buyer?.email || "Member"}</td><td>{product?.name} × {order.quantity}</td><td>{order.total_idr ? `Rp${order.total_idr.toLocaleString("id-ID")}` : `${order.total_points} poin`}</td><td><small>{order.transaction_id}</small></td><td><form action={updateOrderStatusAction} className="order-status-form"><input type="hidden" name="id" value={order.id} /><select name="status" defaultValue={order.status} disabled={order.status === "pending"}><option value="pending">Pending Pakasir</option><option value="paid">Paid</option><option value="processing">Diproses</option><option value="shipped">Dikirim</option><option value="completed">Selesai</option><option value="refunded">Refund</option><option value="cancelled">Batal</option></select>{order.status !== "pending" && <button>Simpan</button>}</form></td></tr>; })}</tbody></table></div></section>
    </DashboardLayout>;
}
