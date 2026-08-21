import { createHmac, timingSafeEqual } from "node:crypto";

import type { WaitingRoomConfig } from "./types";

const TOKEN_VERSION = "v1";

type TokenPayload = { exp: number; sub: string };
export type VerifiedAdmission = { expiresAt: number; userId: string };

function sign(payload: string, secret: string) {
    return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdmissionToken(userId: string, config: WaitingRoomConfig, now = Date.now()) {
    const encoded = Buffer.from(JSON.stringify({
        exp: now + config.sessionTtlSeconds * 1000,
        sub: userId,
    } satisfies TokenPayload)).toString("base64url");

    return `${TOKEN_VERSION}.${encoded}.${sign(encoded, config.tokenSecret)}`;
}

export function verifyAdmissionToken(token: string | null | undefined, config: WaitingRoomConfig, now = Date.now()): VerifiedAdmission | null {
    if (!token || !config.tokenSecret) return null;

    const [version, encoded, signature] = token.split(".");
    if (version !== TOKEN_VERSION || !encoded || !signature) return null;

    try {
        const expected = Buffer.from(sign(encoded, config.tokenSecret), "base64url");
        const provided = Buffer.from(signature, "base64url");
        if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

        const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<TokenPayload>;
        if (typeof payload.sub !== "string" || typeof payload.exp !== "number" || payload.exp <= now) return null;

        return { expiresAt: payload.exp, userId: payload.sub };
    } catch {
        return null;
    }
}
