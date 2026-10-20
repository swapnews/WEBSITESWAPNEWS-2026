export const REVIEW_BASE_PATH = "/dashboard/wartawan/workspace";
export const REVIEW_QUEUE_FILTER = "status.eq.in_review,and(status.eq.published,independent_review_id.is.null)";
export const REVIEW_FILTERS = ["queue", "approved", "completed", "revision"] as const;
export type ReviewFilter = typeof REVIEW_FILTERS[number];
export type ReviewDecision = "published" | "revision" | "rejected";
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function reviewCursor(date: string | undefined, id: string | undefined) {
    // Keep Postgres microseconds; Date.toISOString() would lose cursor precision.
    if (!date || !id || !UUID_PATTERN.test(id)
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(date)
        || !Number.isFinite(Date.parse(date))) return undefined;
    return { date, id };
}

export function reviewFormInput(form: FormData) {
    const id = String(form.get("id") ?? "");
    const decision = String(form.get("decision") ?? "");
    const version = Number(form.get("version"));
    const note = String(form.get("note") ?? "").trim();
    if (!UUID_PATTERN.test(id) || !["published", "revision", "rejected"].includes(decision)
        || !Number.isSafeInteger(version) || version < 1 || note.length > 2000
        || (decision !== "published" && !note)) return null;
    return { id, decision: decision as ReviewDecision, version, note };
}

export function reviewErrorMessage(message: string, code?: string) {
    if (code === "PGRST202" || code === "42703" || code === "42P01") {
        return "Fitur review belum siap. Admin perlu menerapkan migrasi database 029.";
    }
    const safeMessages = [
        "Artikel berubah sejak dibuka. Muat ulang dan baca kembali",
        "Artikel sudah diproses atau belum dikirim untuk review",
        "Artikel sendiri tidak dapat direview; terbit langsung tanpa poin",
        "Kategori artikel wajib diisi", "Artikel tidak ditemukan", "Akses review ditolak",
    ];
    return safeMessages.find(text => message === text) ?? "Review gagal disimpan. Muat ulang lalu coba lagi; belum ada keputusan atau poin yang disimpan.";
}
