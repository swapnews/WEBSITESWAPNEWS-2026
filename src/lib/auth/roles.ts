export type AppRole = "super_admin" | "admin" | "wartawan" | "visitor";

export const ROLE_LABELS: Record<AppRole, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    wartawan: "Wartawan",
    visitor: "Pengunjung",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
    super_admin: "Akses penuh termasuk kredensial, role, dan push notification manual.",
    admin: "Mengelola review konten, kategori, komentar, dan operasional redaksi.",
    wartawan: "Menerbitkan langsung dan mengedit seluruh artikel redaksi tanpa hak hapus atau transfer penulis.",
    visitor: "Membaca berita publik dan mengakses fitur member setelah login.",
};

export function isEditorialRole(role: AppRole) {
    return role === "super_admin" || role === "admin" || role === "wartawan";
}

export function isAdminRole(role: AppRole) {
    return role === "super_admin" || role === "admin";
}
