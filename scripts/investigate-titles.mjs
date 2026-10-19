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
    const { data: arts } = await supabase
        .from('articles')
        .select('id, title, slug, content')
        .eq('title', '0');

    console.log('Total articles with title == "0":', arts?.length);
    if (arts && arts.length > 0) {
        console.log('Sample 3:');
        arts.slice(0, 3).forEach((a) => {
            console.log('Slug:', a.slug);
            console.log('Content preview:', a.content?.slice(0, 150));
        });
    }

    // Cek apakah ada artikel dengan content berisi tag <p> vs \r\n
    const { data: all } = await supabase.from('articles').select('content').limit(50);
    let hasP = 0;
    let hasRn = 0;
    all?.forEach((a) => {
        if (/<p[\s>]/i.test(a.content)) hasP++;
        if (a.content.includes('\r\n') || a.content.includes('\n\n')) hasRn++;
    });
    console.log(`Out of 50 samples: ${hasP} has <p>, ${hasRn} has newlines`);
}

check();
