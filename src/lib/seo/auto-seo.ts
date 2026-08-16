/**
 * Auto-SEO Engine — deterministik, offline, gratis.
 * Mengikuti standar SKILL.md Lapis 4 (SEO Berita 2026):
 * - Title 50-60 karakter
 * - Description 130-160 karakter
 * - Focus keyword natural, bukan keyword stuffing
 * - Tags dari frasa kunci konten
 * - Slug dari judul, lowercase, strip diakritik
 * - Tidak mengarang fakta: semua output berasal dari judul/konten nyata
 */

const STOPWORDS_ID = new Set([
    "yang", "dan", "di", "ke", "dari", "ini", "itu", "dengan", "untuk", "pada",
    "adalah", "akan", "juga", "tidak", "sudah", "belum", "saat", "karena", "agar",
    "atau", "namun", "tetapi", "sebagai", "oleh", "para", "dalam", "secara", "serta",
    "bisa", "dapat", "harus", "lebih", "sangat", "paling", "antara", "setelah",
    "sebelum", "hingga", "sampai", "menjadi", "terjadi", "melalui", "terhadap",
    "tentang", "seperti", "sekitar", "setiap", "banyak", "beberapa", "mereka",
    "kami", "kita", "kamu", "anda", "saya", "dia", "ini", "itu", "tersebut",
    "ada", "adanya", "merupakan", "berada", "membuat", "melakukan", "memberikan",
    "menunjukkan", "menyatakan", "mengatakan", "menjelaskan", "menambahkan",
    "menilai", "mengungkapkan", "menyebutkan", "menekankan", "menegaskan",
    "mengajak", "mendorong", "mengharapkan", "berharap", "diharapkan", "dapat",
    "masih", "selalu", "kembali", "terus", "mulai", "akhirnya", "kemudian",
    "sehingga", "sementara", "namun", "walaupun", "meskipun", "karena", "sebab",
    "akibat", "dampak", "proses", "kegiatan", "program", "kondisi", "keadaan",
    "situasi", "berbagai", "seluruh", "semua", "sebagian", "besar", "kecil",
    "tinggi", "rendah", "baru", "lama", "baik", "buruk", "penting", "utama",
    "tahun", "bulan", "hari", "minggu", "jam", "menit", "detik", "waktu",
    "tempat", "lokasi", "daerah", "wilayah", "kota", "kabupaten", "provinsi",
    "indonesia", "jakarta", "bali", "serta", "beserta", "bersama", "dengan",
    "melalui", "berdasarkan", "menurut", "menurutnya", "katanya", "ujarnya",
    "tambahnya", "lanjutnya", "sebelumnya", "selanjutnya", "berikutnya",
    "tersebut", "tersebutlah", "inilah", "itulah", "adalah", "ialah", "yakni",
    "yaitu", "misalnya", "contohnya", "seperti", "antara", "lain", "lainnya",
    "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan",
    "sepuluh", "ratus", "ribu", "juta", "miliar", "triliun", "persen", "angka",
    "nomor", "jumlah", "total", "sekitar", "kurang", "lebih", "hampir", "hanya",
    "justru", "bahkan", "justru", "ternyata", "nyatanya", "sebenarnya",
]);

const PREFIXES = ["me", "men", "mem", "menge", "ber", "be", "di", "ke", "ter", "pe", "pen", "pem", "se"];
const SUFFIXES = ["kan", "nya", "an", "i", "lah", "kah", "tah"];

/** Stemming ringan Bahasa Indonesia (awalan/akhiran umum) */
function stem(word: string): string {
    let result = word;
    for (const suffix of SUFFIXES) {
        if (result.length > 4 && result.endsWith(suffix)) {
            result = result.slice(0, -suffix.length);
            break;
        }
    }
    for (const prefix of PREFIXES) {
        if (result.length > 4 && result.startsWith(prefix)) {
            result = result.slice(prefix.length);
            break;
        }
    }
    return result;
}

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/<[^>]+>/g, " ")
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/[\s-]+/)
        .filter((word) => word.length > 2 && !STOPWORDS_ID.has(word));
}

function stripHtml(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}

function sentences(text: string): string[] {
    return text
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 20);
}

