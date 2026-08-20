import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import BuyButton from "./buy-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
    title: "Merchandise — SwapNews",
    description: "Katalog merchandise resmi SwapNews. Bayar dengan rupiah via Pakasir atau tukar poin member.",
};

export default async function MerchandisePage() {
    const [profile, supabase] = await Promise.all([getCurrentProfile(), createClient()]);
    const { data: products } = await supabase
        .from("products").select("id,slug,name,description,price_idr,price_points,stock,image_url")
        .eq("is_active", true).gt("stock", 0).order("created_at", { ascending: false });

    return (
        <main className="member-page">
            <header className="member-head">
                <span>MERCHANDISE</span>
                <h1>Produk resmi SwapNews</h1>
                <p>Bayar via Pakasir atau tukar poin member.</p>
            </header>
            {!products?.length && <section className="member-cta"><Package /><h2>Katalog segera hadir</h2><p>Produk merchandise sedang disiapkan redaksi.</p></section>}
            <section className="product-grid">
                {products?.map((product) => <article className="product-card" key={product.id}>
                    {product.image_url
                        ? <Image src={product.image_url} alt={product.name} width={400} height={300} />
                        : <div className="product-placeholder"><Package /></div>}
                    <div className="product-body">
                        <h2>{product.name}</h2>
                        {product.description && <p>{product.description}</p>}
                        <div className="product-prices">
                            <b>Rp{product.price_idr.toLocaleString("id-ID")}</b>
                            <span>{product.price_points} poin</span>
                        </div>
                        <small>Stok: {product.stock}</small>
                        <BuyButton productId={product.id} points={product.price_points} isMember={Boolean(profile?.is_member)} />
                    </div>
                </article>)}
            </section>
            {profile?.is_member && <p className="member-hint">Saldo poin bisa dicek di <Link href="/member">dashboard member</Link>.</p>}
        </main>
    );
}
