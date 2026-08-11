"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
    ArrowLeft, Bookmark, Clock3, Flag, Heart, MessageCircle,
    Moon, Share2, ShoppingBag, Sun, ThumbsUp, Type, Volume2,
} from "lucide-react";

const related = [
    { category: "Bisnis", title: "Pasar kreatif digital tumbuh dua kali lipat di kota lapis dua", time: "1 jam lalu" },
    { category: "News", title: "Pemerintah siapkan insentif baru bagi pelaku industri kreatif", time: "3 jam lalu" },
];

const comments = [
    { name: "Rani P.", text: "Akhirnya ada sorotan serius untuk kota kecil. Semoga berlanjut ke akses pendanaan.", likes: 24, time: "20 menit" },
    { name: "Dimas A.", text: "Sudut pandangnya segar. Ditunggu liputan lanjutannya.", likes: 11, time: "44 menit" },
];

export default function ArticlePage() {
    const [dark, setDark] = useState(false);
    const [fontScale, setFontScale] = useState(1);
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);

    const toggleTheme = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? "dark" : "light";
    };

    return (
        <div className="site-shell article-shell">
            <header className="topbar">
                <div className="nav-wrap">
                    <Link href="/" className="icon-button back-button" aria-label="Kembali"><ArrowLeft size={18} /></Link>
                    <Link href="/" className="brand" aria-label="SwapNews beranda">
                        <Image src="/swapnews-logo.png" alt="SwapNews" width={190} height={54} priority />
                    </Link>
                    <div className="nav-actions" style={{ marginLeft: "auto" }}>
                        <button id="article-theme" className="icon-button" onClick={toggleTheme} aria-label="Ubah tema">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
                        <button id="article-share" className="icon-button" aria-label="Bagikan"><Share2 size={18} /></button>
                    </div>
                </div>
            </header>

            <main className="article-main">
                <article className="article-body" style={{ fontSize: `${15 * fontScale}px` }}>
                    <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Beranda</Link><span>/</span><a href="#">Bisnis</a><span>/</span><b>Ekonomi Kreatif</b></nav>

                    <h1>Babak baru ekonomi kreatif Indonesia dimulai dari kota-kota kecil</h1>
                    <p className="article-lead">Talenta lokal, teknologi, dan akses pasar bertemu dalam gelombang pertumbuhan baru yang mengubah peta ekonomi kreatif nasional.</p>

                    <div className="article-byline">
                        <div className="author-avatar">SN</div>
                        <div><b>Nadia Prameswari</b><small>Jurnalis SwapNews · 10 Agustus 2026, 09.30 WIB</small></div>
                        <div className="story-meta"><Clock3 size={12} /> 6 menit baca <span>•</span> 12.450 dibaca</div>
                    </div>

                    <div className="article-hero story-art sunset"><span /><i /></div>
                    <p className="caption">Ilustrasi suasana distrik kreatif di salah satu kota berkembang. (Dok. SwapNews)</p>

                    <div className="article-actions">
                        <button id="like-button" className={liked ? "active" : ""} onClick={() => setLiked(!liked)}><Heart size={16} fill={liked ? "currentColor" : "none"} /> {liked ? 89 : 88}</button>
                        <button id="save-button" className={saved ? "active" : ""} onClick={() => setSaved(!saved)}><Bookmark size={16} fill={saved ? "currentColor" : "none"} /> Simpan</button>
                        <button id="tts-button"><Volume2 size={16} /> Dengarkan</button>
                        <button id="font-button" onClick={() => setFontScale(fontScale >= 1.2 ? 1 : fontScale + 0.1)}><Type size={16} /> Ukuran teks</button>
                        <button id="report-button"><Flag size={16} /> Koreksi</button>
                    </div>

                    <p>Banyak hal besar tidak selalu lahir dari ibu kota. Dalam beberapa tahun terakhir, kota-kota kecil di Indonesia justru menjadi tempat tumbuhnya ide-ide kreatif yang paling menarik. Dari studio desain di ruko sederhana hingga komunitas film independen, gelombang baru ekonomi kreatif sedang bergerak dari bawah.</p>
                    <p>Perubahan ini tidak terjadi dalam semalam. Akses internet yang makin merata, biaya produksi yang lebih rendah, dan kebanggaan terhadap identitas lokal menjadi bahan bakar utamanya. Anak-anak muda yang dulu harus merantau kini bisa membangun karier dari kota asal mereka.</p>

                    <aside className="read-also"><span>BACA JUGA</span><Link href="/artikel/ekonomi-kreatif-indonesia">Pasar kreatif digital tumbuh dua kali lipat di kota lapis dua</Link></aside>

                    <p>Data menunjukkan kontribusi ekonomi kreatif terhadap PDB terus meningkat. Namun angka hanya menceritakan sebagian cerita. Di baliknya ada ribuan pekerja kreatif yang belajar mandiri, membangun jaringan lewat media sosial, dan menjual karya ke pasar yang lebih luas tanpa perantara besar.</p>
                    <p>Tantangannya tentu masih nyata. Infrastruktur acara, akses pendanaan, dan perlindungan hak cipta belum merata. Tetapi arah perubahannya sudah jelas: pusat gravitasi ekonomi kreatif tidak lagi tunggal.</p>

                    <aside className="product-insert"><div className="product-art story-art sunset" /><div><span>MERCHANDISE RESMI</span><h4>Kaos SwapNews edisi &ldquo;Bukan Berita Biasa&rdquo;</h4><p>Rp149.000 atau 149 poin</p></div><button id="buy-merch"><ShoppingBag size={15} /> Lihat</button></aside>

                    <p>Para pegiat berharap pemerintah daerah tidak berhenti pada seremoni. Yang dibutuhkan adalah ruang pamer, pelatihan berkelanjutan, dan regulasi yang memudahkan — bukan sebaliknya. Jika itu terjadi, kota kecil bisa menjadi mesin pertumbuhan berikutnya.</p>

                    <div className="tag-row"><a href="#">#EkonomiKreatif</a><a href="#">#UMKM</a><a href="#">#Indonesia</a></div>
                </article>

                <aside className="article-side">
                    <div className="side-card clay-card"><h3>Berita terkait</h3>{related.map(item => <a href="#" className="side-item" key={item.title}><span>{item.category}</span><h4>{item.title}</h4><small>{item.time}</small></a>)}</div>
                </aside>
            </main>

            <section className="comments-section">
                <div className="comments-head"><h2><MessageCircle size={18} /> Komentar ({comments.length})</h2><small>Semua komentar dimoderasi sebelum tampil.</small></div>
                <div className="comment-form clay-card">
                    <textarea id="comment-input" placeholder="Tulis komentarmu dengan santun..." rows={3} />
                    <div><small>Berkomentar sebagai <b>Tamu</b></small><button id="send-comment"><ThumbsUp size={14} /> Kirim komentar</button></div>
                </div>
                {comments.map(c => <div className="comment clay-card" key={c.name}><div className="author-avatar">{c.name[0]}</div><div><b>{c.name}</b><small>{c.time} lalu</small><p>{c.text}</p><button><Heart size={12} /> {c.likes}</button></div></div>)}
            </section>
        </div>
    );
}
