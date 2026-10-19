import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeArticleContent } from './article-cleaner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const envPath = resolve(ROOT, '.env.local');
const envText = readFileSync(envPath, 'utf8');
const SUPABASE_URL = envText.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const SUPABASE_KEY = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function run() {
    console.log('=== MEMULAI BATCH PERBAIKAN PARAGRAF & KARAKTER NN ===');

    // Ambil seluruh artikel
    const { data: articles, error } = await supabase
        .from('articles')
        .select('id, title, content');

    if (error) {
        console.error('Error fetching articles:', error);
        return;
    }

    console.log(`Total artikel yang akan diperiksa: ${articles.length}`);

    let updatedCount = 0;
    const batchSize = 25;

    for (let i = 0; i < articles.length; i += batchSize) {
        const chunk = articles.slice(i, i + batchSize);
        const updates = chunk.map(async (art) => {
            const original = art.content || '';
            const cleaned = normalizeArticleContent(original);

            // Hanya update jika ada perubahan konten
            if (cleaned !== original) {
                const { error: updErr } = await supabase
                    .from('articles')
                    .update({ content: cleaned })
                    .eq('id', art.id);

                if (updErr) {
                    console.error(`Gagal update artikel ${art.id}:`, updErr.message);
                } else {
                    updatedCount++;
                }
            }
        });

        await Promise.all(updates);
        const progress = Math.min(i + batchSize, articles.length);
        process.stdout.write(`Progress: ${progress}/${articles.length} artikel diperiksa...\r`);
    }

    console.log(`\n\nSelesai! Total artikel yang diperbarui kontennya: ${updatedCount} dari ${articles.length}`);
}

run().catch(console.error);
