"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string, max = 255) {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function raw(formData: FormData, key: string, max = 255) {
    const value = formData.get(key);
    return typeof value === "string" ? value.slice(0, max) : "";
}

function profileRedirect(kind: "success" | "error", message: string, section?: string): never {
    const params = new URLSearchParams({ [kind]: message });
    if (section) params.set("section", section);
    redirect(`/profile?${params.toString()}`);
}

async function authenticatedUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email) redirect("/panelswap?next=/profile");
    return { supabase, user };
}

function refreshProfileViews() {
    revalidatePath("/profile");
    revalidatePath("/member");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/wartawan/workspace");
}

export async function updateProfileAction(formData: FormData) {
    const { supabase, user } = await authenticatedUser();
    const fullName = text(formData, "full_name", 100);
    const username = text(formData, "username", 40).replace(/^@/, "");
    const whatsapp = text(formData, "whatsapp", 24);
    const instagram = text(formData, "instagram_handle", 40).replace(/^@/, "");
    const birthDate = text(formData, "birth_date", 10);
    const gender = text(formData, "gender", 20);

    if (fullName.length < 2) profileRedirect("error", "Nama lengkap minimal 2 karakter.", "profile");
    if (username && !/^[a-zA-Z0-9._-]{3,40}$/.test(username)) {
        profileRedirect("error", "Username hanya boleh berisi huruf, angka, titik, garis bawah, atau strip.", "profile");
    }
    if (whatsapp && !/^\+?[0-9\s()-]{8,24}$/.test(whatsapp)) {
        profileRedirect("error", "Nomor WhatsApp tidak valid.", "contact");
    }
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
        profileRedirect("error", "Tanggal lahir tidak valid.", "profile");
    }
    if (gender && !["pria", "wanita", "lainnya", "tidak_disebutkan"].includes(gender)) {
        profileRedirect("error", "Pilihan jenis kelamin tidak valid.", "profile");
    }

    const { error } = await supabase.from("profiles").update({
        full_name: fullName,
        username: username || null,
        whatsapp: whatsapp || null,
        instagram_handle: instagram || null,
        bio: text(formData, "bio", 500) || null,
        birth_date: birthDate || null,
        gender: gender || null,
        profession: text(formData, "profession", 80) || null,
        address: text(formData, "address", 300) || null,
        city: text(formData, "city", 80) || null,
        province: text(formData, "province", 80) || null,
        postal_code: text(formData, "postal_code", 10) || null,
        press_card_number: text(formData, "press_card_number", 80) || null,
    }).eq("id", user.id);

    if (error) profileRedirect("error", `Profil gagal disimpan: ${error.message}`, "profile");
    await supabase.auth.updateUser({ data: { full_name: fullName } });
    refreshProfileViews();
    profileRedirect("success", "Profil berhasil diperbarui.", "profile");
}

export async function updatePayoutAction(formData: FormData) {
    const { supabase, user } = await authenticatedUser();
    const payoutType = text(formData, "payout_type", 20);
    const providerName = text(formData, "provider_name", 60);
    const accountNumber = text(formData, "account_number", 50);
    const accountHolder = text(formData, "account_holder", 100);

    if (!["bank", "ewallet"].includes(payoutType)) profileRedirect("error", "Jenis pembayaran tidak valid.", "payout");
    if (providerName.length < 2 || accountNumber.length < 5 || accountHolder.length < 2) {
        profileRedirect("error", "Lengkapi penyedia, nomor rekening, dan nama pemilik.", "payout");
    }
    if (!/^[a-zA-Z0-9+ ._-]{5,50}$/.test(accountNumber)) {
        profileRedirect("error", "Nomor rekening atau e-wallet tidak valid.", "payout");
    }

    const { error } = await supabase.from("profile_payout_accounts").upsert({
        user_id: user.id,
        payout_type: payoutType,
        provider_name: providerName,
        account_number: accountNumber,
        account_holder: accountHolder,
    }, { onConflict: "user_id" });

    if (error) profileRedirect("error", `Rekening gagal disimpan: ${error.message}`, "payout");
    revalidatePath("/profile");
    profileRedirect("success", "Data pembayaran berhasil disimpan secara privat.", "payout");
}

export async function changeEmailAction(formData: FormData) {
    const { supabase, user } = await authenticatedUser();
    const currentPassword = raw(formData, "current_password", 200);
    const newEmail = text(formData, "new_email", 160).toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(newEmail)) profileRedirect("error", "Alamat email baru tidak valid.", "security");
    if (newEmail === user.email?.toLowerCase()) profileRedirect("error", "Email baru sama dengan email saat ini.", "security");
    if (!currentPassword) profileRedirect("error", "Password saat ini wajib diisi.", "security");

    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email!, password: currentPassword });
    if (authError) profileRedirect("error", "Password saat ini salah.", "security");

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { emailRedirectTo: `${siteUrl}/auth/callback?next=/profile?success=Email%20baru%20berhasil%20diverifikasi` },
    );
    if (error) profileRedirect("error", `Email gagal diubah: ${error.message}`, "security");
    profileRedirect("success", "Link verifikasi dikirim ke email baru. Email berubah setelah verifikasi.", "security");
}

export async function changePasswordAction(formData: FormData) {
    const { supabase, user } = await authenticatedUser();
    const currentPassword = raw(formData, "current_password", 200);
    const newPassword = raw(formData, "new_password", 200);
    const confirmation = raw(formData, "confirm_password", 200);

    if (!currentPassword) profileRedirect("error", "Password saat ini wajib diisi.", "security");
    if (newPassword.length < 8) profileRedirect("error", "Password baru minimal 8 karakter.", "security");
    if (newPassword !== confirmation) profileRedirect("error", "Konfirmasi password baru tidak sama.", "security");
    if (newPassword === currentPassword) profileRedirect("error", "Password baru harus berbeda.", "security");

    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email!, password: currentPassword });
    if (authError) profileRedirect("error", "Password saat ini salah.", "security");

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) profileRedirect("error", `Password gagal diubah: ${error.message}`, "security");
    profileRedirect("success", "Password berhasil diubah.", "security");
}
