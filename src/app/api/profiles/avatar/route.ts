import { NextResponse, type NextRequest } from "next/server";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
    const { avatar_url } = (await request.json()) as { avatar_url?: string };
    if (!avatar_url || typeof avatar_url !== "string") {
        return NextResponse.json({ error: "URL avatar tidak valid" }, { status: 400 });
    }
    try {
        const parsed = new URL(avatar_url);
        if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") {
            return NextResponse.json({ error: "Avatar harus berasal dari Cloudinary" }, { status: 400 });
        }
    } catch {
        return NextResponse.json({ error: "URL avatar tidak valid" }, { status: 400 });
    }
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").update({ avatar_url }).eq("id", profile.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, avatar_url });
}
