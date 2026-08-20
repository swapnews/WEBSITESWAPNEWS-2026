import { cache } from "react";

import { DEFAULT_INSERTION_SETTINGS, type ArticleInsertionSettings } from "@/lib/article-insertions";
import { createPublicClient } from "@/lib/supabase/public";

export type InlineProduct = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    price_idr: number;
    price_points: number;
    stock: number;
    image_url: string | null;
};

const PRODUCT_COLUMNS = "id,slug,name,description,price_idr,price_points,stock,image_url";

/**
 * Pengaturan sisipan artikel + produk inline.
 *
 * Sebelumnya query ini dijalankan langsung di halaman artikel memakai klien
 * berbasis cookie, sehingga SETIAP artikel terpaksa dirender dinamis. Sekarang
 * memakai klien publik dan dibungkus `cache()` agar hanya sekali per render,
 * dan hasilnya bisa ikut di-cache ISR.
 */
export const getArticleInsertions = cache(async (): Promise<{
    insertions: ArticleInsertionSettings;
    product: InlineProduct | null;
}> => {
    try {
        const supabase = createPublicClient();
        const [{ data: insertionData }, { data: fallbackProduct }] = await Promise.all([
            supabase
                .from("article_insertion_settings")
                .select(
                    "read_also_enabled,read_also_paragraph,read_also_label,product_enabled,product_paragraph,product_id,ad_enabled,ad_paragraph,ad_html,copy_message",
                )
                .eq("id", true)
                .maybeSingle(),
            supabase
                .from("products")
                .select(PRODUCT_COLUMNS)
                .eq("is_active", true)
                .gt("stock", 0)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
        ]);

        const insertions = { ...DEFAULT_INSERTION_SETTINGS, ...(insertionData ?? {}) } as ArticleInsertionSettings;
        let product = (fallbackProduct ?? null) as InlineProduct | null;

        // Produk yang dipilih redaksi menimpa produk terbaru otomatis.
        if (insertions.product_id) {
            const { data } = await supabase
                .from("products")
                .select(PRODUCT_COLUMNS)
                .eq("id", insertions.product_id)
                .eq("is_active", true)
                .maybeSingle();
            product = ((data as InlineProduct | null) ?? product) as InlineProduct | null;
        }

        return { insertions, product };
    } catch (error) {
        console.error("Failed to load article insertions", error);
        return { insertions: DEFAULT_INSERTION_SETTINGS, product: null };
    }
});