/** Ekstrak frasa 2-4 kata paling sering (TF-IDF sederhana) */
function extractKeyPhrases(title: string, content: string, limit = 5): string[] {
    const titleTokens = tokenize(title);
    const contentTokens = tokenize(content);
    const allTokens = [...titleTokens, ...contentTokens];

    const freq = new Map<string, number>();
    for (const token of allTokens) {
        freq.set(token, (freq.get(token) ?? 0) + 1);
    }

    // Frasa: gabungkan token berurutan yang muncul bersama
    const phrases = new Map<string, number>();
    const addPhrase = (tokens: string[]) => {
        for (let size = 4; size >= 2; size--) {
            for (let i = 0; i <= tokens.length - size; i++) {
                const phrase = tokens.slice(i, i + size).join(" ");
                if (phrase.length <= 40) {
                    phrases.set(phrase, (phrases.get(phrase) ?? 0) + 1);
                }
            }
        }
    };
    addPhrase(titleTokens);
    addPhrase(contentTokens);

    // Skor: frekuensi × panjang frasa, bobot judul lebih tinggi
    const scored = [...phrases.entries()]
        .map(([phrase, count]) => {
            const inTitle = titleTokens.join(" ").includes(phrase) ? 2 : 1;
            return { phrase, score: count * phrase.split(" ").length * inTitle };
        })
        .sort((a, b) => b.score - a.score);

    const result: string[] = [];
    for (const { phrase } of scored) {
        if (result.length >= limit) break;
        if (!result.some((existing) => existing.includes(phrase) || phrase.includes(existing))) {
            result.push(phrase);
        }
    }
    return result;
}

function cleanTitle(title: string): string {
    return title
        .replace(/\s+/g, " ")
        .replace(/["']/g, "")
        .trim();
}

function buildSeoTitle(title: string, focusKeyword?: string): string {
    const clean = cleanTitle(title);
    if (clean.length <= 60) return clean;
    // Pangkas di batas kata terakhir sebelum 60
    const cut = clean.slice(0, 57);
    const lastSpace = cut.lastIndexOf(" ");
    return `${cut.slice(0, lastSpace > 30 ? lastSpace : 57).trim()}…`;
}

function buildMetaDescription(content: string, excerpt: string, focusKeyword?: string): string {
    const plain = stripHtml(content);
    const firstSentences = sentences(plain).slice(0, 2).join(" ");
    const candidate = firstSentences || excerpt || plain.slice(0, 200);
    const clean = candidate.replace(/\s+/g, " ").trim();
    if (clean.length <= 160) return clean;
    const cut = clean.slice(0, 157);
    const lastSpace = cut.lastIndexOf(" ");
    return `${cut.slice(0, lastSpace > 80 ? lastSpace : 157).trim()}…`;
}

function buildExcerpt(content: string, fallback = ""): string {
    const plain = stripHtml(content);
    const firstSentence = sentences(plain)[0] || plain.slice(0, 200);
    const clean = firstSentence.replace(/\s+/g, " ").trim();
    if (clean.length <= 160) return clean;
    const cut = clean.slice(0, 157);
    const lastSpace = cut.lastIndexOf(" ");
    return `${cut.slice(0, lastSpace > 80 ? lastSpace : 157).trim()}…`;
}

function buildTags(phrases: string[], title: string): string[] {
    const tags = new Set<string>();
    for (const phrase of phrases.slice(0, 4)) {
        tags.add(phrase);
    }
    // Tambah token tunggal penting dari judul
    const titleTokens = tokenize(title).filter((t) => t.length > 3);
    for (const token of titleTokens.slice(0, 2)) {
        if (tags.size >= 6) break;
        tags.add(token);
    }
    return [...tags].slice(0, 6);
}

function buildSlug(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 90);
}

export type AutoSeoResult = {
    focusKeyword: string;
    seoTitle: string;
    metaDescription: string;
    tags: string;
    excerpt: string;
    slug: string;
};

export function generateAutoSeo(input: {
    title: string;
    content: string;
    excerpt?: string;
    categoryName?: string;
}): AutoSeoResult {
    const title = cleanTitle(input.title);
    const content = input.content || "";
    const phrases = extractKeyPhrases(title, content, 5);
    const focusKeyword = phrases[0] ?? title.split(" ").slice(0, 3).join(" ");

    const seoTitle = buildSeoTitle(title, focusKeyword);
    const metaDescription = buildMetaDescription(content, input.excerpt ?? "", focusKeyword);
    const excerpt = buildExcerpt(content, input.excerpt ?? "");
    const tags = buildTags(phrases, title).join(", ");
    const slug = buildSlug(title);

    return { focusKeyword, seoTitle, metaDescription, tags, excerpt, slug };
}
