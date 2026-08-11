import { NextResponse, type NextRequest } from "next/server";

import { getCloudinaryClient } from "@/lib/cloudinary";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isEditorialRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function escapeSearchTerm(value: string) {
    return value.replace(/[\\%_(),."']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function POST(request: NextRequest) {
    try {
        const profile = await getCurrentProfile();
        if (!profile || !isEditorialRole(profile.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const altText = (formData.get("alt_text") as string) || "";
        const title = (formData.get("title") as string) || file?.name || "";
        const credit = (formData.get("credit") as string) || "";

        if (!file) {
            return NextResponse.json({ error: "File gambar tidak ditemukan" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const cloudinary = getCloudinaryClient();

        // Upload to Cloudinary with WebP conversion & quality 60 (40% compression)
        const uploadResult = await new Promise<{
            public_id: string;
            secure_url: string;
            format: string;
            width: number;
            height: number;
            bytes: number;
        }>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "swapnews/media",
                    format: "webp",
                    quality: "60", // 40% compression / 60% quality
                    transformation: [{ fetch_format: "webp", quality: "60" }],
                },
                (error, result) => {
                    if (error || !result) {
                        reject(error || new Error("Gagal mengunggah ke Cloudinary"));
                    } else {
                        resolve({
                            public_id: result.public_id,
                            secure_url: result.secure_url,
                            format: result.format,
                            width: result.width,
                            height: result.height,
                            bytes: result.bytes,
                        });
                    }
                },
            );
            uploadStream.end(buffer);
        });

        // Save metadata to Supabase media_assets
        const supabase = await createClient();
        const { data: mediaRecord, error: dbError } = await supabase
            .from("media_assets")
            .insert({
                public_id: uploadResult.public_id,
                secure_url: uploadResult.secure_url,
                format: uploadResult.format,
                width: uploadResult.width,
                height: uploadResult.height,
                bytes: uploadResult.bytes,
                alt_text: altText || title || file.name,
                title: title || null,
                credit: credit || null,
                created_by: profile.id,
            })
            .select("id,public_id,secure_url,alt_text,title,credit,width,height,bytes,created_at")
            .single();

        if (dbError || !mediaRecord) {
            return NextResponse.json({ error: dbError?.message || "Gagal menyimpan metadata media" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            media: mediaRecord,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const profile = await getCurrentProfile();
        if (!profile || !isEditorialRole(profile.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const search = escapeSearchTerm(request.nextUrl.searchParams.get("search") ?? "");

        const supabase = await createClient();
        let query = supabase
            .from("media_assets")
            .select("id,public_id,secure_url,alt_text,title,credit,width,height,bytes,created_at")
            .order("created_at", { ascending: false })
            .limit(60);

        if (search) {
            query = query.or(`title.ilike.%${search}%,alt_text.ilike.%${search}%,public_id.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, media: data ?? [] });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
