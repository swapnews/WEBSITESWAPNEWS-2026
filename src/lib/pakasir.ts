const baseUrl = process.env.PAKASIR_BASE_URL || "https://app.pakasir.com";
const project = process.env.PAKASIR_PROJECT_SLUG;
const apiKey = process.env.PAKASIR_API_KEY;

function config() {
    if (!project || !apiKey) throw new Error("Konfigurasi PAKASIR belum lengkap.");
    return { project, apiKey };
}

export type PakasirPayment = {
    order_id: string;
    amount: number;
    project: string;
    status: string;
    payment_method?: string;
    completed_at?: string;
    payment_number?: string;
    payment_url?: string;
    qr_string?: string;
};

export async function createPakasirTransaction(orderId: string, amount: number, method = "qris") {
    const { project, apiKey } = config();
    const response = await fetch(`${baseUrl}/api/transactioncreate/${encodeURIComponent(method)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ project, order_id: orderId, amount, api_key: apiKey }),
        cache: "no-store",
    });
    const payload = await response.json() as PakasirPayment & { message?: string };
    if (!response.ok) throw new Error(payload.message || "Pakasir gagal membuat transaksi.");
    return payload;
}

export async function verifyPakasirPayment(orderId: string, amount: number) {
    const { project, apiKey } = config();
    const url = new URL(`${baseUrl}/api/transactiondetail`);
    url.searchParams.set("project", project);
    url.searchParams.set("order_id", orderId);
    url.searchParams.set("amount", String(amount));
    url.searchParams.set("api_key", apiKey);
    const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    const payload = await response.json() as PakasirPayment & { message?: string };
    if (!response.ok) throw new Error(payload.message || "Status transaksi Pakasir gagal diverifikasi.");
    if (payload.order_id !== orderId || Number(payload.amount) !== amount || payload.project !== project) {
        throw new Error("Data transaksi Pakasir tidak cocok.");
    }
    return payload;
}

export function isCompletedPayment(payment: PakasirPayment) {
    return ["completed", "paid", "success"].includes(payment.status.toLowerCase());
}
