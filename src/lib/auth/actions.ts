"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

export async function signInAction(formData: FormData) {
    const email = getString(formData, "email");
    const password = getString(formData, "password");

    if (!email || !password) {
        redirect("/panelswap?error=Email%20dan%20password%20wajib%20diisi");
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        redirect(`/panelswap?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
    const email = getString(formData, "email");
    const password = getString(formData, "password");
    const fullName = getString(formData, "full_name");

    if (!email || !password || !fullName) {
        redirect("/panelswap?mode=register&error=Nama%2C%20email%2C%20dan%20password%20wajib%20diisi");
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
        },
    });

    if (error) {
        redirect(`/panelswap?mode=register&error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/", "layout");
    redirect("/panelswap?message=Periksa%20email%20untuk%20verifikasi%20akun");
}

export async function signUpWartawanAction(formData: FormData) {
    const email = getString(formData, "email");
    const password = getString(formData, "password");
    const fullName = getString(formData, "full_name");
    const whatsapp = getString(formData, "whatsapp");
    const ktpUrl = getString(formData, "ktp_url");
    const username = getString(formData, "username");
    const instagram = getString(formData, "instagram_handle");
    const address = getString(formData, "address");

    if (!email || !password || !fullName || !whatsapp || !ktpUrl) {
        redirect("/panelswap?mode=register_wartawan&error=Nama%20Lengkap%2C%20Email%2C%20Password%2C%20Nomor%20WhatsApp%2C%20dan%20Foto%20KTP%20wajib%20diisi");
    }

    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                whatsapp,
                ktp_url: ktpUrl,
                username,
                instagram_handle: instagram,
                address,
                wartawan_status: "pending",
            },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
        },
    });

    if (error) {
        redirect(`/panelswap?mode=register_wartawan&error=${encodeURIComponent(error.message)}`);
    }

    if (authData.user) {
        await supabase.from("profiles").update({
            full_name: fullName,
            whatsapp,
            ktp_url: ktpUrl,
            username: username || null,
            instagram_handle: instagram || null,
            address: address || null,
            wartawan_status: "pending",
        }).eq("id", authData.user.id);
    }

    revalidatePath("/", "layout");
    redirect("/panelswap?message=Pendaftaran%20Wartawan%20berhasil.%20Akun%20Anda%20sedang%20dalam%20proses%20verifikasi%20Admin%20Redaksi.");
}

export async function signOutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    redirect("/");
}
