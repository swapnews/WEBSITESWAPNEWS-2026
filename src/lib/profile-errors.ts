type ProfileError = { code?: string; message?: string } | null;

export function profileSaveError(error: ProfileError) {
    if (error?.code === "42P17" || error?.message?.includes("infinite recursion")) {
        return "Profil belum tersimpan. Admin perlu memperbarui izin profil (kode PROFILE_RLS_RECURSION).";
    }
    if (error?.code === "23505") return "Username sudah digunakan. Pilih username lain.";
    if (error?.code === "42501") return "Izin menyimpan profil ditolak. Hubungi admin (kode PROFILE_FORBIDDEN).";
    return "Profil belum tersimpan. Muat ulang halaman lalu coba lagi; hubungi admin jika berulang.";
}
