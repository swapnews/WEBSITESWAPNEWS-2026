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

async function check() {
    console.log('=== MEMERIKSA KONTEN ARTIKEL DI SUPABASE ===');

    const { data: allArticles, error } = await supabase
        .from('articles')
        .select('id, slug, title, content, excerpt, status');

    if (error) {
        console.error('Error fetching articles:', error);
        return;
    }

    console.log('Total artikel di Supabase:', allArticles.length);

    let emptyCount = 0;
    let shortCount = 0; // < 100 chars
    let validCount = 0;

    const emptyList = [];

    for (const a of allArticles) {
        const len = a.content ? a.content.trim().length : 0;
        if (len === 0) {
            emptyCount++;
            emptyList.push({ id: a.id, slug: a.slug, title: a.title });
        } else if (len < 100) {
            shortCount++;
        } else {
            validCount++;
        }
    }

    console.log(`- Konten Kosong (0 karakter): ${emptyCount}`);
    console.log(`- Konten Sangat Pendek (<100 karakter): ${shortCount}`);
    console.log(`- Konten Valid (>100 karakter): ${validCount}`);

    if (emptyList.length > 0) {
        console.log('\nContoh artikel kosong:');
        emptyList.slice(0, 5).forEach((e, i) => console.log(`${i + 1}. [${e.slug}] ${e.title}`));
    }

    // Cek apakah ada di staging-articles.json
    const stagingPath = resolve(ROOT, '_import/staging-articles.json');
    try {
        const staging = JSON.parse(readFileSync(stagingPath, 'utf8'));
        console.log('\nTotal artikel di staging-articles.json:', staging.length);
        let stagingEmpty = 0;
        for (const sa of staging) {
            if (!sa.content || sa.content.trim().length === 0) stagingEmpty++;
        }
        console.log('Artikel kosong di staging-articles.json:', stagingEmpty);
    } catch (err) {
        console.log('Error reading staging-articles.json:', err.message);
    }
}

check().catch(console.error);
