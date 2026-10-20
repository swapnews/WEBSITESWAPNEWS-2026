export type ModuleSettings = {
    module_type?: "content" | "ads";
    html_content?: string;
    desktop_height?: number;
    mobile_height?: number;
};

export type HomepageModule = {
    id?: string;
    section_key: string;
    title: string;
    is_enabled: boolean;
    sort_order: number;
    style_variant: string;
    category_slug: string | null;
    settings?: ModuleSettings;
};

export const HOMEPAGE_MODULES: HomepageModule[] = [
    { section_key: "topics", title: "Pilihan Kanal", is_enabled: true, sort_order: 10, style_variant: "compact", category_slug: null },
    { section_key: "reels", title: "Reels Pilihan", is_enabled: true, sort_order: 20, style_variant: "carousel", category_slug: null },
    { section_key: "ads_1", title: "Iklan Tengah 1", is_enabled: false, sort_order: 30, style_variant: "default", category_slug: null, settings: { module_type: "ads", html_content: "", desktop_height: 250, mobile_height: 250 } },
    { section_key: "games", title: "Games Arena", is_enabled: true, sort_order: 40, style_variant: "arena", category_slug: "games" },
    { section_key: "sports", title: "Sports Focus", is_enabled: true, sort_order: 50, style_variant: "scoreboard", category_slug: "sport" },
    { section_key: "bali", title: "Bali Kini", is_enabled: true, sort_order: 60, style_variant: "mosaic", category_slug: "bali" },
    { section_key: "ads_2", title: "Iklan Tengah 2", is_enabled: false, sort_order: 70, style_variant: "default", category_slug: null, settings: { module_type: "ads", html_content: "", desktop_height: 250, mobile_height: 250 } },
    { section_key: "psychology", title: "Ruang Psikologi", is_enabled: true, sort_order: 80, style_variant: "mosaic", category_slug: "psikologi" },
    { section_key: "latest", title: "Berita Terkini", is_enabled: true, sort_order: 90, style_variant: "editorial", category_slug: null },
    { section_key: "channel", title: "Kanal Pilihan", is_enabled: false, sort_order: 100, style_variant: "editorial", category_slug: "nasional" },
];

export function isAdModule(module: Pick<HomepageModule, "section_key">) {
    return module.section_key === "ads_1" || module.section_key === "ads_2";
}

// Merge without overwriting saved titles/toggles. Old six-module order becomes
// ten-slot order once; user-defined orders remain authoritative afterwards.
export function mergeHomepageModules(rows: HomepageModule[]): HomepageModule[] {
    const legacy = rows.length > 0 && rows.length <= 6 && rows.every((row) =>
        ["topics", "reels", "games", "sports", "bali", "latest"].includes(row.section_key)
        && row.sort_order === ({ topics: 10, reels: 20, games: 30, sports: 40, bali: 50, latest: 60 } as Record<string, number>)[row.section_key]);
    return HOMEPAGE_MODULES.map((defaults) => {
        const saved = rows.find((row) => row.section_key === defaults.section_key);
        return { ...defaults, ...saved, sort_order: legacy ? defaults.sort_order : saved?.sort_order ?? defaults.sort_order, settings: { ...defaults.settings, ...saved?.settings } };
    }).sort((a, b) => a.sort_order - b.sort_order || a.section_key.localeCompare(b.section_key));
}

export function moduleStyles(key: string) {
    if (key === "topics") return ["compact", "default"];
    if (key === "reels") return ["carousel"];
    if (key === "games") return ["arena", "editorial", "mosaic"];
    if (key === "sports") return ["scoreboard", "editorial", "mosaic"];
    if (key === "bali" || key === "psychology" || key === "channel") return ["mosaic", "editorial"];
    return ["editorial", "mosaic"];
}
