"use client";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import type { Profile } from "@/lib/auth/get-profile";

type DashboardLayoutProps = {
  profile: Profile;
  children: React.ReactNode;
};

export function DashboardLayout({ profile, children }: DashboardLayoutProps) {
  return (
    <div className="dash-shell">
      <a className="dash-skip-link" href="#dashboard-content">
        Lewati ke konten
      </a>
      <DashboardSidebar profile={profile} />
      <main id="dashboard-content" className="dash-main-stage" tabIndex={-1}>
        <div className="dash-container">{children}</div>
      </main>
    </div>
  );
}
