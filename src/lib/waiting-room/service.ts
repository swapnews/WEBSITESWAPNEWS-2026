import { UpstashWaitingRoomProvider } from "./provider";
import type { WaitingRoomConfig, WaitingRoomStatus } from "./types";

const providers = new Map<string, UpstashWaitingRoomProvider>();

function providerFor(config: WaitingRoomConfig) {
    const key = `${config.redisUrl}:${config.namespace}`;
    let provider = providers.get(key);
    if (!provider) {
        provider = new UpstashWaitingRoomProvider(config);
        providers.set(key, provider);
    }
    return provider;
}

function estimatedWaitSeconds(position: number, config: WaitingRoomConfig) {
    return Math.max(3, Math.ceil((position * config.sessionTtlSeconds) / config.capacity));
}

export async function resolveWaitingRoomStatus(userId: string, config: WaitingRoomConfig, source: string): Promise<WaitingRoomStatus> {
    try {
        const result = await providerFor(config).tryAdmit(userId);
        if (result.status === "admitted" || result.status === "already_active") return { status: "admitted" };
        return {
            status: "queued",
            position: result.position,
            estimatedWaitSeconds: estimatedWaitSeconds(result.position, config),
        };
    } catch (error) {
        console.error(`[WaitingRoom] ${source} failed`, error);
        return config.failOpen ? { status: "admitted" } : { status: "unavailable" };
    }
}

export async function renewWaitingRoomSession(userId: string, config: WaitingRoomConfig) {
    try {
        await providerFor(config).renewSession(userId);
    } catch (error) {
        console.error("[WaitingRoom] session renewal failed", error);
        if (!config.failOpen) throw error;
    }
}
