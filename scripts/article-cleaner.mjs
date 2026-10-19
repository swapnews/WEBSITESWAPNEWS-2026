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

    // 2. Tangani 'rnrn' literal (bukan bagian dari kata)
    text = text.replace(/rnrn/gi, '\n\n');
    text = text.replace(/(^|[\s>.\?!;:,"'])rn([\s<.\?!;:,"']|$)/gi, '$1\n$2');

    // 3. Tangani pola 'nn' yang merupakan newline
    text = text.replace(/(<\/[a-z0-9]+>)\s*nn\s*/gi, '$1\n\n'); // </strong>nn, </em>nn, </li>nn
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

    // Tangani sisa 'n' liar di depan tag seperti n <li> atau n <ol>
    text = text.replace(/(\n|^)n\s*(<[a-z])/gi, '$1$2');

    // 4. Jika teks belum memiliki tag <p>, bungkus setiap blok baris ke dalam <p>
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
        // Jika sudah ada tag <p>, rapikan
        text = text.replace(/\n{2,}/g, '\n');
    }

    // 5. Bersihkan artefak sisa
    text = text.replace(/<p>\s*(&nbsp;|\s)*<\/p>/gi, '');
    text = text.replace(/&nbsp;{2,}/g, ' ');

    return text.trim();
}
