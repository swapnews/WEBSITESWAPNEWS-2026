import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function LegacyArticleRedirect({ params }: Props) {
    const { slug } = await params;
    permanentRedirect(`/${slug}`);
}
