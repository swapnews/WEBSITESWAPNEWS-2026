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

function isHtml(value) {
    return /<\/?(p|h[1-6]|ul|ol|li|blockquote|figure|img|hr|strong|em|a|code|pre|table)[\s>]/i.test(value);
}

function splitContent(content) {
    if (isHtml(content)) {
        const blockPattern = /<(p|h[1-6]|ul|ol|blockquote|figure|table|pre)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:img|hr)\b[^>]*\/?\s*>/gi;
        const blocks = Array.from(content.matchAll(blockPattern), (match) => match[0]);
        return blocks.length ? blocks : [content];
    }
    return content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

async function run() {
    const { data: arts } = await supabase
        .from('articles')
        .select('id, title, slug, content')
        .limit(10);

    arts.forEach((a, i) => {
        const isH = isHtml(a.content);
        const blocks = splitContent(a.content);
        console.log(`[${i + 1}] ${a.title.slice(0, 30)} | isHtml: ${isH} | blocksCount: ${blocks.length}`);
        console.log(`    Content length: ${a.content.length} chars`);
        console.log(`    Block[0] length: ${blocks[0] ? blocks[0].length : 0} chars`);
        if (blocks.length === 1 && isH && blocks[0] === a.content) {
            console.log('    WARNING: Content has HTML tags (like <strong> or <em>) but NO <p> tags, so splitContent returned 1 giant block or failed blockPattern!');
        }
    });
}

run();
