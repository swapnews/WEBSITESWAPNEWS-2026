/**
 * Fungsi normalisasi konten artikel dari dump WordPress ke HTML berparagraf rapi.
 */
export function normalizeArticleContent(raw) {
    if (!raw) return '';

    let text = raw;

    // 1. Ganti escape string MySQL literal
    text = text.replace(/\\r\\n/g, '\n');
    text = text.replace(/\\n/g, '\n');
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\r/g, '\n');

    // 2. Tangani 'rnrn' dan 'rn' di sekitar tag atau tanda baca
    text = text.replace(/rnrn/gi, '\n\n');
    text = text.replace(/rn(?=<)/gi, '\n');
    text = text.replace(/(>)\s*rn/gi, '$1\n');
    text = text.replace(/(^|[\s>.\?!;:,"'])rn([\s<.\?!;:,"']|$)/gi, '$1\n$2');

    // 3. Tangani pola 'nn' yang merupakan newline
    text = text.replace(/(<\/[a-z0-9]+>)\s*nn\s*/gi, '$1\n\n');
    text = text.replace(/(\.|\?|!|”|"|'|\))\s*nn\s*([A-Z0-9<“"'])/g, '$1\n\n$2');
    text = text.replace(/([a-z0-9])\s*\.nn\s*([A-Z0-9])/g, '$1.\n\n$2');
    text = text.replace(/:\s*nn\s*/gi, ':\n\n');
    text = text.replace(/([a-z0-9\)])\s*nn\s*(<[a-z])/gi, '$1\n\n$2');
    text = text.replace(/(>[a-z0-9\s]+)\s*nn\s*\(/gi, '$1\n\n(');
    text = text.replace(/<br\s*\/?>\s*nn/gi, '\n\n');
    text = text.replace(/nn&nbsp;nn/gi, '\n\n');
    text = text.replace(/nn&nbsp;/gi, '\n\n');
    text = text.replace(/&nbsp;nn/gi, '\n\n');
    text = text.replace(/>\s*nn\s*</gi, '><');
    text = text.replace(/(^|\n|\s)nn\s*([A-Z0-9<“"'])/g, '$1\n\n$2');
    text = text.replace(/\s*nn(\s*<\/p>|\s*$)/gi, '$1');
    text = text.replace(/^nn\s*/gi, '');
    text = text.replace(/\s*nn$/gi, '');

    // 4. Tangani huruf 'n' tunggal liar di antara atau di sekitar seluruh tag HTML:
    text = text.replace(/>\s*n\s*</gi, '><');
    text = text.replace(/(<[a-z0-9]+\b[^>]*>)\s*n\s*/gi, '$1\n');
    text = text.replace(/\s*n\s*(<\/[a-z0-9]+>)/gi, '\n$1');
    text = text.replace(/(<\/[a-z0-9]+>)\s*n\s*(<[a-z0-9]+)/gi, '$1\n$2');
    text = text.replace(/(<\/[a-z0-9]+>)\s*n(\s|$)/gi, '$1\n$2');

    // 5. Jika teks belum memiliki tag <p>, bungkus setiap blok baris ke dalam <p>
    const hasParagraphTags = /<\/?(p|div|section|article)\b/i.test(text);

    if (!hasParagraphTags) {
        const blocks = text
            .split(/\n{2,}/)
            .map(b => b.trim())
            .filter(b => b.length > 0);

        text = blocks
            .map(b => {
                if (/^<(h[1-6]|ul|ol|blockquote|figure|table|img|hr)\b/i.test(b)) {
                    return b;
                }
                return `<p>${b.replace(/\n/g, '<br />')}</p>`;
            })
            .join('\n');
    } else {
        text = text.replace(/\n{2,}/g, '\n');
    }

    // 6. Bersihkan artefak sisa
    text = text.replace(/<p>\s*(&nbsp;|\s)*<\/p>/gi, '');
    text = text.replace(/&nbsp;{2,}/g, ' ');

    return text.trim();
}
