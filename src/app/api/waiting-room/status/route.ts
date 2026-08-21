import { type NextRequest, NextResponse } from "next/server";

import { getWaitingRoomConfig } from "@/lib/waiting-room/config";
import { admissionCookieOptions, identityCookieOptions } from "@/lib/waiting-room/cookies";
import { resolveWaitingRoomStatus } from "@/lib/waiting-room/service";
import { createAdmissionToken } from "@/lib/waiting-room/token";
import {
    WAITING_ROOM_ADMISSION_COOKIE,
    WAITING_ROOM_ID_COOKIE,
} from "@/lib/waiting-room/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const config = getWaitingRoomConfig();
    const userId = request.cookies.get(WAITING_ROOM_ID_COOKIE)?.value;

    if (!config.enabled) return NextResponse.json({ status: "admitted" });
    if (!userId) return NextResponse.json({ error: "Queue identity missing" }, { status: 400 });

    const status = await resolveWaitingRoomStatus(userId, config, "status route");
    const response = NextResponse.json(status, {
        headers: { "Cache-Control": "no-store" },
        status: status.status === "unavailable" ? 503 : 200,
    });

    response.cookies.set(WAITING_ROOM_ID_COOKIE, userId, identityCookieOptions(config));
    if (status.status === "admitted") {
        response.cookies.set(
            WAITING_ROOM_ADMISSION_COOKIE,
            createAdmissionToken(userId, config),
            admissionCookieOptions(config),
        );
    }

    return response;
}
