import { permanentRedirect } from "next/navigation";

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export default async function LegacyArticleRedirect({ params }: Props) {
    const { slug } = await params;
    permanentRedirect(`/${slug}`);
}
