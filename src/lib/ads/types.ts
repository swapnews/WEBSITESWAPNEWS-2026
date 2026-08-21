export const AD_SLOT_KEYS = [
    "global_header_leaderboard",
    "home_after_hero_billboard",
    "home_sidebar_rectangle",
    "home_after_topics_leaderboard",
    "home_midfeed_billboard",
    "article_top_leaderboard",
    "article_inline_rectangle",
    "article_sidebar_halfpage",
    "article_bottom_leaderboard",
    "global_footer_leaderboard",
] as const;

export type AdSlotKey = (typeof AD_SLOT_KEYS)[number];
export type AdContentType = "html" | "youtube";

export type AdSlot = {
    id: string;
    slot_key: AdSlotKey;
    name: string;
    placement: string;
    desktop_width: number;
    desktop_height: number;
    mobile_width: number;
    mobile_height: number;
    content_type: AdContentType;
    html_content: string;
    youtube_url: string | null;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    updated_at: string;
};

export const AD_SLOT_COLUMNS = "id,slot_key,name,placement,desktop_width,desktop_height,mobile_width,mobile_height,content_type,html_content,youtube_url,is_active,starts_at,ends_at,updated_at";

export function isAdSlotKey(value: string): value is AdSlotKey {
    return (AD_SLOT_KEYS as readonly string[]).includes(value);
}

export function toAdSlotMap(slots: AdSlot[]): Partial<Record<AdSlotKey, AdSlot>> {
    return Object.fromEntries(slots.map((slot) => [slot.slot_key, slot])) as Partial<Record<AdSlotKey, AdSlot>>;
}
