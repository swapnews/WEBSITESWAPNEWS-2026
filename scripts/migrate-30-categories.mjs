import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const envPath = resolve(ROOT, '.env.local');
const envText = readFileSync(envPath, 'utf8');
const SUPABASE_URL = envText.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const SUPABASE_KEY = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// 30 TARGET CATEGORIES (Detik Network Style, Swap Branded)
const TARGET_CATEGORIES = [
    // 1-7: Berita & Nasional
    { name: 'SwapNews', slug: 'news', description: 'Berita utama, peristiwa nasional dan terkini', sort_order: 1 },
    { name: 'Nasional', slug: 'nasional', description: 'Kabar pemerintahan, kementerian, dan kebijakan publik', sort_order: 2 },
    { name: 'Internasional', slug: 'internasional', description: 'Berita mancanegara dan geopolitik global', sort_order: 3 },
    { name: 'Politik', slug: 'politik', description: 'Partai politik, pemilu, parlemen dan dinamika kekuasaan', sort_order: 4 },
    { name: 'Peristiwa', slug: 'peristiwa', description: 'Kejadian viral, insiden, kecelakaan dan human interest', sort_order: 5 },
    { name: 'Hukum & Kriminal', slug: 'hukum-kriminal', description: 'Kasus pidana, peradilan, korupsi dan aparat penegak hukum', sort_order: 6 },
    { name: 'TNI-Polri', slug: 'tni-polri', description: 'Berita seputar militer TNI, kepolisian Polri dan kamtibmas', sort_order: 7 },

    // 8-10: Finansial & Bisnis
    { name: 'SwapFinance', slug: 'finance', description: 'Finansial, perbankan, pasar modal dan ekonomi makro', sort_order: 8 },
    { name: 'Bisnis', slug: 'bisnis', description: 'Industri, perdagangan, UMKM, ritel dan korporasi', sort_order: 9 },
    { name: 'Ekonomi Digital', slug: 'ekonomi-digital', description: 'Startup, fintech, crypto, e-commerce dan ekonomi kreatif', sort_order: 10 },

    // 11-14: Teknologi & Inovasi
    { name: 'SwapTekno', slug: 'tekno', description: 'Dunia teknologi, internet, telekomunikasi dan software', sort_order: 11 },
    { name: 'Gadget', slug: 'gadget', description: 'Review smartphone, laptop, wearable dan hardware', sort_order: 12 },
    { name: 'AI & Inovasi', slug: 'ai-inovasi', description: 'Kecerdasan buatan, riset masa depan dan inovasi komputasi', sort_order: 13 },
    { name: 'Sains', slug: 'sains', description: 'Antariksa, riset sains, biologi dan pengetahuan alam', sort_order: 14 },

    // 15-18: Hiburan & Budaya Pop
    { name: 'SwapHot', slug: 'hot', description: 'Infotainment selebriti, artis lokal & mancanegara', sort_order: 15 },
    { name: 'Musik', slug: 'musik', description: 'Ulasan musik, album baru, konser dan musisi indie', sort_order: 16 },
    { name: 'Film & Series', slug: 'film', description: 'Review film, bioskop, sinopsis dan serial streaming', sort_order: 17 },
    { name: 'K-Pop', slug: 'kpop', description: 'Drama Korea, idol, K-Music dan budaya Hallyu', sort_order: 18 },

    // 19-20: Olahraga
    { name: 'SwapSport', slug: 'sport', description: 'Olahraga umum, badminton, basket, motoGP dan atletik', sort_order: 19 },
    { name: 'Sepakbola', slug: 'sepakbola', description: 'Liga 1, Timnas Indonesia, Liga Eropa dan bursa transfer', sort_order: 20 },

    // 21-24: Daerah & Wisata
    { name: 'SwapBali', slug: 'bali', description: 'Kabar terkini pulau Bali, budaya lokal, ekspatriat & pariwisata dewata', sort_order: 21 },
    { name: 'SwapDaerah', slug: 'daerah', description: 'Kabar nusantara dari berbagai provinsi di Indonesia', sort_order: 22 },
    { name: 'SwapTravel', slug: 'travel', description: 'Destinasi wisata, panduan liburan, akomodasi dan rute perjalanan', sort_order: 23 },
    { name: 'Kuliner', slug: 'kuliner', description: 'Wisata kuliner, resep, makanan khas dan review tempat makan', sort_order: 24 },

    // 25-30: Gaya Hidup, Kesehatan, Otomotif & Edukasi
    { name: 'SwapHealth', slug: 'health', description: 'Kesehatan medis, info penyakit, gizi dan tips bugar', sort_order: 25 },
    { name: 'SwapOto', slug: 'otomotif', description: 'Dunia otomotif mobil, motor, modifikasi dan tips berkendara', sort_order: 26 },
    { name: 'Psikologi & Mental', slug: 'psikologi', description: 'Kesehatan mental, hubungan, self-development dan psikologi praktis', sort_order: 27 },
    { name: 'Edukasi', slug: 'edukasi', description: 'Kampus, sekolah, beasiswa, sejarah dan wawasan ilmu', sort_order: 28 },
    { name: 'Lingkungan', slug: 'lingkungan', description: 'Bencana alam, cuaca ekstrem, konservasi dan iklim global', sort_order: 29 },
    { name: 'Tokoh & Inspirasi', slug: 'tokoh', description: 'Profil inspiratif, wawancara eksklusif dan kolom opini', sort_order: 30 }
];

