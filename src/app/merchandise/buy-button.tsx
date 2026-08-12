"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BuyButton({ productId, points, isMember }: { productId: string; points: number; isMember: boolean }) {
    const router = useRouter();
    const [status, setStatus] = useState("");

    const buyRupiah = async () => {
        setStatus("Membuat pembayaran...");
        const response = await fetch("/api/pakasir/checkout", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "product", product_id: productId, quantity: 1 }),
        });
        const payload = await response.json();
        if (response.status === 401) { router.push("/panelswap?redirect=/merchandise"); return; }
        if (!response.ok) { setStatus(payload.error || "Checkout gagal."); return; }
        if (payload.payment?.payment_url) { window.location.href = payload.payment.payment_url; return; }
        setStatus("Transaksi dibuat. Selesaikan pembayaran sesuai instruksi Pakasir.");
    };

    return (
        <div className="product-actions">
            <button id="buy-rupiah" onClick={() => void buyRupiah()}><ShoppingBag /> Beli sekarang</button>
            {isMember && <Link id="redeem-product" href="/member/redeem">Tukar {points} poin</Link>}
            <p role="status">{status}</p>
        </div>
    );
}
