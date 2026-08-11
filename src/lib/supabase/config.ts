const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseConfig() {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
            "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
    }

    return { supabaseUrl, supabaseAnonKey };
}
