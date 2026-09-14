import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { getSiteConfig } from "@/lib/site-config";
import { ShopeeCatalogView, type MerchandiseItem } from "@/components/merchandise/shopee-catalog-view";
import "@/styles/merchandise-shopee.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
    const config = await getSiteConfig();
    return {
        title: `${config.merchandise_store_title} — SwapNews Official Store`,
        description: `${config.merchandise_store_subtitle} Katalog merchandise resmi SwapNews. Bayar via QRIS Pakasir atau tukar poin member.`,
    };
}

export default async function MerchandisePage() {
    const [profile, supabase, config] = await Promise.all([
        getCurrentProfile(),
        createClient(),
        getSiteConfig(),
    ]);

    const { data: products } = await supabase
        .from("products")
        .select("id,slug,name,description,category_product,sku,weight_grams,price_idr,original_price_idr,price_points,stock,rating,sales_count,variants,image_url,is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    return (
        <main className="merchandise-portal-page" style={{ minHeight: "100vh", background: "#f8fafc" }}>
            <ShopeeCatalogView
                products={(products as MerchandiseItem[]) || []}
                config={config}
                isMember={Boolean(profile?.is_member)}
            />
        </main>
    );
}
