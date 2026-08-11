import { NextResponse, type NextRequest } from "next/server";

import { getCloudinaryConfig, getCloudinaryClient } from "@/lib/cloudinary";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isEditorialRole } from "@/lib/auth/roles";

export async function POST(request: NextRequest) {
    try {
        const profile = await getCurrentProfile();
        if (!profile || !isEditorialRole(profile.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = (await request.json()) as { folder?: string; public_id?: string };
        const folder = body.folder?.trim() || "swapnews/media";
        const publicId = body.public_id?.trim();
        const timestamp = Math.round(Date.now() / 1000);
        const config = getCloudinaryConfig();
        const cloudinary = getCloudinaryClient();

        const paramsToSign: Record<string, string | number> = {
            folder,
            timestamp,
        };
        if (publicId) paramsToSign.public_id = publicId;

        const signature = cloudinary.utils.api_sign_request(paramsToSign, config.apiSecret);

        return NextResponse.json({
            cloudName: config.cloudName,
            apiKey: config.apiKey,
            timestamp,
            folder,
            signature,
            publicId,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
