// CSS khusus dashboard — dipindahkan dari root layout agar tidak
// memblokir render halaman publik.
import "@/styles/dashboard-mint.css";
import "@/styles/editorial-workflow.css";
import "@/styles/editorial-quality.css";
import "@/styles/editor.css";
import "@/styles/editor-2026.css";
import "@/styles/merch-admin.css";
import "@/styles/media-seo.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return children;
}
