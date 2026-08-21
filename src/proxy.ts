import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextFetchEvent, NextResponse, type NextRequest } from "next/server";

import { getWaitingRoomConfig } from "@/lib/waiting-room/config";
import { admissionCookieOptions, identityCookieOptions, waitingRoomInitPath } from "@/lib/waiting-room/cookies";
import { renewWaitingRoomSession } from "@/lib/waiting-room/service";
import { createAdmissionToken, verifyAdmissionToken } from "@/lib/waiting-room/token";
import { WAITING_ROOM_ADMISSION_COOKIE, WAITING_ROOM_ID_COOKIE } from "@/lib/waiting-room/types";

const PRIVATE_PREFIXES = ["/dashboard", "/panelswap", "/profile", "/member", "/artikel"];
const CRAWLER_USER_AGENT = /bot|crawler|spider|facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot/i;
const QUEUE_BYPASS_PREFIXES = [
    ...PRIVATE_PREFIXES,
    "/api",
    "/auth",
    "/login",
    "/waiting-room",
    "/og-image",
    "/robots.txt",
    "/sitemap",
];

function startsWithRoute(pathname: string, prefix: string) {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPrivatePath(pathname: string) {
    return PRIVATE_PREFIXES.some((prefix) => startsWithRoute(pathname, prefix));
}

function shouldUseWaitingRoom(pathname: string) {
    return !QUEUE_BYPASS_PREFIXES.some((prefix) => startsWithRoute(pathname, prefix));
}

async function refreshPrivateSession(request: NextRequest) {
    let response = NextResponse.next({ request });
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return response;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            },
        },
    });

    await supabase.auth.getSession();
    return response;
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
    const pathname = request.nextUrl.pathname;

    if (isPrivatePath(pathname)) return refreshPrivateSession(request);

    const config = getWaitingRoomConfig();
    const isCrawler = CRAWLER_USER_AGENT.test(request.headers.get("user-agent") ?? "");
    if (!config.enabled || isCrawler || !shouldUseWaitingRoom(pathname)) return NextResponse.next();

    const admission = verifyAdmissionToken(
        request.cookies.get(WAITING_ROOM_ADMISSION_COOKIE)?.value,
        config,
    );
    const nextPath = `${pathname}${request.nextUrl.search}`;

    if (!admission) {
        return NextResponse.redirect(new URL(waitingRoomInitPath(nextPath), request.url));
    }

    const renewalThresholdMs = (config.sessionTtlSeconds * 1000) / 2;
    if (admission.expiresAt - Date.now() > renewalThresholdMs) return NextResponse.next();

    event.waitUntil(renewWaitingRoomSession(admission.userId, config));
    const response = NextResponse.next();
    response.cookies.set(WAITING_ROOM_ID_COOKIE, admission.userId, identityCookieOptions(config));
    response.cookies.set(
        WAITING_ROOM_ADMISSION_COOKIE,
        createAdmissionToken(admission.userId, config),
        admissionCookieOptions(config),
    );
    return response;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)"],
};

