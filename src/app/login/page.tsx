import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type LoginPageProps = {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const params = await searchParams;
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
        if (typeof val === "string") query.set(key, val);
        else if (Array.isArray(val) && val[0]) query.set(key, val[0]);
    });

    const queryString = query.toString();
    redirect(`/panelswap${queryString ? `?${queryString}` : ""}`);
}
