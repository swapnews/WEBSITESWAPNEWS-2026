export type ArticleInsertionSettings = {
    read_also_enabled: boolean;
    read_also_paragraph: number;
    read_also_label: string;
    product_enabled: boolean;
    product_paragraph: number;
    product_id: string | null;
    ad_enabled: boolean;
    ad_paragraph: number;
    ad_html: string;
    copy_message: string;
};

export const DEFAULT_INSERTION_SETTINGS: ArticleInsertionSettings = {
    read_also_enabled: true, read_also_paragraph: 2, read_also_label: "BACA JUGA",
    product_enabled: true, product_paragraph: 3, product_id: null,
    ad_enabled: true, ad_paragraph: 4, ad_html: "",
    copy_message: "Harap sertakan Source atau sumber saat mengutip atau menyalin berita dari SwapNews.",
};

export function sanitizeAdHtml(input: string) {
    return input
        .replace(/<\/?(?:script|style|object|embed|form|input|button|textarea|select|meta|link)[^>]*>/gi, "")
        .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/(?:javascript|data):/gi, "")
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
}