// Mapping rule: old category name/slug/id to new category slug
const OLD_TO_NEW_SLUG_MAP = {
    // TNI & Polri & Keamanan
    'porli': 'tni-polri',
    'polri': 'tni-polri',
    'tni': 'tni-polri',
    'tni-polri': 'tni-polri',
    'kamtibmas': 'tni-polri',
    'polair': 'tni-polri',
    'hukum-keamanan': 'tni-polri',
    'keamanan-lalu-lintas': 'tni-polri',
    'imigrasi': 'tni-polri',
    'airsoftgun': 'tni-polri',

    // Hukum
    'hukum-kriminal': 'hukum-kriminal',
    'hukum': 'hukum-kriminal',
    'hukum-korupsi': 'hukum-kriminal',
    'hukum-korupsi-2': 'hukum-kriminal',
    'hukum-keamana': 'hukum-kriminal',
    'penipuan': 'hukum-kriminal',
    'korupsi': 'hukum-kriminal',
    'skandal': 'hukum-kriminal',
    'data-bocor': 'hukum-kriminal',
    'hak-asasi-manusia': 'hukum-kriminal',
    'hukum-lalu-lintas': 'hukum-kriminal',

    // Bali
    'bali': 'bali',

    // Daerah
    'kegiatan-daerah': 'daerah',
    'jakarta': 'daerah',
    'kalimantan': 'daerah',
    'palembang': 'daerah',
    'papua': 'daerah',
    'budaya-lokal': 'daerah',
    'budaya': 'daerah',

    // Nasional & Politik
    'nasional': 'nasional',
    'kementerian': 'nasional',
    'pemerintahan': 'nasional',
    'event-nasional': 'nasional',
    'politik': 'politik',
    'partai-politik': 'politik',
    'aksi-mahasiswa': 'politik',
    'demonstrasi': 'politik',

    // Internasional
    'internasional': 'internasional',
    'geopolitik': 'internasional',
    'nigeria': 'internasional',
    'wna': 'internasional',

    // Peristiwa & Umum
    'peristiwa': 'peristiwa',
    'hotnews': 'news',
    'news': 'news',
    'uncategorized': 'news',
    'buzz': 'peristiwa',
    'viral': 'peristiwa',
    'fakta-unik': 'peristiwa',
    'sosial': 'peristiwa',
    'sosial-masyarakat': 'peristiwa',
    'komunitas': 'peristiwa',
    'kontroversi': 'peristiwa',
    'investigasi': 'peristiwa',
    'editors-pick': 'news',
    'collection': 'news',
    'video': 'news',
    'media-jurnalisme': 'news',

    // Ekonomi & Bisnis
    'finance': 'finance',
    'bisnis': 'bisnis',
    'ekonomi': 'finance',
    'ekonomi-bisnis': 'bisnis',
    'ekonomi-digital': 'ekonomi-digital',
    'crypto': 'ekonomi-digital',
    'digital-marketing': 'ekonomi-digital',

    // Tekno & Sains
    'teknologi': 'tekno',
    'tekno-sains': 'tekno',
    'telekomunikasi-indonesia': 'tekno',
    'gadget': 'gadget',
    'ai': 'ai-inovasi',
    'inovasi': 'ai-inovasi',
    'sains': 'sains',

    // Hiburan & Hot
    'entertainment': 'hot',
    'hiburan': 'hot',
    'selebriti': 'hot',
    'woman': 'hot',
    'movie': 'film',
    'film-series': 'film',
    'k-pop': 'kpop',

    // Musik
    'music': 'musik',
    'musik': 'musik',
    'musik-hiburan': 'musik',
    'musik-lokal': 'musik',
    'musik-sunda': 'musik',
    'band-indie': 'musik',
    'album-baru': 'musik',
    'bedah-lirik': 'musik',
    'rock-metal': 'musik',
    'reggae': 'musik',
    'reggae-2': 'musik',
    'blues': 'musik',
    'pop': 'musik',
    'punk': 'musik',
    'keroncong': 'musik',
    'berita-musik-internasional': 'musik',

    // Olahraga & Bola
    'olahraga': 'sport',
    'bola-sports': 'sport',
    'bola': 'sepakbola',
    'sepak-bola-nasional': 'sepakbola',

    // Travel & Kuliner
    'pariwisata': 'travel',
    'food-travel': 'travel',

    // Kesehatan & Gaya Hidup
    'health': 'health',
    'kesehatan': 'health',
    'psikologi': 'psikologi',
    'otomotif': 'otomotif',
    'transportasi': 'otomotif',
    'infrastruktur-transportasi': 'otomotif',

    // Edukasi & Tokoh
    'pendidikan': 'edukasi',
    'edukasi': 'edukasi',
    'humaniora': 'edukasi',
    'tokoh-inspirasi': 'tokoh',

    // Lingkungan
    'lingkungan': 'lingkungan',
    'bencana-alam': 'lingkungan',
    'banjir': 'lingkungan',
};

