"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Camera, Mail, MapPin, PlayCircle } from "lucide-react";

const company = [["About Us", "/page/about-us"], ["Karir", "/page/karir"], ["Pasang Iklan", "/page/pasang-iklan"], ["Bantuan", "/page/bantuan"]];
const policies = [["Kebijakan Privasi", "/page/kebijakan-privasi"], ["Syarat & Ketentuan", "/page/syarat-dan-ketentuan"], ["Pedoman Siber", "/page/pedoman-siber"], ["Panduan Komunitas", "/page/panduan-komunitas"], ["Disclaimer", "/page/disclaimer"]];
const discovery = [["Beranda", "/"], ["Trending", "/?feed=trending"], ["Berita Video", "/?feed=video"]];

export function SiteFooter() {
    const pathname = usePathname();
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/panelswap") || pathname.startsWith("/login")) return null;
    return <footer className="site-footer">
        <div className="footer-orbit" aria-hidden="true" />
        <div className="footer-shell">
            <section className="footer-brand"><Link href="/" aria-label="SwapNews Beranda"><Image src="/swapnews-logo.png" alt="SwapNews" width={142} height={52} /></Link><p>Bukan berita biasa. Perspektif lokal, percakapan bermakna, dan jurnalisme yang dekat dengan hidup Anda.</p><div><a href="mailto:redaksi@swapnews.co.id"><Mail /> redaksi@swapnews.co.id</a><span><MapPin /> Indonesia</span></div></section>
            <nav className="footer-links" aria-label="Navigasi footer">
                <div><b>JELAJAHI</b>{discovery.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}</div>
                <div><b>SWAPNEWS</b>{company.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}</div>
                <div><b>KEBIJAKAN</b>{policies.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}</div>
            </nav>
            <section className="footer-pulse"><span>SOCIAL PULSE</span><h2>Berita bergerak.<br />Cerita tetap hidup.</h2><div><a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><Camera /> Instagram <ArrowUpRight /></a><Link href="/?feed=video"><PlayCircle /> Berita Video <ArrowUpRight /></Link></div></section>
        </div>
        <div className="footer-credits"><span>A SWAP MEDIA NETWORK EXPERIENCE</span><b>SWAPNEWS</b><p>Dipimpin oleh rasa ingin tahu.<br />Dibangun untuk komunitas.<br />Diterbitkan dengan tanggung jawab.</p><small>© {new Date().getFullYear()} SwapNews Media. Seluruh hak cipta dilindungi.</small></div>
    </footer>;
}
