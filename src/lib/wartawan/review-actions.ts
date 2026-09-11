"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getCurrentProfile } from "@/lib/auth/get-profile";
// Request-scoped client: mark_article_reviewed relies on auth.uid(), so it must
// run as the signed-in Super Admin, not as the service role.
import { createClient } from "@/lib/supabase/server";

function adminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase service role configuration");
    return createAdminClient(url, key, { auth: { persistSession: false } });
}

export async function reviewMemberArticleAction(formData: FormData) {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "wartawan") redirect("/panelswap");
    const id = String(formData.get("id") || "");
    const decision = String(formData.get("decision") || "");
    const note = String(formData.get("note") || "").trim().slice(0, 2000);
    if (!id || !["published", "revision", "rejected"].includes(decision)) redirect("/dashboard/wartawan?error=Review%20tidak%20valid");
    if (["revision", "rejected"].includes(decision) && !note) redirect("/dashboard/wartawan?error=Catatan%20wajib%20untuk%20revisi%20atau%20penolakan");
    const supabase = adminClient();
    const { data: article } = await supabase.from("articles").select("id,status,author_id").eq("id", id).eq("status", "in_review").maybeSingle();
    if (!article) redirect("/dashboard/wartawan?error=Artikel%20sudah%20diproses%20atau%20tidak%20ditemukan");
    const updates: Record<string, unknown> = { status: decision, reviewed_by: profile.id, reviewed_at: new Date().toISOString() };
    if (decision === "published") updates.published_at = new Date().toISOString();
    const { error } = await supabase.from("articles").update(updates).eq("id", id).eq("status", "in_review");
    if (error) redirect(`/dashboard/wartawan?error=${encodeURIComponent(error.message)}`);
    if (note) await supabase.from("editorial_notes").insert({ article_id: id, author_id: profile.id, note });
    if (decision === "published") await supabase.rpc("award_article_points", { p_article_id: id, p_points: 5, p_reviewer_id: profile.id });
    revalidatePath("/dashboard/wartawan");
    revalidatePath("/dashboard/articles");
    redirect("/dashboard/wartawan?success=Review%20artikel%20berhasil%20disimpan");
}

/**
 * Super Admin confirms a live article. Uses the `mark_article_reviewed` RPC so
 * the permission check lives in the database, and only revalidates dashboard
 * routes because the public page content is unchanged.
 */
export async function markArticleReviewedAction(formData: FormData) {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin") redirect("/dashboard?error=Akses%20khusus%20Super%20Admin");

    const id = String(formData.get("id") || "");
    if (!id) redirect("/dashboard/wartawan?tab=pasca-review&error=Artikel%20tidak%20valid");

    const supabase = await createClient();
    const { error } = await supabase.rpc("mark_article_reviewed", { p_article_id: id });
    if (error) redirect(`/dashboard/wartawan?tab=pasca-review&error=${encodeURIComponent(error.message)}`);

    revalidatePath("/dashboard/wartawan");
    redirect("/dashboard/wartawan?tab=pasca-review&success=Artikel%20ditandai%20sudah%20direview");
}

