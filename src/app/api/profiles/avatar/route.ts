import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getCloudinaryClient } from "@/lib/cloudinary";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const MAX_BYTES = 3 * 1024 * 1024;

function isImage(buffer: Buffer, mime: string) {
    if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mime === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    return mime === "image/webp" && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
}

export async function POST(request: NextRequest) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
        return NextResponse.json({ error: "Permintaan tidak diizinkan." }, { status: 403 });
    }
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Sesi berakhir. Silakan login kembali." }, { status: 401 });
    if (Number(request.headers.get("content-length")) > MAX_BYTES + 64 * 1024) {
        return NextResponse.json({ error: "Foto terlalu besar. Maksimal 3 MB setelah optimasi." }, { status: 413 });
    }
    let file: FormDataEntryValue | null;
    try {
        file = (await request.formData()).get("file");
    } catch {
        return NextResponse.json({ error: "Data unggahan tidak valid. Pilih ulang foto." }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_BYTES) {
        return NextResponse.json({ error: "Pilih foto JPG, PNG, atau WebP berukuran maksimal 3 MB." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isImage(buffer, file.type)) {
        return NextResponse.json({ error: "Isi file bukan gambar JPG, PNG, atau WebP yang valid." }, { status: 400 });
    }

    let cloudinary: ReturnType<typeof getCloudinaryClient>;
    try {
        cloudinary = getCloudinaryClient();
    } catch {
        return NextResponse.json({ error: "Penyimpanan foto belum dikonfigurasi. Hubungi admin." }, { status: 503 });
    }
    let uploaded: { public_id: string; secure_url: string };
    try {
        uploaded = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                folder: `swapnews/avatars/${profile.id}`,
                public_id: randomUUID(),
                resource_type: "image",
                format: "webp",
                transformation: [{ width: 512, height: 512, crop: "fill", gravity: "auto", quality: "auto:good" }],
                timeout: 45000,
            }, (error, result) => {
                if (error || !result) reject(error ?? new Error("Upload failed"));
                else resolve({ public_id: result.public_id, secure_url: result.secure_url });
            });
            stream.end(buffer);
        });
    } catch {
        return NextResponse.json({ error: "Cloudinary belum dapat menerima foto. Coba lagi atau hubungi admin jika berulang." }, { status: 502 });
    }
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles")
        .update({ avatar_url: uploaded.secure_url }).eq("id", profile.id).select("id,avatar_url").single();
    if (error || !data?.avatar_url) {
        await cloudinary.uploader.destroy(uploaded.public_id).catch(() => undefined);
        return NextResponse.json({ error: "Foto belum tersimpan di profil. Coba lagi; jika tetap gagal, minta admin memeriksa izin profil." }, { status: 500 });
    }
    revalidatePath("/profile");
    revalidatePath("/dashboard/wartawan/workspace");
    revalidatePath("/dashboard");
    return NextResponse.json({ success: true, avatar_url: data.avatar_url });
}

