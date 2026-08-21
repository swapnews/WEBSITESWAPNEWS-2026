export type AdmissionResult =
    | { status: "admitted" }
    | { status: "already_active" }
    | { status: "queued"; position: number };

export type WaitingRoomStatus =
    | { status: "admitted" }
    | { status: "queued"; position: number; estimatedWaitSeconds: number }
    | { status: "unavailable" };

export type WaitingRoomConfig = {
    capacity: number;
    enabled: boolean;
    failOpen: boolean;
    namespace: string;
    queueTtlSeconds: number;
    sessionTtlSeconds: number;
    tokenSecret: string;
    redisUrl: string;
    redisToken: string;
};

export interface WaitingRoomProvider {
    renewSession(userId: string): Promise<void>;
    tryAdmit(userId: string): Promise<AdmissionResult>;
}

export const WAITING_ROOM_ID_COOKIE = "__swap_wr_id";
export const WAITING_ROOM_ADMISSION_COOKIE = "__swap_wr_admission";
