import type { WaitingRoomConfig } from "./types";

function positiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getWaitingRoomConfig(): WaitingRoomConfig {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
    const tokenSecret = process.env.WAITING_ROOM_TOKEN_SECRET ?? "";
    const requestedEnabled = process.env.WAITING_ROOM_ENABLED === "true";
    const configured = Boolean(redisUrl && redisToken && tokenSecret);

    return {
        capacity: positiveInteger(process.env.WAITING_ROOM_CAPACITY, 250),
        enabled: requestedEnabled && configured,
        failOpen: process.env.WAITING_ROOM_FAIL_OPEN !== "false",
        namespace: process.env.WAITING_ROOM_NAMESPACE?.trim() || "swapnews-production",
        queueTtlSeconds: positiveInteger(process.env.WAITING_ROOM_QUEUE_TTL_SECONDS, 1800),
        sessionTtlSeconds: positiveInteger(process.env.WAITING_ROOM_SESSION_TTL_SECONDS, 300),
        tokenSecret,
        redisUrl,
        redisToken,
    };
}

export function waitingRoomKey(config: WaitingRoomConfig, suffix: string) {
    return `wr:${config.namespace}:${suffix}`;
}
