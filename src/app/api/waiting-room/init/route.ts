import { type NextRequest, NextResponse } from "next/server";

import { getWaitingRoomConfig } from "@/lib/waiting-room/config";
import {
    admissionCookieOptions,
    identityCookieOptions,
    safeNextPath,
    waitingRoomPath,
} from "@/lib/waiting-room/cookies";
import { resolveWaitingRoomStatus } from "@/lib/waiting-room/service";
import { createAdmissionToken } from "@/lib/waiting-room/token";
import {
    WAITING_ROOM_ADMISSION_COOKIE,
    WAITING_ROOM_ID_COOKIE,
} from "@/lib/waiting-room/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const config = getWaitingRoomConfig();
    const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));

    if (!config.enabled) return NextResponse.redirect(new URL(nextPath, request.url));

    const userId = request.cookies.get(WAITING_ROOM_ID_COOKIE)?.value ?? crypto.randomUUID();
    const status = await resolveWaitingRoomStatus(userId, config, "init route");
    const destination = status.status === "admitted" ? nextPath : waitingRoomPath(nextPath);
    const response = NextResponse.redirect(new URL(destination, request.url));

    response.cookies.set(WAITING_ROOM_ID_COOKIE, userId, identityCookieOptions(config));

    if (status.status === "admitted") {
        response.cookies.set(
            WAITING_ROOM_ADMISSION_COOKIE,
            createAdmissionToken(userId, config),
            admissionCookieOptions(config),
        );
    } else {
        response.cookies.set(WAITING_ROOM_ADMISSION_COOKIE, "", {
            ...admissionCookieOptions(config),
            maxAge: 0,
        });
    }

    return response;
}
