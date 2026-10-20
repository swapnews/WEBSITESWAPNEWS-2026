export function chunkSpeechText(text: string, maxLength = 140): string[] {
    if (!Number.isInteger(maxLength) || maxLength < 2) throw new Error("Invalid speech chunk size");
    let remaining = text.replace(/\s+/g, " ").trim();
    const chunks: string[] = [];
    while (remaining) {
        if (remaining.length <= maxLength) { chunks.push(remaining); break; }
        const window = remaining.slice(0, maxLength + 1);
        const punctuation = [...window.matchAll(/[.!?…;,:](?:\s|$)/g)].map(match => match.index! + 1).filter(index => index >= maxLength * .35);
        let cut = punctuation.at(-1) ?? window.lastIndexOf(" ");
        if (cut < 1) cut = maxLength;
        // Do not split UTF-16 surrogate pairs inside an unusually long token.
        if (/[\uD800-\uDBFF]/.test(remaining[cut - 1])) cut--;
        chunks.push(remaining.slice(0, cut).trim());
        remaining = remaining.slice(cut).trimStart();
    }
    return chunks;
}

export function extractArticleSpeechText(element: HTMLElement | null, fallback = "") {
    if (!element) return fallback;
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("script,style,aside,button,nav,iframe,svg,noscript,audio,video,[hidden],[aria-hidden='true'],.ad-slot,.managed-ad,.article-inline-read,.article-inline-product").forEach(node => node.remove());
    clone.querySelectorAll("table").forEach(table => {
        const lines = Array.from(table.querySelectorAll("tr")).map(row => Array.from(row.querySelectorAll("th,td")).map(cell => cell.textContent?.trim() || "").filter(Boolean).join(", "));
        table.replaceWith(document.createTextNode(` ${lines.filter(Boolean).join(". ")}. `));
    });
    clone.querySelectorAll("br").forEach(node => node.replaceWith(document.createTextNode(" ")));
    // Detached innerText/textContent otherwise concatenates adjacent paragraphs.
    clone.querySelectorAll("p,div,section,article,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption").forEach(node => {
        node.prepend(document.createTextNode(" "));
        node.append(document.createTextNode(" "));
    });
    return (clone.textContent || "").replace(/\s+/g, " ").trim() || fallback;
}
