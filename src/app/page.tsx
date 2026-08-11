import NewsPortal from "@/components/news-portal";
import { getPublicHomeData } from "@/lib/public-articles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getPublicHomeData();
  return <NewsPortal data={data} />;
}
