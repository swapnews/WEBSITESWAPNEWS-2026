"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { House, RotateCcw } from "lucide-react";

type ErrorPageProps = {
    error: Error & { digest?: string };
    reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
    useEffect(() => {
        console.error("SwapNews route error", error);
    }, [error]);

    return (
        <main className="swapnews-error" role="alert">
            <div className="swapnews-error__ambient" aria-hidden="true" />
            <section className="swapnews-error__card">
                <Image src="/swapnews-logo-accent.png" alt="SwapNews" width={205} height={60} priority />
                <span className="swapnews-error__eyebrow">SAMBUNGAN TERGANGGU</span>
                <h1>Halaman belum berhasil dimuat.</h1>
                <p>Berita Anda tetap aman. Coba muat ulang halaman atau kembali ke beranda SwapNews.</p>
                <div className="swapnews-error__actions">
                    <button id="retry-page-button" type="button" onClick={reset}>
                        <RotateCcw size={17} /> Coba Lagi
                    </button>
                    <Link id="return-home-link" href="/">
                        <House size={17} /> Ke Beranda
                    </Link>
                </div>
                {error.digest ? <small>Kode referensi: {error.digest}</small> : null}
            </section>
        </main>
    );
}
