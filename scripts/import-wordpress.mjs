/**
 * WordPress SQL parser for SwapNews migration (dry-run).
 * Reads wp_posts, wp_postmeta, wp_terms, wp_term_taxonomy, wp_term_relationships, wp_users.
 * Streams the SQL file line by line; never loads the full 26 MB dump into memory.
 *
 * Usage: node scripts/import-wordpress.mjs [--dry-run] [--import] [--user=<author_id>]
 */

import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SQL_PATH = resolve(ROOT, "_import/u320663706_swp.sql");
const REPORT_PATH = resolve(ROOT, "_import/import-report.json");
const STAGING_PATH = resolve(ROOT, "_import/staging-articles.json");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RESERVED_SLUGS = new Set([
    "dashboard", "member", "membership", "merchandise", "login", "cari", "api",
    "artikel", "auth", "robots.txt", "sitemap.xml", "manifest.webmanifest", "news", "_next",
]);

function slugify(text, fallback = "artikel") {
    const decoded = String(text ?? "")
        .replace(/&amp;/gi, " and ")
        .replace(/&quot;|&#34;/gi, " ")
        .replace(/&#0*39;|&apos;/gi, " ")
        .replace(/&[a-z]+;|&#\d+;/gi, " ");
    const slug = decoded.toLowerCase().trim()
        .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 90)
        .replace(/-$/g, "");
    return slug || String(fallback).replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "artikel";
}

function stripShortcodes(html) {
    return html
        .replace(/\[\/?(?:caption|gallery|video|audio|embed|wp-caption)[^\]]*\]/gi, "")
        .replace(/\[(\w+)[^\]]*\]/g, "")
        .replace(/\[\/(\w+)\]/g, "");
}

