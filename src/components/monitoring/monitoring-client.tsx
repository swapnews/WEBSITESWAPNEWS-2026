"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, CheckCircle2, Database, HardDrive, Mail, RefreshCw, Server, TriangleAlert, XCircle } from "lucide-react";

type Status = "green" | "yellow" | "red";
type Service = { status: Status; message: string; latency_ms?: number };
type Health = { timestamp: string; overall: Status; services: Record<string, Service>; metrics: Record<string, number>; latency_ms: number };

const labels: Record<string, string> = { database: "Database", cloudinary: "Cloudinary Media", email: "Email Gmail SMTP" };
const icons: Record<string, typeof Database> = { database: Database, cloudinary: HardDrive, email: Mail };

export function MonitoringClient() {
    const [health, setHealth] = useState<Health | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const refresh = useCallback(async () => {
        setLoading(true); setError("");
        try {
            const response = await fetch("/api/system/health", { cache: "no-store" });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Health check gagal");
            setHealth(data);
        } catch (err) { setError(err instanceof Error ? err.message : "Health check gagal"); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 30000); return () => clearInterval(timer); }, [refresh]);

    const statusLabel = (status: Status) => status === "green" ? "ONLINE" : status === "yellow" ? "WARNING" : "ERROR";
    const StatusIcon = ({ status }: { status: Status }) => status === "green" ? <CheckCircle2 /> : status === "yellow" ? <TriangleAlert /> : <XCircle />;
    return <main className="monitoring-dashboard">
        <section className="monitoring-header"><div><span className="eyebrow">SUPER ADMIN MONITORING</span><h1>System Health Dashboard</h1><p>Semua layanan penting SwapNews dalam satu panel.</p></div><button className="refresh-btn" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} className={loading ? "monitor-spin" : ""} /> {loading ? "Checking..." : "Refresh Status"}</button></section>
        {error && <div className="monitor-error">{error}</div>}
        <section className="monitor-overall"><div className={`overall-dot ${health?.overall || "yellow"}`} /><div><strong>Status keseluruhan: {health ? statusLabel(health.overall) : "CHECKING"}</strong><small>{health ? `Diperiksa ${new Date(health.timestamp).toLocaleTimeString("id-ID")}` : "Memeriksa layanan..."}</small></div><span className="overall-latency"><Activity size={15} /> {health?.latency_ms ?? 0}ms</span></section>
        <section className="monitor-services">{Object.entries(health?.services || {}).map(([key, service]) => { const Icon = icons[key] || Server; return <article className="status-card" key={key}><div className={`status-icon ${service.status}`}><Icon size={23} /></div><div className="status-info"><h2 className="status-title">{labels[key] || key}</h2><p className="status-desc">{service.message}</p><strong className={`status-value ${service.status}`}>{statusLabel(service.status)}</strong>{service.latency_ms !== undefined && <small className="last-checked">Response {service.latency_ms}ms</small>}</div><div className={`status-lamp ${service.status}`} /></article>; })}</section>
        <section><h2 className="monitor-section-title">Operational Metrics</h2><div className="metrics-grid">{Object.entries(health?.metrics || {}).map(([key, value]) => <article className="metric-card" key={key}><div className="metric-label">{key.replaceAll("_", " ")}</div><div className="metric-count">{value.toLocaleString("id-ID")}</div></article>)}</div></section>
    </main>;
}
