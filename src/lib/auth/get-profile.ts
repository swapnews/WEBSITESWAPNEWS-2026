import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "./roles";

export type Profile = {
    id: string;
    email: string;
    full_name: string | null;
    role: AppRole;
    is_member: boolean;
    avatar_url: string | null;
};

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,role,is_member,avatar_url")
        .eq("id", user.id)
        .single();

    if (error || !data) return null;
    return data as Profile;
});
