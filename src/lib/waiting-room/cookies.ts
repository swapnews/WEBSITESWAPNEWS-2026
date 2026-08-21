import type { WaitingRoomConfig } from "./types";

export const WAITING_ROOM_PATH = "/waiting-room";
export const WAITING_ROOM_INIT_PATH = "/api/waiting-room/init";

export function safeNextPath(value: string | null | undefined, fallback = "/") {
    if (!value?.startsWith("/") || value.startsWith("//")) return fallback;
    return value;
}

export function waitingRoomPath(nextPath: string) {
    return `${WAITING_ROOM_PATH}?${new URLSearchParams({ next: safeNextPath(nextPath) })}`;
}

export function waitingRoomInitPath(nextPath: string) {
    return `${WAITING_ROOM_INIT_PATH}?${new URLSearchParams({ next: safeNextPath(nextPath) })}`;
}

export function identityCookieOptions(config: WaitingRoomConfig) {
    return {
        httpOnly: true,
        maxAge: Math.max(config.queueTtlSeconds, config.sessionTtlSeconds),
        path: "/",
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
    };
}

export function admissionCookieOptions(config: WaitingRoomConfig) {
    return {
        httpOnly: true,
        maxAge: config.sessionTtlSeconds,
        path: "/",
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
    };
}
