export type IssueSeverity = "blocker" | "warning" | "suggestion";
export type IssueCategory = "language" | "structure" | "journalism" | "seo";
export type EditorialIssue = { id: string; severity: IssueSeverity; category: IssueCategory; field: "title" | "excerpt" | "content" | "seo"; message: string; suggestion?: string };
export type EditorialInput = { title: string; excerpt: string; content: string; focusKeyword?: string; seoTitle?: string; metaDescription?: string; authorName?: string; featuredAlt?: string };
export type EditorialScan = { score: number; scores: Record<IssueCategory, number>; issues: EditorialIssue[]; passed: boolean; ruleVersion: string; stats: { words: number; paragraphs: number; sentences: number; averageSentenceWords: number } };
const RULE_VERSION = "2026.1";
const NON_STANDARD: Record<string, string> = { "aktifitas": "aktivitas", "analisa": "analisis", "antri": "antre", "apotik": "apotek", "ijin": "izin", "jadual": "jadwal", "karir": "karier", "komplit": "komplet", "kwalitas": "kualitas", "resiko": "risiko", "sekedar": "sekadar", "silahkan": "silakan", "subyek": "subjek", "obyek": "objek", "praktek": "praktik", "jaman": "zaman", "merubah": "mengubah", "mempengaruhi": "memengaruhi", "himbau": "imbau", "hutang": "utang" };
const CLICKBAIT = [/bikin geger/i, /tak disangka/i, /nomor \d+ bikin/i, /anda tidak akan percaya/i, /viral banget/i, /auto (kaya|cuan)/i];
const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const words = (value: string) => strip(value).match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) ?? [];
const paragraphs = (content: string) => /<p[\s>]/i.test(content) ? (content.match(/<p[\s\S]*?<\/p>/gi) ?? []) : content.split(/\n\s*\n|\r?\n/).filter(line => line.trim());
function issue(issues: EditorialIssue[], id: string, severity: IssueSeverity, category: IssueCategory, field: EditorialIssue["field"], message: string, suggestion?: string) { issues.push({ id, severity, category, field, message, suggestion }); }
export function scanEditorial(input: EditorialInput): EditorialScan {
    const issues: EditorialIssue[] = []; const body = strip(input.content); const bodyWords = words(body); const paras = paragraphs(input.content); const sentences = body.split(/(?<=[.!?])\s+/).filter(Boolean); const avg = sentences.length ? bodyWords.length / sentences.length : bodyWords.length;
    if (!input.title.trim()) issue(issues, "title-required", "blocker", "structure", "title", "Judul wajib diisi.");
    if (input.title.length > 70) issue(issues, "title-long", "warning", "seo", "title", "Judul lebih dari 70 karakter.", "Ringkas tanpa menghilangkan fakta utama.");
    if (input.title.length < 25) issue(issues, "title-short", "suggestion", "seo", "title", "Judul terlalu pendek untuk memberi konteks kuat.");
    if (CLICKBAIT.some(rule => rule.test(input.title))) issue(issues, "clickbait", "warning", "journalism", "title", "Judul terindikasi clickbait atau sensasional.", "Gunakan klaim faktual yang didukung isi.");
    if (bodyWords.length < 150) issue(issues, "thin-content", "warning", "journalism", "content", "Artikel kurang dari 150 kata; konteks mungkin belum memadai.");
    if (paras.length < 2 && bodyWords.length > 80) issue(issues, "paragraphs", "blocker", "structure", "content", "Isi masih berupa blok panjang tanpa paragraf.", "Gunakan Fix Aman untuk membentuk paragraf.");
    if (paras.some(p => words(p).length > 120)) issue(issues, "long-paragraph", "warning", "structure", "content", "Ada paragraf lebih dari 120 kata.", "Pisahkan berdasarkan satu gagasan utama per paragraf.");
    if (avg > 25) issue(issues, "long-sentences", "warning", "language", "content", `Rata-rata kalimat ${Math.round(avg)} kata; keterbacaan rendah.`);
    if (!input.excerpt || input.excerpt.length < 60) issue(issues, "excerpt", "warning", "structure", "excerpt", "Ringkasan sebaiknya minimal 60 karakter dan memuat inti berita.");
    if (input.excerpt.length > 180) issue(issues, "excerpt-long", "suggestion", "seo", "excerpt", "Ringkasan lebih dari 180 karakter.");
    for (const [wrong, right] of Object.entries(NON_STANDARD)) { if (new RegExp(`\\b${wrong}\\b`, `i`).test(body + " " + input.title)) issue(issues, `typo-${wrong}`, "warning", "language", "content", `Kata tidak baku “${wrong}”.`, `Gunakan “${right}”.`) }
    if (/!{2,}|\?{2,}|\.{4,}/.test(body + input.title)) issue(issues, "punctuation", "warning", "language", "content", "Tanda baca berulang ditemukan.");
    const hasAttribution = /\b(kata|ujar|menurut|jelas|ungkap|tutur|sebut|dikutip|berdasarkan)\b/i.test(body);
    if (/[“”"]/.test(body) && !hasAttribution) issue(issues, "quote-source", "blocker", "journalism", "content", "Kutipan ditemukan tanpa atribusi sumber yang jelas.");
    if (!/\b(menurut|berdasarkan|data|laporan|kata|ujar|dikonfirmasi|sumber)\b/i.test(body)) issue(issues, "source-signal", "warning", "journalism", "content", "Sinyal sumber atau verifikasi tidak ditemukan.");
    if (/\b(diduga|tersangka|terdakwa|pelaku)\b/i.test(body) && !/\b(diduga|praduga tak bersalah|menurut polisi|kepolisian|pengadilan)\b/i.test(body)) issue(issues, "presumption", "blocker", "journalism", "content", "Risiko pelanggaran praduga tak bersalah.");
    if (!input.authorName) issue(issues, "byline", "blocker", "journalism", "content", "Byline penulis wajib untuk transparansi Google News.");
    if (!input.featuredAlt) issue(issues, "alt", "warning", "seo", "seo", "Alt text gambar utama belum tersedia.");
    if (!input.metaDescription || input.metaDescription.length < 120 || input.metaDescription.length > 170) issue(issues, "meta", "warning", "seo", "seo", "Meta description ideal 120–170 karakter dan harus akurat.");
    if (input.focusKeyword) { const key = input.focusKeyword.toLowerCase(); const combined = (input.title + " " + input.excerpt + " " + body).toLowerCase(); if (!combined.includes(key)) issue(issues, "keyword-missing", "warning", "seo", "seo", "Focus keyword tidak ditemukan secara natural dalam artikel."); }
    const weights: Record<IssueCategory, number> = { language: 25, structure: 20, journalism: 30, seo: 25 }; const scores = { ...weights };
    for (const i of issues) { const penalty = i.severity === "blocker" ? 10 : i.severity === "warning" ? 5 : 2; scores[i.category] = Math.max(0, scores[i.category] - penalty) }
    const score = Object.values(scores).reduce((sum, value) => sum + value, 0);
    return { score, scores, issues, passed: !issues.some(i => i.severity === "blocker") && score >= 75, ruleVersion: RULE_VERSION, stats: { words: bodyWords.length, paragraphs: paras.length, sentences: sentences.length, averageSentenceWords: Math.round(avg) } };
}
export function safeFixText(value: string) { let out = value.normalize("NFC").replace(/[ \t]+/g, " ").replace(/ *([,.;:!?]) */g, "$1 ").replace(/([!?])\1+/g, "$1").replace(/\.{4,}/g, "…"); for (const [wrong, right] of Object.entries(NON_STANDARD)) out = out.replace(new RegExp(`\\b${wrong}\\b`, "gi"), right); return out.replace(/ +\n/g, "\n").trim(); }
export function normalizeArticleParagraphs(content: string) { if (/<(p|h[1-6]|ul|ol|blockquote|figure)[\s>]/i.test(content)) return content; const clean = safeFixText(content); const existing = clean.split(/\n\s*\n|\r?\n/).map(v => v.trim()).filter(Boolean); if (existing.length > 1) return existing.map(p => `<p>${p}</p>`).join("\n"); const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean); const groups: string[] = []; for (let i = 0; i < sentences.length; i += 3)groups.push(sentences.slice(i, i + 3).join(" ")); return groups.map(p => `<p>${p}</p>`).join("\n"); }
