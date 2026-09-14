import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SiteConfigMap = {
    membership_price_idr: number;
    membership_title: string;
    membership_description: string;
    membership_benefits: string[];
    merchandise_store_title: string;
    merchandise_store_subtitle: string;
    merchandise_free_shipping_min: number;
};

const DEFAULT_CONFIG: SiteConfigMap = {
    membership_price_idr: 49900,
    membership_title: "SwapNews Eksklusif",
    membership_description: "Satu paket tahunan. Dukung jurnalisme warga dan dapatkan akses penuh.",
    membership_benefits: [
        "Artikel eksklusif tanpa batas",
        "Pengalaman baca bebas iklan",
        "Badge member terverifikasi",
        "Kirim berita sebagai kontributor dan kumpulkan poin",
    ],
    merchandise_store_title: "Produk resmi SwapNews",
    merchandise_store_subtitle: "Bayar via Pakasir atau tukar poin member.",
    merchandise_free_shipping_min: 150000,
};

/**
 * Fetch all site configuration with zero-leak column projection.
 * Cached per request cycle using React cache().
 */
export const getSiteConfig = cache(async (): Promise<SiteConfigMap> => {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("site_config")
            .select("key,value");

        if (error || !data) {
            return DEFAULT_CONFIG;
        }

        const map: Partial<SiteConfigMap> = {};
        for (const row of data) {
            try {
                // Supabase returns jsonb parsed or string depending on client
                const val = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
                (map as Record<string, unknown>)[row.key] = val;
            } catch {
                (map as Record<string, unknown>)[row.key] = row.value;
            }
        }

        return {
            membership_price_idr: typeof map.membership_price_idr === "number" ? map.membership_price_idr : DEFAULT_CONFIG.membership_price_idr,
            membership_title: typeof map.membership_title === "string" ? map.membership_title : DEFAULT_CONFIG.membership_title,
            membership_description: typeof map.membership_description === "string" ? map.membership_description : DEFAULT_CONFIG.membership_description,
            membership_benefits: Array.isArray(map.membership_benefits) ? map.membership_benefits : DEFAULT_CONFIG.membership_benefits,
            merchandise_store_title: typeof map.merchandise_store_title === "string" ? map.merchandise_store_title : DEFAULT_CONFIG.merchandise_store_title,
            merchandise_store_subtitle: typeof map.merchandise_store_subtitle === "string" ? map.merchandise_store_subtitle : DEFAULT_CONFIG.merchandise_store_subtitle,
            merchandise_free_shipping_min: typeof map.merchandise_free_shipping_min === "number" ? map.merchandise_free_shipping_min : DEFAULT_CONFIG.merchandise_free_shipping_min,
        };
    } catch {
        return DEFAULT_CONFIG;
    }
});
