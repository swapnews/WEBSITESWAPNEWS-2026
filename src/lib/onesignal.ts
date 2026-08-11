const appId = process.env.ONESIGNAL_APP_ID;
const restKey = process.env.ONESIGNAL_REST_API_KEY;
const baseUrl = process.env.ONESIGNAL_BASE_URL || "https://api.onesignal.com";

function config() {
    if (!appId || !restKey) throw new Error("Konfigurasi OneSignal belum lengkap.");
    return { appId, restKey };
}

export type PushPayload = {
    title: string;
    message: string;
    url: string;
    categoryId?: number | null;
};

export async function sendManualPush(payload: PushPayload) {
    const { appId, restKey } = config();
    const body: Record<string, unknown> = {
        app_id: appId,
        headings: { en: payload.title, id: payload.title },
        contents: { en: payload.message, id: payload.message },
        url: payload.url,
        target_channel: "push",
    };
    if (payload.categoryId) {
        body.filters = [{ field: "tag", key: `category_${payload.categoryId}`, relation: "=", value: "1" }];
    } else {
        body.included_segments = ["Subscribed Users"];
    }

    const response = await fetch(`${baseUrl}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Key ${restKey}` },
        body: JSON.stringify(body),
        cache: "no-store",
    });
    const result = await response.json() as { id?: string; recipients?: number; errors?: unknown };
    if (!response.ok || !result.id) throw new Error(typeof result.errors === "string" ? result.errors : "OneSignal gagal mengirim notifikasi.");
    return result;
}
