"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    FileText,
    Files,
    FolderTree,
    Clapperboard,
    PanelsTopLeft,
    Image as ImageIcon,
    PlusCircle,
    LogOut,
    ExternalLink,
    ShieldCheck,
    User,
    BookOpenCheck,
    ShoppingBag,
} from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Profile } from "@/lib/auth/get-profile";

type DashboardSidebarProps = {
    profile: Profile;
};

export function DashboardSidebar({ profile }: DashboardSidebarProps) {
    const pathname = usePathname();

    const navItems = [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Artikel", href: "/dashboard/articles", icon: FileText },
        { label: "Media Library", href: "/dashboard/media", icon: ImageIcon },
        ...(profile.role === "super_admin" ? [
            { label: "Homepage", href: "/dashboard/homepage", icon: PanelsTopLeft },
            { label: "Kategori", href: "/dashboard/categories", icon: FolderTree },
            { label: "Pages", href: "/dashboard/pages", icon: Files },
            { label: "Instagram Reels", href: "/dashboard/reels", icon: Clapperboard },
            { label: "Sisipan Artikel", href: "/dashboard/article-insertions", icon: BookOpenCheck },
            { label: "Merchandise", href: "/dashboard/merchandise", icon: ShoppingBag },
        ] : []),
    ];

    return (
        <>
            {/* Desktop Floating Clay Sidebar */}
            <aside className="mint-sidebar mint-clay-card">
                <div className="mint-sidebar-brand">
                    Swap<span>News</span>
                </div>

                <nav className="mint-sidebar-nav">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <Link key={item.href} href={item.href} className={`mint-nav-item ${isActive ? "active" : ""}`}>
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                    <Link href="/dashboard/articles/new" className="mint-nav-item">
                        <PlusCircle size={18} />
                        <span>Tulis Artikel</span>
                    </Link>
                    <Link href="/" target="_blank" className="mint-nav-item">
                        <ExternalLink size={18} />
                        <span>Lihat Website</span>
                    </Link>
                </nav>

                <div className="sidebar-footer" style={{ marginTop: "auto" }}>
                    <div style={{ marginBottom: 12, padding: "0 8px", fontSize: 11, fontWeight: 700, color: "var(--teal-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                        <ShieldCheck size={14} color="var(--teal-primary)" /> {ROLE_LABELS[profile.role]}
                    </div>
                    <form action={signOutAction}>
                        <button type="submit" className="logout-sidebar-btn">
                            <LogOut size={16} /> Keluar
                        </button>
                    </form>
                </div>
            </aside>

            {/* Mobile Floating Bottom PWA App Bar (5 Tabs, Lucide 16px) */}
            <nav className="mint-mobile-bottom-bar" aria-label="Mobile Bottom Navigation">
                <Link href="/dashboard" className={`mint-mobile-tab ${pathname === "/dashboard" ? "active" : ""}`}>
                    <LayoutDashboard size={16} />
                    <span>Dashboard</span>
                </Link>
                <Link href="/dashboard/articles" className={`mint-mobile-tab ${pathname === "/dashboard/articles" ? "active" : ""}`}>
                    <FileText size={16} />
                    <span>Artikel</span>
                </Link>
                <Link href="/dashboard/articles/new" className="mint-mobile-tab primary-action" aria-label="Tulis Artikel">
                    <PlusCircle size={22} />
                </Link>
                <Link href="/dashboard/media" className={`mint-mobile-tab ${pathname === "/dashboard/media" ? "active" : ""}`}>
                    <ImageIcon size={16} />
                    <span>Media</span>
                </Link>
                <Link href="/dashboard" className="mint-mobile-tab">
                    <User size={16} />
                    <span>Profil</span>
                </Link>
            </nav>
        </>
    );
}
