import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isAdminRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

type Status = "green" | "yellow" | "red";
type Service = { status: Status; message: string; latency_ms?: number };

export async function GET() {
    const profile = await getCurrentProfile();
    if (!profile || !isAdminRole(profile.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const started = Date.now();
    const services: Record<string, Service> = {};
    const metrics = { published: 0, in_review: 0, drafts: 0, wartawan: 0, members: 0, media_assets: 0 };

    try {
        const supabase = await createClient();
        const dbStarted = Date.now();
        const [{ count: published }, { count: inReview }, { count: drafts }, { count: wartawan }, { count: members }, { count: media }] = await Promise.all([
            supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
            supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "in_review"),
            supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "wartawan").eq("wartawan_status", "approved"),
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_member", true),
            supabase.from("media_assets").select("id", { count: "exact", head: true }),
        ]);
        metrics.published = published ?? 0; metrics.in_review = inReview ?? 0; metrics.drafts = drafts ?? 0;
        metrics.wartawan = wartawan ?? 0; metrics.members = members ?? 0; metrics.media_assets = media ?? 0;
        services.database = { status: "green", message: "Supabase connected", latency_ms: Date.now() - dbStarted };
    } catch (error) {
        services.database = { status: "red", message: error instanceof Error ? error.message : "Database check failed" };
    }

    try {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        if (!cloudName || !apiKey || !apiSecret) {
            services.cloudinary = { status: "yellow", message: "Cloudinary credentials missing (CLOUDINARY_CLOUD_NAME/KEY/SECRET)" };
        } else {
            const cloudStarted = Date.now();
            // Ping Cloudinary via API or public usage endpoint
            const auth = Buffer.from(`${apiKey.trim()}:${apiSecret.trim()}`).toString("base64");
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName.trim()}/ping`, {
                headers: { Authorization: `Basic ${auth}` },
                signal: AbortSignal.timeout(8000),
            });
            if (response.ok) {
                services.cloudinary = { status: "green", message: "Cloudinary CDN & API terhubung", latency_ms: Date.now() - cloudStarted };
            } else if (response.status === 401) {
                // Fallback: test if client URL generation works with cloud name
                services.cloudinary = { status: "yellow", message: `Cloudinary API Key/Secret perlu diperiksa (HTTP 401), Cloud Name: ${cloudName}` };
            } else {
                services.cloudinary = { status: "red", message: `Cloudinary HTTP ${response.status}` };
            }
        }
    } catch (error) {
        const message = error instanceof Error && error.name === "TimeoutError" ? "Cloudinary timeout" : error instanceof Error ? error.message : "Cloudinary check failed";
        services.cloudinary = { status: "red", message };
    }

    const gmailConfigured = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
    services.email = gmailConfigured
        ? { status: "green", message: "Gmail SMTP credentials configured" }
        : { status: "yellow", message: "GMAIL_USER or GMAIL_APP_PASSWORD missing" };

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    const waitingRoomEnabled = process.env.WAITING_ROOM_ENABLED === "true";
    if (!redisUrl || !redisToken) {
        services.waiting_room = {
            status: waitingRoomEnabled ? "red" : "yellow",
            message: waitingRoomEnabled ? "Waiting Room aktif tapi Redis URL/Token belum diisi" : "Waiting Room nonaktif (Redis belum dikonfigurasi)",
        };
    } else {
        services.waiting_room = {
            status: waitingRoomEnabled ? "green" : "yellow",
            message: waitingRoomEnabled ? "Waiting Room AKTIF (Upstash Redis terhubung)" : "Waiting Room NONAKTIF (Redis terkonfigurasi, proteksi off)",
        };
    }

    const statuses = Object.values(services).map((service) => service.status);
    const overall = statuses.includes("red") ? "red" : statuses.includes("yellow") ? "yellow" : "green";
    return NextResponse.json({ timestamp: new Date().toISOString(), overall, services, metrics, latency_ms: Date.now() - started });
}
