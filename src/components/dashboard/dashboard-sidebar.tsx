"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
    Menu,
    X,
    UserCheck,
    Activity,
    Users,
    SearchCheck,
    BookOpenCheck,
    ShoppingBag,
    Megaphone,
} from "lucide-react";

import { signOutAction } from "@/lib/auth/actions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { Profile } from "@/lib/auth/get-profile";

type DashboardSidebarProps = {
    profile: Profile;
};

export function DashboardSidebar({ profile }: DashboardSidebarProps) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (!mobileOpen) return;

        const previousOverflow = document.body.style.overflow;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setMobileOpen(false);
        };

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", closeOnEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [mobileOpen]);

    const mainNav = [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Artikel", href: "/dashboard/articles", icon: FileText },
        { label: "Media Library", href: "/dashboard/media", icon: ImageIcon },
    ];

    const editorialNav = [
        ...(profile.role === "wartawan" ? [
            { label: "Ruang Review", href: "/dashboard/wartawan/workspace", icon: UserCheck },
        ] : []),
        ...(profile.role === "super_admin" || profile.role === "admin" ? [
            { label: "Verifikasi Wartawan", href: "/dashboard/wartawan", icon: UserCheck },
            { label: "Sisipan Artikel", href: "/dashboard/article-insertions", icon: BookOpenCheck },
        ] : []),
    ];

    const adminNav = [
        ...(profile.role === "super_admin" ? [
            { label: "Kategori Kanal", href: "/dashboard/categories", icon: FolderTree },
            { label: "Halaman Statis", href: "/dashboard/pages", icon: Files },
            { label: "Instagram Reels", href: "/dashboard/reels", icon: Clapperboard },
            { label: "Homepage Control", href: "/dashboard/homepage", icon: PanelsTopLeft },
            { label: "Ads Management", href: "/dashboard/ads", icon: Megaphone },
            { label: "SEO Dashboard", href: "/dashboard/seo", icon: SearchCheck },
            { label: "Merchandise", href: "/dashboard/merchandise", icon: ShoppingBag },
            { label: "Manajemen Akun", href: "/dashboard/accounts", icon: Users },
            { label: "System Monitor", href: "/dashboard/monitoring", icon: Activity },
        ] : []),
    ];

    const renderLink = (item: { label: string; href: string; icon: React.ComponentType<{ size: number }> }) => {
        const Icon = item.icon;
        const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        return (
            <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`dash-nav-link ${isActive ? "active" : ""}`}
            >
                <Icon size={17} />
                <span>{item.label}</span>
            </Link>
        );
    };

    return (
        <>
            {/* Desktop Fixed Left Sidebar */}
            <aside className="dash-sidebar">
                <div className="dash-sidebar-header">
                    <Link href="/dashboard" className="dash-brand" aria-label="SwapNews Editorial Panel">
                        <span className="dash-brand-icon" aria-hidden="true">S</span>
                        <div className="dash-brand-text">
                            Swap<strong>News</strong>
                            <small>Editorial Panel</small>
                        </div>
                    </Link>
                </div>

                <div className="dash-sidebar-action">
                    <Link href="/dashboard/articles/new" className="dash-create-btn">
                        <PlusCircle size={16} />
                        <span>Tulis Artikel</span>
                    </Link>
                </div>

                <nav className="dash-sidebar-scroll">
                    <div className="dash-nav-group">
                        <span className="dash-nav-heading">MENU UTAMA</span>
                        {mainNav.map(renderLink)}
                    </div>

                    {editorialNav.length > 0 && (
                        <div className="dash-nav-group">
                            <span className="dash-nav-heading">REDAKSI</span>
                            {editorialNav.map(renderLink)}
                        </div>
                    )}

                    {adminNav.length > 0 && (
                        <div className="dash-nav-group">
                            <span className="dash-nav-heading">ADMINISTRASI</span>
                            {adminNav.map(renderLink)}
                        </div>
                    )}

                    <div className="dash-nav-group">
                        <span className="dash-nav-heading">PORTAL</span>
                        <Link href="/" target="_blank" className="dash-nav-link">
                            <ExternalLink size={17} />
                            <span>Lihat Website</span>
                        </Link>
                    </div>
                </nav>

                <div className="dash-sidebar-footer">
                    <div className="dash-user-badge">
                        <ShieldCheck size={14} className="dash-role-icon" />
                        <span className="dash-role-name">{ROLE_LABELS[profile.role] || profile.role}</span>
                    </div>
                    <form action={signOutAction} className="dash-logout-form">
                        <button type="submit" className="dash-logout-btn">
                            <LogOut size={15} />
                            <span>Keluar</span>
                        </button>
                    </form>
                </div>
            </aside>

            {/* Mobile Header Bar (< 768px) */}
            <header className="dash-mobile-topbar">
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="dash-menu-toggle"
                    aria-label="Buka menu navigasi"
                    aria-expanded={mobileOpen}
                    aria-controls="dashboard-mobile-drawer"
                >
                    <Menu size={20} />
                </button>

                <Link href="/dashboard" className="dash-mobile-brand">
                    Swap<span>News</span>
                </Link>

                <Link href="/dashboard/articles/new" className="dash-mobile-quick-create" aria-label="Tulis Baru">
                    <PlusCircle size={18} />
                </Link>
            </header>

            {/* Mobile Slide Drawer Overlay */}
            {mobileOpen && (
                <div className="dash-mobile-overlay" onClick={() => setMobileOpen(false)}>
                    <div
                        id="dashboard-mobile-drawer"
                        className="dash-mobile-drawer"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navigasi dashboard"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="dash-drawer-header">
                            <div className="dash-drawer-brand">
                                Swap<span>News</span> Redaksi
                            </div>
                            <button
                                type="button"
                                onClick={() => setMobileOpen(false)}
                                className="dash-drawer-close"
                                aria-label="Tutup Menu"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="dash-drawer-body">
                            <div className="dash-nav-group">
                                <span className="dash-nav-heading">MENU UTAMA</span>
                                {mainNav.map(renderLink)}
                            </div>

                            {editorialNav.length > 0 && (
                                <div className="dash-nav-group">
                                    <span className="dash-nav-heading">REDAKSI</span>
                                    {editorialNav.map(renderLink)}
                                </div>
                            )}

                            {adminNav.length > 0 && (
                                <div className="dash-nav-group">
                                    <span className="dash-nav-heading">ADMINISTRASI</span>
                                    {adminNav.map(renderLink)}
                                </div>
                            )}

                            <div className="dash-nav-group">
                                <span className="dash-nav-heading">PORTAL</span>
                                <Link href="/" target="_blank" className="dash-nav-link" onClick={() => setMobileOpen(false)}>
                                    <ExternalLink size={17} />
                                    <span>Buka Website SwapNews</span>
                                </Link>
                            </div>
                        </div>

                        <div className="dash-drawer-footer">
                            <div className="dash-user-badge">
                                <ShieldCheck size={14} className="dash-role-icon" />
                                <span>{ROLE_LABELS[profile.role] || profile.role}</span>
                            </div>
                            <form action={signOutAction}>
                                <button type="submit" className="dash-logout-btn">
                                    <LogOut size={15} />
                                    <span>Keluar</span>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Quick Navigation */}
            <nav className="dash-mobile-bottom-bar" aria-label="Quick Nav">
                <Link href="/dashboard" className={`dash-tab ${pathname === "/dashboard" ? "active" : ""}`}>
                    <LayoutDashboard size={17} />
                    <span>Home</span>
                </Link>
                <Link href="/dashboard/articles" className={`dash-tab ${pathname === "/dashboard/articles" ? "active" : ""}`}>
                    <FileText size={17} />
                    <span>Artikel</span>
                </Link>
                <Link href="/dashboard/articles/new" className="dash-tab dash-tab-add" aria-label="Tulis Artikel">
                    <PlusCircle size={22} />
                </Link>
                <Link href="/dashboard/media" className={`dash-tab ${pathname === "/dashboard/media" ? "active" : ""}`}>
                    <ImageIcon size={17} />
                    <span>Media</span>
                </Link>
                <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="dash-tab"
                    aria-label="Semua menu"
                    aria-expanded={mobileOpen}
                    aria-controls="dashboard-mobile-drawer"
                >
                    <Menu size={17} />
                    <span>Menu</span>
                </button>
            </nav>
        </>
    );
}
