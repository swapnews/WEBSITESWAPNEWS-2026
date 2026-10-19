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

async function inspect() {
    const { data: all } = await supabase.from('articles').select('id, title, content');
    let countRnrn = 0;
    let countDoubleN = 0;
    let countPlain = 0; // artikel tanpa tag <p>

    const sampleRnrn = [];
    const sampleDoubleN = [];

    for (const a of all || []) {
        if (!a.content) continue;
        if (a.content.includes('rnrn')) {
            countRnrn++;
            if (sampleRnrn.length < 3) sampleRnrn.push(a);
        }
        // Cek huruf 'nn' yang berdiri sendiri atau di akhir kalimat/kata seperti .nn atau ?nn atau !nn atau rn
        if (/(?:\.|\?|!|\w)nn[A-Z0-9<“"']/.test(a.content) || a.content.startsWith('nn') || a.content.includes('nn&nbsp;') || a.content.includes('nn<')) {
            countDoubleN++;
            if (sampleDoubleN.length < 3) sampleDoubleN.push(a);
        }
        if (!/<\/?(p|div|section|article)\b/i.test(a.content)) {
            countPlain++;
        }
    }

    console.log('Total articles:', all?.length);
    console.log('Articles with "rnrn":', countRnrn);
    console.log('Articles with literal newline "nn":', countDoubleN);
    console.log('Articles lacking <p> tags (plain block):', countPlain);

    console.log('\n--- SAMPLE RNRN ---');
    sampleRnrn.forEach(s => {
        console.log(`[${s.id}] ${s.title}`);
        console.log(s.content.slice(0, 200).replace(/\n/g, ' '));
    });

    console.log('\n--- SAMPLE NN ---');
    sampleDoubleN.forEach(s => {
        console.log(`[${s.id}] ${s.title}`);
        console.log(s.content.slice(0, 200).replace(/\n/g, ' '));
    });
}

inspect();
