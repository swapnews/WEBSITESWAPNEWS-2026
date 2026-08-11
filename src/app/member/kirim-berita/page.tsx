import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getCurrentProfile } from "@/lib/auth/get-profile";
import ContributorForm from "./contributor-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kirim Berita — SwapNews" };

export default async function KirimBeritaPage() {
    const profile = await getCurrentProfile();
    if (!profile) redirect("/login");

    return (
        <main className="member-page">
            <header className="member-head">
                <span>KONTRIBUTOR</span>
                <h1>Kirim berita</h1>
                <p>Berita masuk antrean review redaksi. Artikel disetujui = 2 poin (maks 10/hari).</p>
            </header>
            {profile.is_member ? <ContributorForm /> : (
                <section className="member-cta">
                    <h2>Membership diperlukan</h2>
                    <p>Aktifkan membership Rp99.900/tahun untuk mengirim berita sebagai kontributor.</p>
                    <Link href="/membership">Aktifkan membership</Link>
                </section>
            )}
        </main>
    );
}
