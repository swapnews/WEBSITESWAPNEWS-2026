import { Redis } from "@upstash/redis";

import { waitingRoomKey } from "./config";
import { TRY_ADMIT_LUA } from "./try-admit-lua";
import type { AdmissionResult, WaitingRoomConfig, WaitingRoomProvider } from "./types";

export class UpstashWaitingRoomProvider implements WaitingRoomProvider {
    private readonly redis: Redis;
    private readonly tryAdmitScript: ReturnType<typeof Redis.prototype.createScript<[number, number]>>;

    constructor(private readonly config: WaitingRoomConfig) {
        this.redis = new Redis({ url: config.redisUrl, token: config.redisToken });
        this.tryAdmitScript = this.redis.createScript<[number, number]>(TRY_ADMIT_LUA);
    }

    async renewSession(userId: string) {
        await this.redis.zadd(waitingRoomKey(this.config, "active"), {
            member: userId,
            score: Date.now() + this.config.sessionTtlSeconds * 1000,
        });
    }

    async tryAdmit(userId: string): Promise<AdmissionResult> {
        const [status, position] = await this.tryAdmitScript.exec(
            [
                waitingRoomKey(this.config, "active"),
                waitingRoomKey(this.config, "queue"),
                waitingRoomKey(this.config, "heartbeats"),
                waitingRoomKey(this.config, "ticket-seq"),
            ],
            [
                String(this.config.capacity),
                userId,
                String(Date.now()),
                String(this.config.sessionTtlSeconds * 1000),
                String(this.config.queueTtlSeconds * 1000),
            ],
        );

        if (status === 1) return { status: "admitted" };
        if (status === 2) return { status: "queued", position };
        if (status === 3) return { status: "already_active" };
        throw new Error(`[WaitingRoom] Unexpected admission status: ${status}`);
    }
}
