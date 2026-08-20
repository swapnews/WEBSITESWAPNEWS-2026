"use client";

import { Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MembershipCheckoutButton() {
    const router = useRouter();
    const [status, setStatus] = useState("");

    const checkout = async () => {
        setStatus("Membuat pembayaran...");
        const response = await fetch("/api/pakasir/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "membership" }),
        });
        const payload = await response.json();
        if (response.status === 401) { router.push("/panelswap?redirect=/membership"); return; }
        if (!response.ok) { setStatus(payload.error || "Checkout gagal."); return; }
        const target = payload.payment?.payment_url || payload.payment?.payment_number;
        if (target && payload.payment?.payment_url) { window.location.href = payload.payment.payment_url; return; }
        setStatus("Transaksi dibuat. Selesaikan pembayaran sesuai instruksi Pakasir.");
    };

    return (
        <div className="membership-checkout">
            <button id="membership-checkout" onClick={() => void checkout()}><Crown /> Langganan sekarang</button>
            <p role="status">{status}</p>
        </div>
    );
}
