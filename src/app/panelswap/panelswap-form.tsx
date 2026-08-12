"use client";

import Link from "next/link";
import { useState, ChangeEvent } from "react";

type FormProps = {
    mode: string;
    signInAction: (formData: FormData) => Promise<void>;
    signUpAction: (formData: FormData) => Promise<void>;
    signUpWartawanAction: (formData: FormData) => Promise<void>;
};

export function PanelswapForm({ mode, signInAction, signUpAction, signUpWartawanAction }: FormProps) {
    const [ktpUrl, setKtpUrl] = useState("");
    const [ktpPreview, setKtpPreview] = useState("");

    const handleKtpChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setKtpUrl(result);
            setKtpPreview(result);
        };
        reader.readAsDataURL(file);
    };

    if (mode === "register_wartawan") {
        return (
            <form action={signUpWartawanAction} className="auth-form">
                <label>
                    Nama Lengkap Sesuai KTP <span style={{ color: "red" }}>*</span>
                    <input name="full_name" type="text" required placeholder="Nama lengkap sesuai KTP" />
                </label>

                <label>
                    Username
                    <input name="username" type="text" placeholder="username_wartawan" />
                </label>

                <label>
                    Email <span style={{ color: "red" }}>*</span>
                    <input name="email" type="email" required placeholder="nama@swapnews.co.id" />
                </label>

                <label>
                    Password <span style={{ color: "red" }}>*</span>
                    <input name="password" type="password" required minLength={6} placeholder="Minimal 6 karakter" />
                </label>

                <label>
                    Nomor WhatsApp <span style={{ color: "red" }}>*</span>
                    <input name="whatsapp" type="tel" required placeholder="081234567890" />
                </label>

                <label>
                    Upload Foto KTP <span style={{ color: "red" }}>*</span>
                    <input type="file" accept="image/*" required onChange={handleKtpChange} />
                    <input type="hidden" name="ktp_url" value={ktpUrl} />
                </label>

                {ktpPreview ? (
                    <div style={{ marginTop: 8, marginBottom: 12 }}>
                        <small>Preview KTP:</small>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ktpPreview} alt="Preview KTP" style={{ width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 8, marginTop: 4, border: "1px solid #ccc" }} />
                    </div>
                ) : null}

                <label>
                    Instagram User (Opsional)
                    <input name="instagram_handle" type="text" placeholder="@username_ig" />
                </label>

                <label>
                    Alamat Tinggal Saat Ini (Opsional)
                    <textarea name="address" rows={2} placeholder="Alamat domisili saat ini..." />
                </label>

                <button type="submit" style={{ marginTop: 12 }}>Daftar Sebagai Wartawan</button>

                <div className="auth-switch">
                    <span>
                        Sudah punya akun? <Link href="/panelswap">Masuk</Link> · <Link href="/panelswap?mode=register">Daftar Member</Link>
                    </span>
                </div>
            </form>
        );
    }

    if (mode === "register") {
        return (
            <form action={signUpAction} className="auth-form">
                <label>
                    Nama Lengkap
                    <input name="full_name" type="text" required placeholder="Nama lengkap" />
                </label>

                <label>
                    Email
                    <input name="email" type="email" required placeholder="nama@email.com" />
                </label>

                <label>
                    Password
                    <input name="password" type="password" required minLength={6} placeholder="Minimal 6 karakter" />
                </label>

                <button type="submit">Daftar Member</button>

                <div className="auth-switch">
                    <span>
                        Sudah punya akun? <Link href="/panelswap">Masuk</Link> · <Link href="/panelswap?mode=register_wartawan">Daftar Wartawan</Link>
                    </span>
                </div>
            </form>
        );
    }

    return (
        <form action={signInAction} className="auth-form">
            <label>
                Email
                <input name="email" type="email" required placeholder="nama@swapnews.co.id" />
            </label>

            <label>
                Password
                <input name="password" type="password" required minLength={6} placeholder="Minimal 6 karakter" />
            </label>

            <button type="submit">Masuk</button>

            <div className="auth-switch">
                <span>
                    Belum punya akun? <Link href="/panelswap?mode=register">Daftar Member</Link> · <Link href="/panelswap?mode=register_wartawan">Daftar Wartawan</Link>
                </span>
            </div>
        </form>
    );
}
