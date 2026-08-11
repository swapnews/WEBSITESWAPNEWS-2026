import Image from "next/image";
import Link from "next/link";

import { signInAction, signUpAction } from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Masuk",
    description: "Masuk ke dashboard redaksi SwapNews.",
};

type LoginPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const params = await searchParams;

    const mode = getParam(params, "mode") === "register" ? "register" : "login";
    const error = getParam(params, "error");
    const message = getParam(params, "message");

    return (
        <main className="auth-shell">
            <section className="auth-card clay-card">
                <Link href="/" className="auth-brand" aria-label="Kembali ke beranda SwapNews">
                    <Image src="/swapnews-logo.png" alt="SwapNews" width={180} height={44} priority />
                </Link>

                <div className="auth-copy">
                    <span className="eyebrow">Akses Redaksi</span>
                    <h1>{mode === "login" ? "Masuk ke SwapNews" : "Buat akun SwapNews"}</h1>
                    <p>
                        {mode === "login"
                            ? "Kelola artikel, review konten, dan pantau portal dari satu dashboard."
                            : "Daftar sebagai member untuk mengikuti workflow kontributor dan fitur personal."}
                    </p>
                </div>

                {error ? <div className="auth-alert error">{error}</div> : null}
                {message ? <div className="auth-alert success">{message}</div> : null}

                <form action={mode === "login" ? signInAction : signUpAction} className="auth-form">
                    {mode === "register" ? (
                        <label>
                            Nama lengkap
                            <input name="full_name" type="text" autoComplete="name" required placeholder="Nama sesuai byline" />
                        </label>
                    ) : null}

                    <label>
                        Email
                        <input name="email" type="email" autoComplete="email" required placeholder="nama@swapnews.co.id" />
                    </label>

                    <label>
                        Password
                        <input
                            name="password"
                            type="password"
                            autoComplete={mode === "login" ? "current-password" : "new-password"}
                            required
                            minLength={6}
                            placeholder="Minimal 6 karakter"
                        />
                    </label>

                    <button type="submit">{mode === "login" ? "Masuk" : "Daftar"}</button>
                </form>

                <div className="auth-switch">
                    {mode === "login" ? (
                        <span>
                            Belum punya akun? <Link href="/login?mode=register">Daftar</Link>
                        </span>
                    ) : (
                        <span>
                            Sudah punya akun? <Link href="/login">Masuk</Link>
                        </span>
                    )}
                </div>
            </section>
        </main>
    );
}