async function runMigration() {
    console.log('=== MEMULAI MIGRASI 30 KATEGORI & REMAP ARTIKEL ===\n');

    // 1. Ambil semua kategori saat ini dari database
    const { data: currentDbCategories, error: fetchCatsErr } = await supabase
        .from('categories')
        .select('id, name, slug, sort_order');

    if (fetchCatsErr) throw fetchCatsErr;
    console.log(`Ditemukan ${currentDbCategories.length} kategori saat ini di database.`);

    // 2. Upsert / Pastikan 30 kategori target ada di database
    console.log('\n[Langkah 1] Memastikan 30 kategori baru terdaftar...');
    const newCategoryMap = new Map(); // slug -> id

    for (const target of TARGET_CATEGORIES) {
        // Cari apakah sudah ada dengan slug atau name serupa
        const existing = currentDbCategories.find(c => c.slug.toLowerCase() === target.slug.toLowerCase());

        if (existing) {
            // Update nama, sort_order, deskripsi, is_active
            const { data: updated, error: upErr } = await supabase
                .from('categories')
                .update({
                    name: target.name,
                    slug: target.slug,
                    description: target.description,
                    sort_order: target.sort_order,
                    is_active: true
                })
                .eq('id', existing.id)
                .select('id, name, slug')
                .single();

            if (upErr) {
                console.error(`Gagal update kategori ${target.name}:`, upErr.message);
            } else {
                newCategoryMap.set(target.slug, updated.id);
                console.log(`  ✓ Updated kategori #${updated.id}: ${updated.name} (${updated.slug})`);
            }
        } else {
            // Insert baru
            const { data: inserted, error: inErr } = await supabase
                .from('categories')
                .insert({
                    name: target.name,
                    slug: target.slug,
                    description: target.description,
                    sort_order: target.sort_order,
                    is_active: true
                })
                .select('id, name, slug')
                .single();

            if (inErr) {
                console.error(`Gagal insert kategori ${target.name}:`, inErr.message);
            } else {
                newCategoryMap.set(target.slug, inserted.id);
                console.log(`  + Inserted kategori #${inserted.id}: ${inserted.name} (${inserted.slug})`);
            }
        }
    }

    // Fallback slug jika ada yang tak terpetakan
    const fallbackId = newCategoryMap.get('news');

    // 3. Buat kamus mapping: old category id -> new category id
    console.log('\n[Langkah 2] Membangun peta remap (old_category_id -> new_category_id)...');
    const oldIdToNewId = new Map();

    for (const cat of currentDbCategories) {
        // Cek jika kategori ini sendiri adalah salah satu dari 30 target
        if (newCategoryMap.has(cat.slug.toLowerCase())) {
            oldIdToNewId.set(cat.id, newCategoryMap.get(cat.slug.toLowerCase()));
            continue;
        }

        const oldSlugLower = cat.slug.toLowerCase();
        const mappedSlug = OLD_TO_NEW_SLUG_MAP[oldSlugLower];

        if (mappedSlug && newCategoryMap.has(mappedSlug)) {
            oldIdToNewId.set(cat.id, newCategoryMap.get(mappedSlug));
        } else {
            // Cek berdasarkan kesamaan nama
            const oldNameLower = cat.name.toLowerCase();
            let matchedSlug = null;
            for (const [key, targetSlug] of Object.entries(OLD_TO_NEW_SLUG_MAP)) {
                if (oldNameLower.includes(key)) {
                    matchedSlug = targetSlug;
                    break;
                }
            }
            if (matchedSlug && newCategoryMap.has(matchedSlug)) {
                oldIdToNewId.set(cat.id, newCategoryMap.get(matchedSlug));
            } else {
                oldIdToNewId.set(cat.id, fallbackId);
            }
        }
    }

    // 4. Ambil seluruh artikel dan hitung remap
    console.log('\n[Langkah 3] Mengambil seluruh artikel dari database...');
    const { data: articles, error: artErr } = await supabase
        .from('articles')
        .select('id, title, category_id');

    if (artErr) throw artErr;
    console.log(`Ditemukan total ${articles.length} artikel.`);

    // 5. Update category_id artikel secara batch
    console.log('\n[Langkah 4] Melakukan remap category_id pada seluruh artikel...');
    let updatedCount = 0;
    let alreadyCorrect = 0;
    let errors = 0;

    // Kelompokkan artikel berdasarkan new_category_id untuk bulk update cepat
    const groups = new Map(); // targetCatId -> [articleId]
    for (const art of articles) {
        const targetCatId = oldIdToNewId.get(art.category_id) || fallbackId;
        if (art.category_id === targetCatId) {
            alreadyCorrect++;
        } else {
            if (!groups.has(targetCatId)) groups.set(targetCatId, []);
            groups.get(targetCatId).push(art.id);
        }
    }

    for (const [targetCatId, artIds] of groups.entries()) {
        // Pecah jadi chunks 100 id
        for (let i = 0; i < artIds.length; i += 100) {
            const chunk = artIds.slice(i, i + 100);
            const { error: upErr } = await supabase
                .from('articles')
                .update({ category_id: targetCatId })
                .in('id', chunk);

            if (upErr) {
                console.error(`Error update batch target ${targetCatId}:`, upErr.message);
                errors += chunk.length;
            } else {
                updatedCount += chunk.length;
            }
        }
    }

    console.log(`\nRemap Selesai:`);
    console.log(`- Sudah sesuai sebelumnya: ${alreadyCorrect}`);
    console.log(`- Berhasil di-remap: ${updatedCount}`);
    console.log(`- Gagal: ${errors}`);

    // 6. Non-aktifkan kategori-kategori lama yang tidak masuk 30 target
    console.log('\n[Langkah 5] Membersihkan status kategori lama (set is_active = false)...');
    const validTargetIds = Array.from(newCategoryMap.values());
    const { error: deactErr } = await supabase
        .from('categories')
        .update({ is_active: false })
        .not('id', 'in', `(${validTargetIds.join(',')})`);

    if (deactErr) {
        console.error('Gagal menonaktifkan kategori lama:', deactErr.message);
    } else {
        console.log('  ✓ Kategori lama dinonaktifkan (is_active = false). Hanya 30 kategori resmi yang aktif!');
    }

    // 7. Verifikasi distribusi artikel di 30 kategori baru
    console.log('\n=== VERIFIKASI DISTRIBUSI ARTIKEL DI 30 KATEGORI BARU ===');
    const { data: postArts } = await supabase.from('articles').select('category_id');
    const postCounts = {};
    postArts.forEach(a => { postCounts[a.category_id] = (postCounts[a.category_id] || 0) + 1; });

    const { data: finalActiveCats } = await supabase
        .from('categories')
        .select('id, name, slug, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    console.log(`\nTotal Kategori Aktif: ${finalActiveCats.length}`);
    finalActiveCats.forEach(c => {
        const total = postCounts[c.id] || 0;
        console.log(`${String(c.sort_order).padStart(2, ' ')}. [${c.slug.padEnd(16, ' ')}] ${c.name.padEnd(22, ' ')} : ${total} artikel`);
    });

    const uncategorizedArts = postArts.filter(a => !validTargetIds.includes(a.category_id));
    console.log(`\nArtikel di luar 30 kategori resmi: ${uncategorizedArts.length}`);
}

runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
