"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { isEditorialRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { REVIEW_BASE_PATH, UUID_PATTERN, reviewFormInput, reviewErrorMessage } from "@/lib/editorial-review";

export async function reviewMemberArticleAction(formData: FormData) {
    const profile = await getCurrentProfile();
    if (!profile || !isEditorialRole(profile.role)) redirect("/panelswap");
    const input = reviewFormInput(formData);
    const rawId = String(formData.get("id") ?? "");
    const returnPath = UUID_PATTERN.test(rawId) ? `${REVIEW_BASE_PATH}/${rawId}` : REVIEW_BASE_PATH;
    if (!input) redirect(`${returnPath}?error=${encodeURIComponent("Keputusan tidak valid. Catatan wajib untuk revisi/penolakan; maksimal 2.000 karakter.")}`);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("review_article", {
        p_article_id: input.id, p_decision: input.decision, p_expected_version: input.version, p_note: input.note,
    });
    if (error) {
        console.error("review_article failed", { code: error.code, articleId: input.id });
        redirect(`${returnPath}?error=${encodeURIComponent(reviewErrorMessage(error.message, error.code))}`);
    }
    revalidatePath(REVIEW_BASE_PATH);
    revalidatePath(returnPath);
    revalidatePath("/dashboard/wartawan");
    revalidatePath("/dashboard/articles");
    revalidatePath(`/dashboard/articles/${input.id}`);
    revalidatePath("/member");
    revalidatePath("/member/points");
    revalidateTag("home-data", "max");
    revalidateTag("articles", "max");
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    if (data && typeof data === "object" && typeof data.slug === "string") {
        revalidateTag(`article-${data.slug}`, "max");
        revalidatePath(`/${data.slug}`);
    }
    const { data: category } = await supabase.from("articles").select("category:categories(slug)").eq("id", input.id).maybeSingle();
    const channel = Array.isArray(category?.category) ? category.category[0] : category?.category;
    if (channel?.slug) { revalidateTag(`channel-${channel.slug}`, "max"); revalidatePath(`/kanal/${channel.slug}`); }
    redirect(`${REVIEW_BASE_PATH}?success=${encodeURIComponent("Keputusan review tersimpan. Poin persetujuan maksimal sekali per artikel.")}`);
}

// Old one-click approval now opens full content; never writes review metadata.
export async function markArticleReviewedAction(formData: FormData) {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin") redirect("/dashboard");
    const id = String(formData.get("id") ?? "");
    redirect(UUID_PATTERN.test(id) ? `${REVIEW_BASE_PATH}/${id}` : REVIEW_BASE_PATH);
}
