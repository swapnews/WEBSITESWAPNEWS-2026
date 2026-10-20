/* Run: node --test scripts/test-profile-homepage-speech.cjs. No network/DB writes. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
Module._extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const { chunkSpeechText } = require('../src/lib/speech-text.ts');
const { ArticleSpeechQueue } = require('../src/lib/article-speech-queue.ts');
const { HOMEPAGE_MODULES, mergeHomepageModules, isAdModule } = require('../src/lib/homepage-modules.ts');
const { cloudinaryUploadError } = require('../src/lib/cloudinary-errors.ts');
const { profileSaveError } = require('../src/lib/profile-errors.ts');

function harness() {
    let now = 0, nextId = 0, hidden = false;
    const timers = new Map(), spoken = [], states = [];
    const synth = { speaking: false, paused: false, getVoices: () => [], cancel() { this.speaking = false; }, resume() { this.paused = false; }, speak(utterance) { this.speaking = true; spoken.push(utterance); utterance.onstart?.(); } };
    const queue = new ArticleSpeechQueue({ synth, utterance: text => ({ text }), later: (fn, delay) => { timers.set(++nextId, { fn, at: now + delay }); return nextId; }, clear: id => timers.delete(id), now: () => now, hidden: () => hidden }, state => states.push(state));
    const advance = ms => { const end = now + ms; for (let n = 0; n < 100000; n++) { const item = [...timers.entries()].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!item) break; now = item[1].at; timers.delete(item[0]); item[1].fn(); } now = end; };
    const finish = () => { const utterance = spoken.at(-1); synth.speaking = false; utterance.onend?.(); advance(70); };
    return { queue, synth, spoken, states, timers, advance, finish, setHidden(value) { hidden = value; queue.visibilityChanged(); } };
}

test('chunks preserve complete narrative including punctuation and long tokens', () => {
    for (const input of ['kata '.repeat(10000), 'X'.repeat(2000), '?! ... ;: ,', ('Kalimat satu. Daftar, tabel; selesai! ').repeat(1000), '🙂'.repeat(400)]) {
        const chunks = chunkSpeechText(input);
        assert.ok(chunks.length > 0);
        assert.ok(chunks.every(chunk => chunk.length <= 140 && chunk.trim().length));
        assert.equal(chunks.join('').replace(/\s/g, ''), input.replace(/\s/g, ''));
    }
    assert.deepEqual(chunkSpeechText('  '), []);
});

test('long article reaches final chunk with no omissions or duplicates', () => {
    const h = harness(), text = 'Artikel panjang tanpa koma dengan seluruh kata harus dibaca sampai akhir '.repeat(1000);
    h.queue.start(text);
    const chunks = chunkSpeechText(text);
    for (let index = 0; index < chunks.length; index++) { assert.equal(h.spoken[index].text, chunks[index]); h.finish(); }
    assert.equal(h.spoken.length, chunks.length);
    assert.equal(h.states.at(-1).status, 'complete');
    assert.equal(h.states.at(-1).completed, chunks.length);
    assert.equal(h.timers.size, 0);
});

test('pause/resume replays current chunk; stale end callback cannot skip text', () => {
    const h = harness(); h.queue.start('Isi berita '.repeat(80));
    const staleEnd = h.spoken[0].onend, first = h.spoken[0].text;
    h.queue.pause(); staleEnd(); h.advance(10000);
    assert.equal(h.spoken.length, 1); assert.equal(h.states.at(-1).status, 'paused');
    h.queue.resume(); assert.equal(h.spoken[1].text, first);
    h.finish(); assert.equal(h.states.at(-1).completed, 1);
});

test('errors retry same chunk and fail visibly after bounded retries', () => {
    const h = harness(); h.queue.start('Tetap baca teks ini. '.repeat(20));
    for (let retry = 0; retry < 3; retry++) { h.spoken.at(-1).onerror({ error: 'network' }); h.advance(600); }
    assert.equal(h.spoken.length, 3); assert.equal(new Set(h.spoken.map(u => u.text)).size, 1);
    assert.equal(h.states.at(-1).completed, 0); assert.equal(h.states.at(-1).status, 'error'); assert.equal(h.timers.size, 0);
    h.queue.resume(); assert.equal(h.spoken.at(-1).text, h.spoken[0].text);
});

test('duplicate end/error callbacks cannot complete two chunks', () => {
    const h = harness(); h.queue.start('Kalimat '.repeat(60)); const end = h.spoken[0].onend, error = h.spoken[0].onerror;
    end(); end(); error(); h.advance(70); assert.equal(h.spoken.length, 2); assert.equal(h.states.at(-1).completed, 1);
});

test('new session cancels old callbacks and timers', () => {
    const h = harness(); h.queue.start('Berita lama '.repeat(80)); const oldEnd = h.spoken[0].onend;
    h.queue.start('Berita baru.'); oldEnd(); h.finish();
    assert.equal(h.spoken.length, 2); assert.equal(h.states.at(-1).status, 'complete'); assert.equal(h.states.at(-1).total, 1);
});

test('watchdog retries stuck chunk, but no polling while hidden', () => {
    const h = harness(); h.queue.start('Suara macet.'); h.advance(26500); assert.equal(h.spoken.length, 2);
    h.setHidden(true); assert.equal(h.timers.size, 0); h.advance(100000); assert.equal(h.spoken.length, 2);
    h.setHidden(false); h.finish(); assert.equal(h.states.at(-1).status, 'complete');
});

test('dispose clears pending work and suppresses updates', () => {
    const h = harness(); h.queue.start('Isi '.repeat(100)); const oldEnd = h.spoken[0].onend; const count = h.states.length;
    h.queue.dispose(); oldEnd(); h.advance(100000); assert.equal(h.timers.size, 0); assert.equal(h.states.length, count);
});

test('ten modules default to ads at positions 3/7; blank ads disabled', () => {
    const modules = mergeHomepageModules([]); assert.equal(modules.length, 10); assert.ok(isAdModule(modules[2])); assert.ok(isAdModule(modules[6]));
    assert.ok(modules.filter(isAdModule).every(module => !module.is_enabled && !module.settings.html_content));
});

test('legacy six modules preserve titles/toggles while expanding order', () => {
    const oldOrders = { topics: 10, reels: 20, games: 30, sports: 40, bali: 50, latest: 60 };
    const old = HOMEPAGE_MODULES.filter(module => module.section_key in oldOrders).map(module => ({ ...module, title: `Custom ${module.section_key}`, is_enabled: false, sort_order: oldOrders[module.section_key] }));
    const modules = mergeHomepageModules(old); assert.equal(modules[2].section_key, 'ads_1'); assert.equal(modules[6].section_key, 'ads_2');
    assert.equal(modules.find(module => module.section_key === 'games').title, 'Custom games'); assert.equal(modules.find(module => module.section_key === 'games').is_enabled, false);
});

test('custom saved order and HTML remain authoritative', () => {
    const modules = mergeHomepageModules([{ ...HOMEPAGE_MODULES[6], sort_order: 1, settings: { html_content: '<b>Materi asli</b>' } }]);
    assert.equal(modules[0].section_key, 'ads_2'); assert.equal(modules[0].settings.html_content, '<b>Materi asli</b>');
});

// Load route against isolated auth, DB, Cloudinary, and Next adapters.
function avatarRoute({ loggedIn = true, dbFails = false, uploadFails = false } = {}) {
    const calls = { uploads: 0, destroys: 0, updates: 0, paths: [] };
    const cloud = { uploader: { upload_stream(options, done) { calls.uploads++; return { on() { }, end() { if (uploadFails) done(new Error('mock Cloudinary failure')); else done(null, { public_id: 'test/foto', secure_url: 'https://res.cloudinary.com/test/image/upload/foto.webp' }); } }; }, async destroy() { calls.destroys++; } } };
    const db = {
        from() {
            return {
                update(payload) {
                    calls.updates++;
                    return {
                        eq(column, id) {
                            assert.equal(id, 'own-user');
                            return {
                                select() {
                                    return {
                                        async single() {
                                            return dbFails
                                                ? { error: { message: 'denied' }, data: null }
                                                : { error: null, data: { id, avatar_url: payload.avatar_url } };
                                        },
                                    };
                                },
                            };
                        },
                    };
                },
            };
        },
    };
    const stubs = { 'next/cache': { revalidatePath: p => calls.paths.push(p) }, 'next/server': { NextResponse: { json: (data, options) => Response.json(data, options) } }, '@/lib/auth/get-profile': { getCurrentProfile: async () => loggedIn ? { id: 'own-user' } : null }, '@/lib/cloudinary': { getCloudinaryClient: () => cloud }, '@/lib/cloudinary-errors': { cloudinaryUploadError }, '@/lib/profile-errors': { profileSaveError }, '@/lib/supabase/server': { createClient: async () => db } };
    const filename = path.resolve(__dirname, '../src/app/api/profiles/avatar/route.ts');
    const loaded = new Module(filename);
    loaded.filename = filename;
    loaded.paths = Module._nodeModulePaths(path.dirname(filename));
    loaded.require = id => id in stubs ? stubs[id] : require(id);
    loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
    return { post: loaded.exports.POST, calls };
}
function photoRequest(file = new File([Buffer.from([255, 216, 255, 224, 0, 0])], 'foto.jpg', { type: 'image/jpeg' }), origin = 'http://localhost:3000') {
    const data = new FormData(); data.set('file', file);
    return { headers: new Headers({ origin }), nextUrl: { origin: 'http://localhost:3000' }, formData: async () => data };
}

test('avatar rejects anonymous and cross-origin requests before upload', async () => {
    const anonymous = avatarRoute({ loggedIn: false }); assert.equal((await anonymous.post(photoRequest())).status, 401); assert.equal(anonymous.calls.uploads, 0);
    const foreign = avatarRoute(); assert.equal((await foreign.post(photoRequest(undefined, 'https://evil.invalid'))).status, 403); assert.equal(foreign.calls.uploads, 0);
});
test('avatar rejects forged MIME/image bytes and oversized upload', async () => {
    const h = avatarRoute(); assert.equal((await h.post(photoRequest(new File(['not a photo'], 'fake.png', { type: 'image/png' })))).status, 400);
    assert.equal((await h.post(photoRequest(new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })))).status, 400); assert.equal(h.calls.uploads, 0);
});
test('avatar only succeeds after own profile update; returns no base64', async () => {
    const h = avatarRoute(); const response = await h.post(photoRequest()); assert.equal(response.status, 200); assert.match((await response.json()).avatar_url, /^https:\/\/res.cloudinary.com\//); assert.equal(h.calls.updates, 1); assert.ok(h.calls.paths.includes('/profile'));
});
test('avatar Cloudinary failure never writes fallback data URL', async () => {
    const h = avatarRoute({ uploadFails: true }); assert.equal((await h.post(photoRequest())).status, 502); assert.equal(h.calls.updates, 0);
});
test('avatar DB failure cleans up new asset and reports error', async () => {
    const h = avatarRoute({ dbFails: true }); assert.equal((await h.post(photoRequest())).status, 500); assert.equal(h.calls.destroys, 1); assert.equal(h.calls.paths.length, 0);
});

test('Cloudinary failures classified without leaking provider text', () => {
    const cases = [
        [{ http_code: 401, message: 'Invalid Signature SECRET' }, 'PHOTO_CLOUD_AUTH', 503],
        [{ http_code: 403 }, 'PHOTO_CLOUD_FORBIDDEN', 503],
        [{ http_code: 429 }, 'PHOTO_CLOUD_LIMIT', 503],
        [{ http_code: 400, message: 'credit limit exceeded' }, 'PHOTO_CLOUD_LIMIT', 503],
        [{ code: 'ETIMEDOUT' }, 'PHOTO_CLOUD_CONNECTION', 504],
        [{ http_code: 400 }, 'PHOTO_CLOUD_REJECTED', 502],
        [null, 'PHOTO_CLOUD_UNAVAILABLE', 502],
    ];
    for (const [error, code, status] of cases) {
        const result = cloudinaryUploadError(error);
        assert.equal(result.code, code); assert.equal(result.status, status);
        assert.ok(!result.message.includes('SECRET'));
    }
});

test('profile errors are actionable without SQL details', () => {
    assert.match(profileSaveError({ code: '42P17', message: 'SQL secret' }), /PROFILE_RLS_RECURSION/);
    assert.match(profileSaveError({ code: '23505' }), /Username/);
    assert.match(profileSaveError({ code: '42501' }), /PROFILE_FORBIDDEN/);
    assert.ok(!profileSaveError({ message: 'private database name' }).includes('private database name'));
    assert.match(profileSaveError(null), /belum tersimpan/);
});

test('profile migration keeps RLS and own-user/role checks without self-query in policy', () => {
    const sql = fs.readFileSync(path.resolve(__dirname, '../supabase/migrations/028_fix_profile_update_rls.sql'), 'utf8');
    const policy = sql.slice(sql.indexOf('create policy'));
    assert.match(sql, /security definer/i);
    assert.match(policy, /to authenticated/i);
    assert.match(policy, /auth\.uid\(\)\) = id/);
    assert.match(policy, /role = \(select public\.current_role\(\)\)/);
    assert.doesNotMatch(policy, /from public\.profiles/i);
    assert.doesNotMatch(sql, /disable row level security/i);
});

test('Cloudinary config trims env and does not require credentials for existing URLs', () => {
    const { getCloudinaryConfig, buildImageUrl } = require('../src/lib/cloudinary.ts');
    const names = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
    const saved = names.map(name => process.env[name]);
    try {
        names.forEach(name => { process.env[name] = '  test  '; });
        assert.deepEqual(getCloudinaryConfig(), { cloudName: 'test', apiKey: 'test', apiSecret: 'test' });
        names.forEach(name => delete process.env[name]);
        assert.throws(getCloudinaryConfig, /Missing Cloudinary configuration/);
        assert.equal(buildImageUrl('https://example.com/image.webp'), 'https://example.com/image.webp');
    } finally {
        names.forEach((name, index) => { if (saved[index] === undefined) delete process.env[name]; else process.env[name] = saved[index]; });
    }
});
