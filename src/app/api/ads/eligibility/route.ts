import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/get-profile";

export const dynamic = "force-dynamic";

export async function GET() {
    const profile = await getCurrentProfile();
    return NextResponse.json(
        { showAds: !profile?.is_member },
        {
            headers: {
                "Cache-Control": "private, no-store, max-age=0",
                Vary: "Cookie",
            },
        },
    );
}
