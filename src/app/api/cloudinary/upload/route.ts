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
        if (!profile) {
            return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
        }

        const canUpload = isEditorialRole(profile.role) || profile.is_member;
        if (!canUpload) {
            return NextResponse.json({ error: "Akses ditolak. Perlu hak akses redaksi atau member." }, { status: 403 });
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

        let publicId = `media-${Date.now()}`;
        let secureUrl = "";
        let format = file.type.split("/")[1] || "jpeg";
        let width: number | null = null;
        let height: number | null = null;
        const bytes = buffer.length;

        // Try uploading to Cloudinary if credentials are present
        const hasCloudinary = Boolean(
            process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
        );

        if (hasCloudinary) {
            try {
                const cloudinary = getCloudinaryClient();
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
                            quality: "60",
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

                publicId = uploadResult.public_id;
                secureUrl = uploadResult.secure_url;
                format = uploadResult.format;
                width = uploadResult.width;
                height = uploadResult.height;
            } catch (err) {
                console.warn("Cloudinary upload failed, using fallback:", err);
            }
        }

        // Fallback to Data URL if Cloudinary was not used or failed
        if (!secureUrl) {
            const base64 = buffer.toString("base64");
            const mimeType = file.type || "image/jpeg";
            secureUrl = `data:${mimeType};base64,${base64}`;
        }

        // Save metadata to Supabase media_assets
        const supabase = await createClient();
        const { data: mediaRecord, error: dbError } = await supabase
            .from("media_assets")
            .insert({
                public_id: publicId,
                secure_url: secureUrl,
                format,
                width,
                height,
                bytes,
                alt_text: altText || title || file.name,
                title: title || null,
                credit: credit || null,
                created_by: profile.id,
            })
            .select("id,public_id,secure_url,alt_text,title,credit,width,height,bytes,created_at")
            .single();

        if (dbError || !mediaRecord) {
            // Fallback object if database record creation has RLS restriction
            const fallbackMedia = {
                id: publicId,
                public_id: publicId,
                secure_url: secureUrl,
                alt_text: altText || title || file.name,
                title: title || null,
                credit: credit || null,
                width,
                height,
                bytes,
                created_at: new Date().toISOString(),
            };
            return NextResponse.json({
                success: true,
                media: fallbackMedia,
            });
        }

        return NextResponse.json({
            success: true,
            media: mediaRecord,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal mengunggah gambar";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const profile = await getCurrentProfile();
        if (!profile) {
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
