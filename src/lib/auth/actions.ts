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
        redirect("/login?error=Email%20dan%20password%20wajib%20diisi");
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/", "layout");
    redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
    const email = getString(formData, "email");
    const password = getString(formData, "password");
    const fullName = getString(formData, "full_name");

    if (!email || !password || !fullName) {
        redirect("/login?mode=register&error=Nama%2C%20email%2C%20dan%20password%20wajib%20diisi");
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
        redirect(`/login?mode=register&error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/", "layout");
    redirect("/login?message=Periksa%20email%20untuk%20verifikasi%20akun");
}

export async function signOutAction() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    redirect("/");
}
