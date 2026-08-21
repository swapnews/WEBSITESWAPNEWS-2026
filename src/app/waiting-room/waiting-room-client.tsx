"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Clock3, LoaderCircle, RefreshCw, ShieldCheck, Users } from "lucide-react";

import type { WaitingRoomStatus } from "@/lib/waiting-room/types";

type WaitingRoomClientProps = { nextPath: string };

type QueueView = {
    estimatedWaitSeconds: number | null;
    position: number | null;
    unavailable: boolean;
};

const INITIAL_VIEW: QueueView = { estimatedWaitSeconds: null, position: null, unavailable: false };

function waitLabel(seconds: number | null) {
    if (seconds === null) return "Menghitung waktu tunggu";
    if (seconds < 60) return `Sekitar ${seconds} detik`;
    return `Sekitar ${Math.ceil(seconds / 60)} menit`;
}

export function WaitingRoomClient({ nextPath }: WaitingRoomClientProps) {
    const [queue, setQueue] = useState(INITIAL_VIEW);
    const [requestKey, setRequestKey] = useState(0);

    const checkStatus = useCallback(async (signal?: AbortSignal) => {
        try {
            const response = await fetch("/api/waiting-room/status", {
                cache: "no-store",
                credentials: "same-origin",
                signal,
            });
            const result = await response.json() as WaitingRoomStatus | { error: string };

            if ("error" in result) throw new Error(result.error);
            if (result.status === "admitted") {
                window.location.replace(nextPath);
                return;
            }
            if (result.status === "queued") {
                setQueue({
                    estimatedWaitSeconds: result.estimatedWaitSeconds,
                    position: result.position,
                    unavailable: false,
                });
                return;
            }
            setQueue((current) => ({ ...current, unavailable: true }));
        } catch (error) {
            if ((error as Error).name !== "AbortError") {
                console.error("Waiting room status failed", error);
                setQueue((current) => ({ ...current, unavailable: true }));
            }
        }
    }, [nextPath]);

    useEffect(() => {
        const controller = new AbortController();
        const initialCheck = window.setTimeout(() => void checkStatus(controller.signal), 0);
        const interval = window.setInterval(() => void checkStatus(controller.signal), 3_000);
        return () => {
            controller.abort();
            window.clearTimeout(initialCheck);
            window.clearInterval(interval);
        };
    }, [checkStatus, requestKey]);

    return (
        <main className="waiting-room-shell">
            <div className="waiting-room-ambient" aria-hidden="true" />
            <section className="waiting-room-card" aria-live="polite">
                <div className="waiting-room-brand">
                    <Image src="/swapnews-logo-accent.png" alt="SwapNews" width={226} height={66} priority />
                    <span><ShieldCheck size={14} /> TRAFFIC PROTECTION ACTIVE</span>
                </div>

                {queue.unavailable ? (
                    <>
                        <h1>Koneksi antrean sedang dipulihkan.</h1>
                        <p>Posisi Anda tetap aman. Jangan tutup halaman ini.</p>
                        <button id="waiting-room-retry" type="button" onClick={() => {
                            setQueue((current) => ({ ...current, unavailable: false }));
                            setRequestKey((value) => value + 1);
                        }}>
                            <RefreshCw size={17} /> Coba Hubungkan Lagi
                        </button>
                    </>
                ) : (
                    <>
                        <div className="waiting-room-pulse" aria-hidden="true">
                            <LoaderCircle size={30} />
                        </div>
                        <span className="waiting-room-kicker">LONJAKAN PEMBACA TERDETEKSI</span>
                        <h1>Berita tetap cepat.<br />Anda masuk antrean.</h1>
                        <p>Kami membatasi pengunjung aktif sementara agar SwapNews tetap stabil untuk semua pembaca.</p>

                        <div className="waiting-room-stats">
                            <div>
                                <Users size={19} />
                                <span>Posisi antrean</span>
                                <strong>{queue.position ?? "—"}</strong>
                            </div>
                            <div>
                                <Clock3 size={19} />
                                <span>Estimasi masuk</span>
                                <strong>{waitLabel(queue.estimatedWaitSeconds)}</strong>
                            </div>
                        </div>

                        <div className="waiting-room-progress" aria-hidden="true"><span /></div>
                        <small>Halaman memperbarui otomatis setiap 3 detik. Jangan refresh agar posisi tetap terjaga.</small>
                    </>
                )}
            </section>
        </main>
    );
}
