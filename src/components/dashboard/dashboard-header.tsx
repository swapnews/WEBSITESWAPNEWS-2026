"use client";

import Image from "next/image";
import Link from "next/link";
import { Plus, Globe, Shield } from "lucide-react";
import type { Profile } from "@/lib/auth/get-profile";
import { ROLE_LABELS } from "@/lib/auth/roles";

type DashboardHeaderProps = {
    profile: Profile;
    title?: string;
    description?: string;
};

export function DashboardHeader({ profile, title = "Dashboard", description }: DashboardHeaderProps) {
    const name = profile.full_name || profile.email.split("@")[0];
    const initial = name.charAt(0).toUpperCase();
    const roleLabel = ROLE_LABELS[profile.role] || profile.role;

    return (
        <header className="dash-header">
            <div className="dash-header-left">
                <span className="dash-header-eyebrow">Workspace Redaksi</span>
                <h1 className="dash-page-title">{title}</h1>
                <p className="dash-page-desc">
                    {description || `Selamat bekerja, ${name}. Kelola konten SwapNews dari satu tempat.`}
                </p>
            </div>

            <div className="dash-header-right">
                <div className="dash-header-actions" aria-label="Aksi cepat">
                    <Link href="/" target="_blank" rel="noreferrer" className="dash-header-btn outline" aria-label="Buka website SwapNews">
                        <Globe size={16} />
                        <span className="dash-btn-label">Lihat Web</span>
                    </Link>

                    <Link href="/dashboard/articles/new" className="dash-header-btn primary" aria-label="Tulis artikel baru">
                        <Plus size={16} />
                        <span className="dash-btn-label">Tulis Artikel</span>
                    </Link>
                </div>

                <Link id="dashboard-profile-link" href="/profile" className="dash-user-profile-pill" aria-label={`Edit profile ${name}, ${roleLabel}`}>
                    <div className="dash-avatar-circle" aria-hidden="true">
                        {profile.avatar_url ? <Image src={profile.avatar_url} alt="" width={40} height={40} unoptimized /> : initial}
                    </div>
                    <div className="dash-user-meta">
                        <span className="dash-user-name-text">{name}</span>
                        <small className="dash-user-role-text">
                            <Shield size={11} /> {roleLabel}
                        </small>
                    </div>
                </Link>
            </div>
        </header>
    );
}
