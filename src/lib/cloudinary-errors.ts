export function cloudinaryUploadError(error: unknown) {
    const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
    const status = typeof value.http_code === "number" ? value.http_code : 0;
    const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
    const networkCode = typeof value.code === "string" ? value.code : "";
    // Classify internally. Never return provider text: it may contain signatures or credentials.
    if (status === 401 || /invalid (api[_ ]?key|signature)|unknown api[_ ]?key|cloud.?name|api.?secret/.test(message)) {
        return { code: "PHOTO_CLOUD_AUTH", status: 503, message: "Konfigurasi penyimpanan foto ditolak. Admin perlu memeriksa kredensial Cloudinary." };
    }
    if (status === 429 || /quota|credit|limit exceeded|rate limit/.test(message)) {
        return { code: "PHOTO_CLOUD_LIMIT", status: 503, message: "Batas layanan penyimpanan foto tercapai. Coba lagi nanti atau hubungi admin." };
    }
    if (status === 403) {
        return { code: "PHOTO_CLOUD_FORBIDDEN", status: 503, message: "Cloudinary menolak izin unggah. Admin perlu memeriksa status akun dan izin penyimpanan." };
    }
    if (status === 408 || status === 499 || /timeout|timed out/.test(message) || ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN"].includes(networkCode)) {
        return { code: "PHOTO_CLOUD_CONNECTION", status: 504, message: "Koneksi penyimpanan foto terputus atau terlalu lama. Coba unggah kembali." };
    }
    if (status === 400) {
        return { code: "PHOTO_CLOUD_REJECTED", status: 502, message: "Foto atau pengaturan pemrosesan ditolak Cloudinary. Pilih foto lain; hubungi admin jika berulang." };
    }
    return { code: "PHOTO_CLOUD_UNAVAILABLE", status: 502, message: "Penyimpanan foto belum dapat dihubungi. Coba lagi atau hubungi admin jika berulang." };
}
