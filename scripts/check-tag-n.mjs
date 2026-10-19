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

async function checkTagN() {
    const { data: all } = await supabase.from('articles').select('id, title, content');
    let countTagN = 0;
    const samples = [];

    for (const a of all || []) {
        if (!a.content) continue;
        // Deteksi huruf 'n' berdiri sendiri di antara tag HTML:
        // Contoh: <ul>n <li>, </li>n <li>, </li>n </ul>, <p>n, >n<
        if (/>\s*n\s*</i.test(a.content) || /<\/?(ul|ol|li|p|div|blockquote|h[1-6])>\s*n\s*/i.test(a.content) || /\s*n\s*<\/?(ul|ol|li|p|div|blockquote|h[1-6])>/i.test(a.content)) {
            countTagN++;
            if (samples.length < 5) samples.push({ id: a.id, title: a.title });
        }
    }

    console.log('Total artikel dengan huruf "n" liar di antara tag HTML:', countTagN);
    console.log('Sampel:', samples);
}

checkTagN().catch(console.error);
