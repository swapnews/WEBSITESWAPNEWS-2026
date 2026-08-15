import { NextResponse, type NextRequest } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/auth/get-profile";

function admin() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase Admin configuration missing");
    return createAdminClient(url, key, { auth: { persistSession: false } });
}
async function guard() {
    const profile = await getCurrentProfile();
    return profile?.role === "super_admin" ? profile : null;
}
function bodyValue(body: Record<string, unknown>, key: string) { return typeof body[key] === "string" ? body[key].trim() : ""; }

export async function GET() {
    if (!await guard()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const supabase = admin();
    const { data, error } = await supabase.from("profiles").select("id,email,full_name,role,is_member,wartawan_status,avatar_url,created_at").in("role", ["visitor", "wartawan"]).order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ users: data ?? [] });
}

export async function POST(request: NextRequest) {
    if (!await guard()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json() as Record<string, unknown>;
    const email = bodyValue(body, "email").toLowerCase(); const password = bodyValue(body, "password"); const full_name = bodyValue(body, "full_name"); const role = bodyValue(body, "role");
    if (!email || password.length < 8 || !full_name || !["visitor", "wartawan"].includes(role)) return NextResponse.json({ error: "Nama, email, role, dan password minimal 8 karakter wajib diisi" }, { status: 400 });
    const supabase = admin();
    const { data: auth, error: authError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
    if (authError || !auth.user) return NextResponse.json({ error: authError?.message || "Gagal membuat user" }, { status: 400 });
    const profile = { id: auth.user.id, email, full_name, role, is_member: true, ...(role === "wartawan" ? { wartawan_status: "approved" } : {}) };
    const { error } = await supabase.from("profiles").upsert(profile);
    if (error) { await supabase.auth.admin.deleteUser(auth.user.id); return NextResponse.json({ error: error.message }, { status: 400 }); }
    return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
    if (!await guard()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json() as Record<string, unknown>; const id = bodyValue(body, "id");
    if (!id) return NextResponse.json({ error: "ID user wajib diisi" }, { status: 400 });
    const supabase = admin(); const updates: Record<string, string | boolean> = {};
    const full_name = bodyValue(body, "full_name"); const email = bodyValue(body, "email").toLowerCase(); const role = bodyValue(body, "role"); const password = bodyValue(body, "password");
    if (full_name) updates.full_name = full_name; if (email) updates.email = email; if (["visitor", "wartawan"].includes(role)) { updates.role = role; updates.is_member = true; }
    if (Object.keys(updates).length) { const { error } = await supabase.from("profiles").update(updates).eq("id", id); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); }
    if (password) { if (password.length < 8) return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 }); const { error } = await supabase.auth.admin.updateUserById(id, { password, email: email || undefined }); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); }
    else if (email) { const { error } = await supabase.auth.admin.updateUserById(id, { email }); if (error) return NextResponse.json({ error: error.message }, { status: 400 }); }
    return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
    if (!await guard()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const id = new URL(request.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "ID user wajib diisi" }, { status: 400 });
    const { error } = await admin().auth.admin.deleteUser(id); if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
}
