"use client";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import type { Profile } from "@/lib/auth/get-profile";

type DashboardLayoutProps = {
    profile: Profile;
    children: React.ReactNode;
};

export function DashboardLayout({ profile, children }: DashboardLayoutProps) {
    return (
        <div className="mint-dashboard-shell">
            <DashboardSidebar profile={profile} />
            <div className="mint-main-wrapper" style={{ marginLeft: "270px" }}>
                {children}
            </div>
            <style jsx global>{`
        @media (max-width: 768px) {
          .mint-main-wrapper {
            margin-left: 0 !important;
          }
        }
      `}</style>
        </div>
    );
}
