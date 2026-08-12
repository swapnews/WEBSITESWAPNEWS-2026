import Image from "next/image";
import Link from "next/link";

import { signInAction, signUpAction, signUpWartawanAction } from "@/lib/auth/actions";
import { PanelswapForm } from "./panelswap-form";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "PanelSwap — Akses Redaksi & Portal",
    description: "Masuk dan pendaftaran redaksi/wartawan SwapNews.",
};

type PanelswapPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
}

export default async function PanelswapPage({ searchParams }: PanelswapPageProps) {
    const params = await searchParams;

    const mode = getParam(params, "mode") || "login";
    const error = getParam(params, "error");
    const message = getParam(params, "message");

    return (
        <main className="auth-shell">
            <section className="auth-card clay-card">
                <Link href="/" className="auth-brand" aria-label="Kembali ke beranda SwapNews">
                    <Image src="/swapnews-logo.png" alt="SwapNews" width={180} height={44} priority />
                </Link>

                <div className="auth-copy">
                    <span className="eyebrow">Akses PanelSwap</span>
                    <h1>
                        {mode === "login"
                            ? "Masuk ke SwapNews"
                            : mode === "register_wartawan"
                                ? "Pendaftaran Wartawan / Penulis"
                                : "Buat Akun Member"}
                    </h1>
                    <p>
                        {mode === "login"
                            ? "Kelola artikel, review konten, dan pantau portal dari satu dashboard."
                            : mode === "register_wartawan"
                                ? "Isi data lengkap sesuai KTP untuk mendaftar sebagai Wartawan resmi SwapNews."
                                : "Daftar sebagai member untuk mengikuti workflow kontributor dan fitur personal."}
                    </p>
                </div>

                {error ? <div className="auth-alert error">{error}</div> : null}
                {message ? <div className="auth-alert success">{message}</div> : null}

                <PanelswapForm mode={mode} signInAction={signInAction} signUpAction={signUpAction} signUpWartawanAction={signUpWartawanAction} />
            </section>
        </main>
    );
}
