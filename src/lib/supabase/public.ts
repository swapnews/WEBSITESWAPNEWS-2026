import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";

/**
 * Klien Supabase untuk data PUBLIK (read-only, tanpa cookie).
 *
 * Kenapa ini ada: `createClient()` di `./server.ts` memanggil `cookies()`.
 * Di App Router, menyentuh `cookies()` memaksa rute menjadi dinamis —
 * sehingga ISR/caching tidak mungkin aktif. Karena konten berita bersifat
 * publik dan tidak bergantung sesi, kita pakai anon key tanpa cookie agar
 * halaman bisa di-cache dan disajikan sebagai HTML statis.
 *
 * JANGAN pakai klien ini untuk data yang bergantung pada user login.
 */
let cachedClient: SupabaseClient | null = null;

export function createPublicClient(): SupabaseClient {
    if (cachedClient) return cachedClient;
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    cachedClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return cachedClient;
}
