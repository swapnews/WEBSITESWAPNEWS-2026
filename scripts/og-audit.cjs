const fs = require("fs");
const https = require("https");

const inputFile = process.argv[2] || process.env.TEMP + "\\swapnews-sitemap-urls.txt";
const outputFile = process.argv[3] || process.env.TEMP + "\\swapnews-og-audit.txt";
const CONCURRENCY = 50;

function fetch(url) {
    return new Promise((resolve) => {
        const req = https.get(url, { timeout: 25000, headers: { "User-Agent": "SwapNews-OG-Audit/1.0" } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return resolve(fetch(res.headers.location));
            }
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => resolve({ ok: res.statusCode === 200, body, status: res.statusCode }));
        });
        req.on("error", (err) => resolve({ ok: false, error: err.message }));
        req.on("timeout", () => { req.destroy(); resolve({ ok: false, error: "timeout" }); });
    });
}

async function auditUrl(url) {
    const resp = await fetch(url);
    if (!resp.ok) return `ERROR\t${url}\t${resp.error || resp.status || "unknown"}`;
    const match = resp.body.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
    const img = match ? match[1] : "";
    if (!img) return `NO_OG\t${url}`;
    if (img.includes("data:")) return `DATAURI\t${url}`;
    if (!img.startsWith("https://")) return `INVALID\t${url}\t${img}`;
    return `OK\t${url}\t${img}`;
}

async function main() {
    const urls = fs.readFileSync(inputFile, "utf8").split("\n").filter((l) => l.trim());
    console.log(`TOTAL URLS: ${urls.length}`);
    const results = [];
    for (let i = 0; i < urls.length; i += CONCURRENCY) {
        const batch = urls.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map((u) => auditUrl(u.trim())));
        results.push(...batchResults);
        process.stdout.write(`PROGRESS: ${results.length}/${urls.length}\r`);
    }
    fs.writeFileSync(outputFile, results.join("\n"), "utf8");
    const stats = results.reduce((acc, r) => {
        const key = r.split("\t")[0];
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    console.log(`\nDONE: ${results.length}`);
    console.log(JSON.stringify(stats, null, 2));
    const errors = results.filter((r) => r.startsWith("ERROR")).slice(0, 5);
    const noOg = results.filter((r) => r.startsWith("NO_OG")).slice(0, 5);
    const dataUri = results.filter((r) => r.startsWith("DATAURI")).slice(0, 5);
    const invalid = results.filter((r) => r.startsWith("INVALID")).slice(0, 5);
    if (errors.length) console.log("\nSAMPLE ERRORS:\n" + errors.join("\n"));
    if (noOg.length) console.log("\nSAMPLE NO_OG:\n" + noOg.join("\n"));
    if (dataUri.length) console.log("\nSAMPLE DATAURI:\n" + dataUri.join("\n"));
    if (invalid.length) console.log("\nSAMPLE INVALID:\n" + invalid.join("\n"));
}

main().catch(console.error);
