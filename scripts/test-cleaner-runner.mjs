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

async function testClean() {
    const { data: adhd } = await supabase
        .from('articles')
        .select('id, title, content')
        .ilike('content', '%ADHD%')
        .limit(1);

    if (adhd && adhd[0]) {
        console.log('=== BEFORE (RAW) ===');
        console.log(adhd[0].content.slice(0, 300));
        console.log('\n=== AFTER (NORMALIZED) ===');
        const cleaned = normalizeArticleContent(adhd[0].content);
        console.log(cleaned);
        console.log('\nHas <p> tags:', cleaned.includes('<p>'));
        console.log('Still has "nn" pattern:', /([a-z0-9])nn([A-Z0-9])/g.test(cleaned));
    }
}

testClean().catch(console.error);
