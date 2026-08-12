import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import ContributorForm from "./contributor-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kirim Berita — SwapNews" };

export default async function KirimBeritaPage() {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/panelswap");

    const isWartawan = profile.role === "wartawan" || profile.role === "admin" || profile.role === "super_admin";
    const canSubmit = profile.is_member || isWartawan;

    return (
        <main className="member-page">
            <header className="member-head">
                <span>KONTRIBUTOR / WARTAWAN</span>
                <h1>Kirim berita</h1>
                <p>Berita masuk antrean review redaksi. Batas 20 artikel/hari. Disetujui Admin = 5-10 poin.</p>
            </header>
            {canSubmit ? <ContributorForm /> : (
                <section className="member-cta">
                    <h2>Akses Ditutup</h2>
                    <p>Aktifkan membership atau daftar sebagai Wartawan resmi untuk mengirim berita.</p>
                    <Link href="/membership">Lihat membership</Link> · <Link href="/panelswap?mode=register_wartawan">Daftar Wartawan</Link>
                </section>
            )}
        </main>
    );
}
