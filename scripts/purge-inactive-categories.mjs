import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const envPath = resolve(ROOT, '.env.local');
const envText = readFileSync(envPath, 'utf8');
const SUPABASE_URL = envText.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const SUPABASE_KEY = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function purgeInactive() {
    console.log('=== PEMBERSIHAN KATEGORI NONAKTIF ===');

    // 1. Cek parent_id yang mengarah ke kategori nonaktif (putus child reference jika ada)
    const { data: inactives } = await supabase.from('categories').select('id').eq('is_active', false);
    const inactiveIds = inactives.map(i => i.id);
    console.log('Jumlah kategori nonaktif yang akan dihapus:', inactiveIds.length);

    if (inactiveIds.length === 0) {
        console.log('Tidak ada kategori nonaktif.');
        return;
    }

    // Nullkan parent_id di kategori manapun yang menginduk ke inactive
    await supabase.from('categories').update({ parent_id: null }).in('parent_id', inactiveIds);

    // 2. Hapus kategori nonaktif
    const { data, error } = await supabase
        .from('categories')
        .delete()
        .eq('is_active', false)
        .select('id, name');

    if (error) {
        console.error('Error deleting categories:', error);
        return;
    }

    console.log('Berhasil menghapus ' + (data ? data.length : 0) + ' kategori nonaktif!');

    // 3. Tampilkan kategori yang tersisa
    const { data: remaining } = await supabase
        .from('categories')
        .select('id, name, slug, sort_order, is_active')
        .order('sort_order', { ascending: true });

    console.log('Total kategori tersisa:', remaining?.length);
    remaining?.forEach((c, idx) => {
        console.log((idx + 1) + '. ' + c.name + ' (slug: /' + c.slug + ')');
    });
}

purgeInactive().catch(console.error);
