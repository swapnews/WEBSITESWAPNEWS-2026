"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { sanitizeAdHtml } from "@/lib/article-insertions";
import { createClient } from "@/lib/supabase/server";

const numberField = (form: FormData, key: string, fallback: number) => Math.min(20, Math.max(1, Number(form.get(key)) || fallback));

export async function saveArticleInsertionsAction(form: FormData) {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "super_admin") redirect("/dashboard");
    const supabase = await createClient();
    const payload = {
        id: true,
        read_also_enabled: form.get("read_also_enabled") === "on",
        read_also_paragraph: numberField(form, "read_also_paragraph", 2),
        read_also_label: String(form.get("read_also_label") || "BACA JUGA").trim().slice(0, 50),
        product_enabled: form.get("product_enabled") === "on",
        product_paragraph: numberField(form, "product_paragraph", 3),
        product_id: String(form.get("product_id") || "") || null,
        ad_enabled: form.get("ad_enabled") === "on",
        ad_paragraph: numberField(form, "ad_paragraph", 4),
        ad_html: sanitizeAdHtml(String(form.get("ad_html") || "")).slice(0, 20000),
        copy_message: String(form.get("copy_message") || "").trim().slice(0, 500),
        updated_by: profile.id,
    };
    const { error } = await supabase.from("article_insertion_settings").upsert(payload);
    if (error) redirect(`/dashboard/article-insertions?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/", "layout");
    redirect("/dashboard/article-insertions?success=Pengaturan tersimpan");
}
