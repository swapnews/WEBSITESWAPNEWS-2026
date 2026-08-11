"use client";

import { Search, Bell } from "lucide-react";
import type { Profile } from "@/lib/auth/get-profile";

type DashboardHeaderProps = {
    profile: Profile;
};

export function DashboardHeader({ profile }: DashboardHeaderProps) {
    const name = profile.full_name || profile.email.split("@")[0];
    const initial = name.charAt(0).toUpperCase();

    return (
        <header className="mint-header">
            <div className="mint-header-titles">
                <span className="mint-greeting">
                    Welcome back, {name} 👋
                </span>
                <h1 className="mint-page-title">Dashboard</h1>
            </div>

            <div className="mint-header-actions">
                <button type="button" className="mint-action-btn" aria-label="Cari">
                    <Search size={16} />
                </button>

                <button type="button" className="mint-action-btn" aria-label="Notifikasi">
                    <Bell size={16} />
                    <span className="mint-badge-dot" />
                </button>

                <div className="mint-user-pill">
                    <div className="mint-avatar">{initial}</div>
                    <span className="mint-user-name">{name}</span>
                </div>
            </div>
        </header>
    );
}
