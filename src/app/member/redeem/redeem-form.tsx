"use client";

import { Gift } from "lucide-react";
import { FormEvent, useState } from "react";

type Product = { id: string; name: string; price_points: number; stock: number };

export default function RedeemForm({ products, balance }: { products: Product[]; balance: number }) {
    const [type, setType] = useState<"cash" | "product">("cash");
    const [status, setStatus] = useState("");

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const body = Object.fromEntries(new FormData(form));
        const product = products.find((item) => item.id === body.product_id);
        const points = type === "product" ? product?.price_points : Number(body.points);
        setStatus("Mengirim...");
        const response = await fetch("/api/member/redeem", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, type, points, product_id: type === "product" ? body.product_id : undefined }),
        });
        const payload = await response.json();
        if (!response.ok) { setStatus(payload.error || "Pengajuan gagal."); return; }
        form.reset();
        setStatus("Pengajuan redeem terkirim dan menunggu review Admin.");
    };

    const cashRupiah = Math.floor(balance * 100);

    return (
        <form className="member-form" onSubmit={(event) => void submit(event)}>
            <p className="member-balance">Saldo saat ini: <b>{balance} poin</b> (Rp{cashRupiah.toLocaleString("id-ID")}) · <i>5.000 Poin = Rp500.000 Cash</i></p>
            <div className="member-form-grid">
                <label>Tipe redeem<select id="redeem-type" value={type} onChange={(event) => setType(event.target.value as "cash" | "product")}>
                    <option value="cash">Cash (5.000 Poin = Rp 500.000)</option>
                    <option value="product">Tukar produk</option>
                </select></label>
                {type === "cash" && <label>Jumlah poin<input id="redeem-points" name="points" type="number" min={5000} step={100} max={balance} required defaultValue={5000} placeholder="Minimal 5000 poin" /></label>}
                {type === "product" && <label>Produk<select id="redeem-product" name="product_id" required>
                    <option value="">Pilih produk</option>
                    {products.map((product) => <option key={product.id} value={product.id} disabled={product.price_points > balance}>{product.name} — {product.price_points} poin</option>)}
                </select></label>}
            </div>
            {type === "cash" && <div className="member-form-grid">
                <label>Rekening / e-wallet<input id="redeem-account" name="payout_account" required maxLength={120} placeholder="BCA 1234567890 / DANA 08xx" /></label>
                <label>Nama pemilik<input id="redeem-owner" name="payout_owner" required maxLength={80} placeholder="Nama sesuai rekening" /></label>
            </div>}
            <label>Catatan<textarea id="redeem-note" name="note" maxLength={500} rows={2} placeholder="Opsional" /></label>
            <div className="member-form-foot"><p role="status">{status}</p><button id="redeem-submit" type="submit"><Gift /> Ajukan redeem</button></div>
        </form>
    );
}