function stripHtml(html) {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function excerptFrom(content, max = 170) {
    const clean = stripHtml(stripShortcodes(content));
    return clean.length > max ? clean.slice(0, max - 3).trim() + "..." : clean;
}

function readingTime(html) {
    const words = stripHtml(stripShortcodes(html)).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
}

/** Extract URL from a <img> tag or guid string */
function extractImageUrl(value) {
    if (!value) return null;
    // If it's a raw URL
    if (/^https?:\/\/\S+\.(jpe?g|png|gif|webp|svg)/i.test(value)) return value;
    // If it's an <img> tag
    const match = value.match(/src=["'](https?:\/\/[^"']+\.(jpe?g|png|gif|webp|svg)[^"']*)["']/i);
    return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// SQL streaming parser
// ---------------------------------------------------------------------------

class WpDumpParser {
    constructor() {
        this.tables = {
            wp_posts: [],
            wp_postmeta: [],
            wp_terms: [],
            wp_term_taxonomy: [],
            wp_term_relationships: [],
            wp_users: [],
        };
        this.currentTable = null;
        this.currentColumns = [];
        this.currentStatement = "";
        this.inValues = false;
        this.rowBuffer = "";
        this.stats = { parsedRows: 0, skippedTables: new Set() };
    }

    /** Parse a single SQL VALUES row like (1, 'text', NULL, '2025-01-01 00:00:00') */
    parseRow(rowStr) {
        const values = [];
        let current = "";
        let inString = false;
        let escape = false;
        let i = 1; // skip opening paren

        while (i < rowStr.length) {
            const ch = rowStr[i];
            if (escape) { current += ch; escape = false; i++; continue; }
            if (ch === "\\") { escape = true; i++; continue; }
            if (ch === "'" && !inString) { inString = true; i++; continue; }
            if (ch === "'" && inString) {
                if (i + 1 < rowStr.length && rowStr[i + 1] === "'") { current += "''"; i += 2; continue; }
                inString = false; i++; continue;
            }
            if (!inString && (ch === "," || ch === ")")) {
                values.push(this.parseValue(current.trim()));
                current = "";
                if (ch === ")") return values;
                i++; continue;
            }
            current += ch;
            i++;
        }
        return values;
    }

    parseValue(raw) {
        if (raw === "NULL") return null;
        if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1);
        if (raw === "true") return true;
        if (raw === "false") return false;
        const num = Number(raw);
        return Number.isNaN(num) ? raw : num;
    }

    /** Split a multi-row VALUES section into individual row strings */
    splitValues(section) {
        const rows = [];
        let depth = 0;
        let start = -1;
        for (let i = 0; i < section.length; i++) {
            const ch = section[i];
            if (ch === "(") { if (depth === 0) start = i; depth++; }
            else if (ch === ")") { depth--; if (depth === 0 && start >= 0) rows.push(section.slice(start, i + 1)); }
        }
        return rows;
    }

    async parse(filePath) {
        const stream = createReadStream(filePath, { encoding: "utf8" });
        const rl = createInterface({ input: stream, crlfDelay: Infinity });
        const insertRe = /^INSERT INTO `(\w+)` \(([^)]+)\) VALUES\s*$/;
        const createRe = /^CREATE TABLE `(\w+)`/;

        for await (const line of rl) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("--")) continue;

            // Detect table context from CREATE TABLE
            const createMatch = trimmed.match(createRe);
            if (createMatch) {
                this.currentTable = createMatch[1];
                this.inValues = false;
                this.currentStatement = "";
                continue;
            }

            // Detect INSERT INTO
            const insertMatch = trimmed.match(insertRe);
            if (insertMatch) {
                const tableName = insertMatch[1];
                if (!(tableName in this.tables)) {
                    this.stats.skippedTables.add(tableName);
                    this.currentTable = null;
                    this.inValues = false;
                    continue;
                }
                this.currentTable = tableName;
                this.currentColumns = insertMatch[2].split(",").map((c) => c.trim().replace(/`/g, ""));
                this.inValues = true;
                this.currentStatement = trimmed.slice(insertMatch[0].length);
                // Some dumps put VALUES on the same line
                if (this.currentStatement.trim().startsWith("(")) {
                    this.processValues(this.currentStatement.trim());
                    this.currentStatement = "";
                }
                continue;
            }

            if (this.inValues && this.currentTable) {
                this.currentStatement += trimmed;
                if (trimmed.endsWith(";")) {
                    this.processValues(this.currentStatement);
                    this.currentStatement = "";
                    this.inValues = false;
                    this.currentTable = null;
                } else if (trimmed.endsWith("),") || trimmed.endsWith(")")) {
                    this.processValues(trimmed);
                    this.currentStatement = "";
                }
            }
        }
        rl.close();
    }

    processValues(text) {
        const rows = this.splitValues(text);
        for (const rowStr of rows) {
            try {
                const values = this.parseRow(rowStr);
                if (values.length !== this.currentColumns.length) continue;
                const obj = {};
                this.currentColumns.forEach((col, i) => { obj[col] = values[i]; });
                this.tables[this.currentTable].push(obj);
                this.stats.parsedRows++;
            } catch { /* skip malformed row */ }
        }
    }
}

// ---------------------------------------------------------------------------
// Data transformation
// ---------------------------------------------------------------------------

function buildTaxonomy(terms, termTaxonomy, termRelationships) {
    const termMap = new Map(terms.map((t) => [t.term_id, t]));
    const taxMap = new Map(termTaxonomy.map((t) => [t.term_taxonomy_id, t]));
    const relMap = new Map();
    for (const rel of termRelationships) {
        if (!relMap.has(rel.object_id)) relMap.set(rel.object_id, []);
        relMap.get(rel.object_id).push(rel.term_taxonomy_id);
    }
    return { termMap, taxMap, relMap };
}

function getPostCategories(postId, relMap, taxMap, termMap) {
    const taxIds = relMap.get(postId) ?? [];
    const categories = [];
    for (const taxId of taxIds) {
        const tax = taxMap.get(taxId);
        if (tax?.taxonomy !== "category") continue;
        const term = termMap.get(tax.term_id);
        if (term) categories.push({ id: term.term_id, name: term.name, slug: term.slug });
    }
    return categories;
}

function getPostMeta(postId, postmeta) {
    const meta = {};
    for (const m of postmeta) {
        if (m.post_id !== postId) continue;
        meta[m.meta_key] = m.meta_value;
    }
    return meta;
}

function buildAttachmentMap(posts) {
    const map = new Map();
    for (const p of posts) {
        if (p.post_type === "attachment" && p.guid) {
            const url = extractImageUrl(p.guid);
            if (url) map.set(p.ID, { id: p.ID, url, title: p.post_title, alt: p.post_excerpt });
        }
    }
    return map;
}

function transformArticles(posts, postmeta, taxData, users, attachmentMap) {
    const userMap = new Map(users.map((u) => [u.ID, u]));
    const { termMap, taxMap, relMap } = taxData;
    const articles = [];
    const skipped = { notPost: 0, notPublished: 0, emptyTitle: 0, emptyContent: 0 };

    for (const post of posts) {
        if (post.post_type !== "post") { skipped.notPost++; continue; }
        if (post.post_status !== "publish" && post.post_status !== "draft") { skipped.notPublished++; continue; }
        const titleStr = typeof post.post_title === "string" ? post.post_title.trim() : String(post.post_title ?? "").trim();
        const contentStr = typeof post.post_content === "string" ? post.post_content.trim() : String(post.post_content ?? "").trim();
        if (!titleStr) { skipped.emptyTitle++; continue; }
        if (!contentStr) { skipped.emptyContent++; continue; }

        const meta = getPostMeta(post.ID, postmeta);
        const author = userMap.get(post.post_author);
        const categories = getPostCategories(post.ID, relMap, taxMap, termMap);
        const rawTitle = typeof post.post_title === "string" ? post.post_title.trim() : String(post.post_title ?? "").trim();
        const slug = slugify(post.post_name || rawTitle, `artikel-${post.ID}`);
        const cleanContent = stripShortcodes(contentStr);
        const rawExcerpt = typeof post.post_excerpt === "string" ? post.post_excerpt.trim() : "";
        const excerpt = rawExcerpt || excerptFrom(cleanContent);
        const thumbnailId = meta._thumbnail_id ? Number(meta._thumbnail_id) : null;
        const thumbnail = thumbnailId ? attachmentMap.get(thumbnailId) : null;

        articles.push({
            wp_id: post.ID,
            slug,
            title: titleStr,
            excerpt,
            content: cleanContent,
            status: post.post_status === "publish" ? "published" : "draft",
            published_at: post.post_status === "publish" ? (post.post_date_gmt || post.post_date) : null,
            updated_at: post.post_modified_gmt || post.post_modified,
            author_wp_id: post.post_author,
            author_name: author?.display_name || author?.user_login || "Redaksi",
            author_email: author?.user_email || null,
            categories,
            tags: (relMap.get(post.ID) ?? [])
                .map((id) => taxMap.get(id))
                .filter((t) => t?.taxonomy === "post_tag")
                .map((t) => termMap.get(t.term_id))
                .filter(Boolean)
                .map((t) => t.name),
            focus_keyword: meta._yoast_wpseo_focuskw || meta.rank_math_focus_keyword || null,
            seo_title: meta._yoast_wpseo_title || meta.rank_math_title || null,
            meta_description: meta._yoast_wpseo_metadesc || meta.rank_math_description || null,
            canonical_url: meta._yoast_wpseo_canonical || meta.rank_math_canonical_url || null,
            opengraph_image: meta._yoast_wpseo_opengraph_image || meta.rank_math_facebook_image || null,
            twitter_image: meta._yoast_wpseo_twitter_image || meta.rank_math_twitter_image || null,
            thumbnail_wp_id: thumbnailId,
            thumbnail_url: thumbnail?.url || null,
            thumbnail_title: thumbnail?.title || null,
            thumbnail_alt: thumbnail?.alt || null,
            reading_time_minutes: readingTime(cleanContent),
            word_count: stripHtml(cleanContent).split(/\s+/).filter(Boolean).length,
        });
    }

    // Resolve duplicate slugs deterministically so every article can satisfy the unique constraint.
    const slugCounts = new Map();
    for (const article of articles) {
        const base = article.slug;
        const count = (slugCounts.get(base) ?? 0) + 1;
        slugCounts.set(base, count);
        if (count > 1) {
            const suffix = `-${count}`;
            article.slug = `${base.slice(0, 90 - suffix.length).replace(/-$/g, "")}${suffix}`;
        }
    }

    return { articles, skipped };
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function generateReport(articles, skipped, stats, attachmentMap) {
    const published = articles.filter((a) => a.status === "published");
    const drafts = articles.filter((a) => a.status === "draft");
    const withThumbnail = articles.filter((a) => a.thumbnail_url);
    const withSeoTitle = articles.filter((a) => a.seo_title);
    const withMetaDesc = articles.filter((a) => a.meta_description);
    const withFocusKw = articles.filter((a) => a.focus_keyword);
    const withTags = articles.filter((a) => a.tags.length > 0);
    const withCategories = articles.filter((a) => a.categories.length > 0);
    const slugSet = new Set();
    const duplicateSlugs = [];
    for (const a of articles) {
        if (slugSet.has(a.slug)) duplicateSlugs.push(a.slug);
        slugSet.add(a.slug);
    }
    const reservedSlugs = articles.filter((a) => RESERVED_SLUGS.has(a.slug)).map((a) => a.slug);
    const emptyContent = articles.filter((a) => a.word_count < 10).length;

    const allCategories = new Map();
    for (const a of articles) {
        for (const c of a.categories) {
            if (!allCategories.has(c.slug)) allCategories.set(c.slug, { ...c, count: 0 });
            allCategories.get(c.slug).count++;
        }
    }

    return {
        generated_at: new Date().toISOString(),
        sql_file: SQL_PATH,
        total_rows_parsed: stats.parsedRows,
        skipped_rows: skipped,
        attachments_found: attachmentMap.size,
        articles: {
            total: articles.length,
            published: published.length,
            draft: drafts.length,
            with_thumbnail: withThumbnail.length,
            with_seo_title: withSeoTitle.length,
            with_meta_description: withMetaDesc.length,
            with_focus_keyword: withFocusKw.length,
            with_tags: withTags.length,
            with_categories: withCategories.length,
            empty_content_warning: emptyContent,
            duplicate_slugs: [...new Set(duplicateSlugs)],
            reserved_slugs: [...new Set(reservedSlugs)],
        },
        categories: [...allCategories.values()].sort((a, b) => b.count - a.count),
        sample_articles: articles.slice(0, 5).map((a) => ({
            wp_id: a.wp_id, slug: a.slug, title: a.title, status: a.status,
            author: a.author_name, categories: a.categories.map((c) => c.name),
            has_thumbnail: Boolean(a.thumbnail_url), has_seo: Boolean(a.seo_title || a.meta_description),
            word_count: a.word_count,
        })),
    };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes("--dry-run") || !args.includes("--import");

    console.log("WordPress Import Parser — SwapNews");
    console.log(`SQL: ${SQL_PATH}`);
    console.log(`Mode: ${dryRun ? "DRY RUN (no database writes)" : "IMPORT"}`);
    console.log("---");

    if (!existsSync(SQL_PATH)) {
        console.error(`File not found: ${SQL_PATH}`);
        process.exit(1);
    }

    const parser = new WpDumpParser();
    console.log("Parsing SQL dump...");
    await parser.parse(SQL_PATH);
    console.log(`Parsed ${parser.stats.parsedRows} rows from ${Object.keys(parser.tables).length} tables.`);
    console.log(`Skipped tables: ${[...parser.stats.skippedTables].slice(0, 20).join(", ")}${parser.stats.skippedTables.size > 20 ? "..." : ""}`);

    const posts = parser.tables.wp_posts;
    const postmeta = parser.tables.wp_postmeta;
    const terms = parser.tables.wp_terms;
    const termTaxonomy = parser.tables.wp_term_taxonomy;
    const termRelationships = parser.tables.wp_term_relationships;
    const users = parser.tables.wp_users;

    console.log(`wp_posts: ${posts.length} rows`);
    console.log(`wp_postmeta: ${postmeta.length} rows`);
    console.log(`wp_terms: ${terms.length} rows`);
    console.log(`wp_term_taxonomy: ${termTaxonomy.length} rows`);
    console.log(`wp_term_relationships: ${termRelationships.length} rows`);
    console.log(`wp_users: ${users.length} rows`);
    console.log("---");

    const attachmentMap = buildAttachmentMap(posts);
    console.log(`Attachments with image URLs: ${attachmentMap.size}`);

    const taxData = buildTaxonomy(terms, termTaxonomy, termRelationships);
    const { articles, skipped } = transformArticles(posts, postmeta, taxData, users, attachmentMap);

    console.log("---");
    console.log(`Articles found: ${articles.length}`);
    console.log(`  Published: ${articles.filter((a) => a.status === "published").length}`);
    console.log(`  Draft: ${articles.filter((a) => a.status === "draft").length}`);
    console.log(`  With featured image: ${articles.filter((a) => a.thumbnail_url).length}`);
    console.log(`  With SEO title: ${articles.filter((a) => a.seo_title).length}`);
    console.log(`  With meta description: ${articles.filter((a) => a.meta_description).length}`);
    console.log(`  With focus keyword: ${articles.filter((a) => a.focus_keyword).length}`);
    console.log(`  With tags: ${articles.filter((a) => a.tags.length > 0).length}`);
    console.log(`  With categories: ${articles.filter((a) => a.categories.length > 0).length}`);
    console.log(`Skipped: notPost=${skipped.notPost}, notPublished=${skipped.notPublished}, emptyTitle=${skipped.emptyTitle}, emptyContent=${skipped.emptyContent}`);

    const report = generateReport(articles, skipped, parser.stats, attachmentMap);
    mkdirSync(resolve(ROOT, "_import"), { recursive: true });
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    writeFileSync(STAGING_PATH, JSON.stringify(articles, null, 2));

    console.log("---");
    console.log(`Report: ${REPORT_PATH}`);
    console.log(`Staging: ${STAGING_PATH}`);

    if (report.articles.duplicate_slugs.length > 0) {
        console.warn(`WARNING: ${report.articles.duplicate_slugs.length} duplicate slugs: ${report.articles.duplicate_slugs.slice(0, 10).join(", ")}`);
    }
    if (report.articles.reserved_slugs.length > 0) {
        console.warn(`WARNING: ${report.articles.reserved_slugs.length} reserved slugs: ${report.articles.reserved_slugs.join(", ")}`);
    }

    console.log("---");
    console.log("DRY RUN complete. Review the report before running with --import.");
}

main().catch((error) => { console.error("Parser failed:", error); process.exit(1); });
