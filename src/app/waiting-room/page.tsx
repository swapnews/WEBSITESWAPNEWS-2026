import type { Metadata } from "next";

import { safeNextPath } from "@/lib/waiting-room/cookies";
import { WaitingRoomClient } from "./waiting-room-client";

export const metadata: Metadata = {
    title: "Ruang Tunggu | SwapNews",
    description: "Ruang tunggu otomatis SwapNews saat terjadi lonjakan pembaca.",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type WaitingRoomPageProps = {
    searchParams: Promise<{ next?: string }>;
};

export default async function WaitingRoomPage({ searchParams }: WaitingRoomPageProps) {
    const params = await searchParams;
    return <WaitingRoomClient nextPath={safeNextPath(params.next)} />;
}
