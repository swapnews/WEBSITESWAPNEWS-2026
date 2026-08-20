import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const requestedNext = requestUrl.searchParams.get("next") ?? "/dashboard";
    const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard";

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) await supabase.from("profiles").update({ email: user.email }).eq("id", user.id);
        }
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
}

