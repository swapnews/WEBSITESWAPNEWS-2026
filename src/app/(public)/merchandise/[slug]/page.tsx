import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { getSiteConfig } from "@/lib/site-config";
import { ShopeeProductDetailClient } from "./product-detail-client";
import type { MerchandiseItem } from "@/components/merchandise/shopee-catalog-view";
import "@/styles/merchandise-shopee.css";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ slug: string }>;
};

async function getProduct(slug: string): Promise<MerchandiseItem | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("products")
        .select("id,slug,name,description,category_product,sku,weight_grams,price_idr,original_price_idr,price_points,stock,rating,sales_count,variants,image_url,is_active")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

    if (error || !data) return null;
    return data as MerchandiseItem;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const product = await getProduct(slug);
    if (!product) return { title: "Produk Tidak Ditemukan — SwapNews" };

    const formattedPrice = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(product.price_idr);
    return {
        title: `${product.name} — SwapNews Official Store`,
        description: `Beli ${product.name} seharga ${formattedPrice} atau tukar ${product.price_points} poin. ${product.description?.slice(0, 140) || ""}`,
        openGraph: {
            title: product.name,
            description: product.description || undefined,
            images: product.image_url ? [{ url: product.image_url }] : undefined,
        },
    };
}

export default async function ProductDetailPage({ params }: Props) {
    const { slug } = await params;
    const [product, profile, config] = await Promise.all([
        getProduct(slug),
        getCurrentProfile(),
        getSiteConfig(),
    ]);

    if (!product) notFound();

    return (
        <main className="merchandise-detail-page" style={{ minHeight: "100vh", background: "#f8fafc" }}>
            <ShopeeProductDetailClient
                product={product}
                config={config}
                isMember={Boolean(profile?.is_member)}
            />
        </main>
    );
}
