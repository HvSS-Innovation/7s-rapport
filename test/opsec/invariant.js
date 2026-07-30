// ─────────────────────────────────────────────────────────────────────────────
//  HÄRDAT LÄGE — INVARIANT-TEST (Fas 3.2, roadmap-opsec-hardat-lage)
//
//  Kör hela härdat-kedjan i riktig browser bakom en deny-all-proxy:
//  invarianten "härdat === true → ingen nätverksegress" bevisas av att
//  proxyloggen är tom under hela härdat-fönstret. Startas via run.js
//  (som ordnar server + proxy + fixture) — kör inte denna fil direkt.
//
//  Kontrakt som testas:
//   - sid-guarden (shared/hardened-guard.js) blockerar cross-origin fetch/XHR
//   - SW:n 503:ar cachemissar (same-origin OCH tile-hosts) utan att röra nätet
//   - nedladdningsjobb vägras i härdat
//   - PNG-exporten renderar från lokal PMTiles (sensorskiss + minkarta)
//   - appskalet servas ur cache vid reload i härdat (beslut A)
//   - vädersidan har knappen avstängd i härdat
//   - av-slag öppnar nätet igen; aktivering utan paket vägras (Fas 1.4)
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.OPSEC_TEST_PORT || '8123', 10);
const PROXY_PORT = parseInt(process.env.OPSEC_PROXY_PORT || '8124', 10);
const BASE = 'http://localhost:' + PORT;
const PMTILES_URL = BASE + '/testdata/firenze.pmtiles';
const TMP = path.join(__dirname, '.tmp');
const EXT_LOG = path.join(TMP, 'external.log');
const REQ_LOG = path.join(TMP, 'requests.log');

function extLog() { try { return fs.readFileSync(EXT_LOG, 'utf8'); } catch (_) { return ''; } }
function reqLog() { try { return fs.readFileSync(REQ_LOG, 'utf8'); } catch (_) { return ''; } }

let failures = 0;
function check(name, ok, detail) {
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  [' + String(detail).slice(0, 140) + ']' : ''));
    if (!ok) failures++;
}

// Florens-fixturen täcker centrala staden med data t.o.m. z14. Punkterna är
// valda så att pickZoom tvingas ner till z14 (z15+ spränger MAX_TILES).
const P1 = { lat: 43.745, lng: 11.10 };
const P2 = { lat: 43.80, lng: 11.40 };

(async () => {
    const browser = await chromium.launch({
        proxy: { server: 'http://localhost:' + PROXY_PORT, bypass: 'localhost' }
    });
    const page = await browser.newPage();
    page.on('pageerror', err => console.log('[pageerror]', err.message));

    // 1) Ladda sidan, registrera SW (sensorskiss laddar inte pwa.js — i prod
    // registreras SW:n från andra sidor, scope / täcker alla), reloada så
    // SW:n kontrollerar sidan.
    await page.goto(BASE + '/sensorskiss.html', { waitUntil: 'load' });
    await page.evaluate(async () => {
        await navigator.serviceWorker.register('service-worker.js');
        await navigator.serviceWorker.ready;
    });
    await page.reload({ waitUntil: 'load' });
    check('SW kontrollerar sidan', await page.evaluate(() => !!navigator.serviceWorker.controller));
    await page.waitForFunction(() =>
        window.SK_EXPORT && window.PMTilesPrefetch && window.HVHardened &&
        window.PMTilesHardening && window.PMTilesHardening.renderHardenedStatic, null, { timeout: 20000 });

    // 2) Prefetch i normalläge — via SW-jobbet (same-origin → allowlist OK).
    const pf = await page.evaluate(url => window.PMTilesPrefetch.fetchSmart(url, {}), PMTILES_URL);
    check('Prefetch i normalläge lyckas', !!(pf && pf.ok), JSON.stringify(pf));

    // 3) Härdat PÅ + sync.
    await page.evaluate(url => {
        localStorage.setItem('pmtiles.hardening', JSON.stringify({
            active: true, url: url, flavor: 'topo', kind: 'vector'
        }));
        window.HVHardened.sync();
    }, PMTILES_URL);
    await page.waitForTimeout(300);
    const extMark = extLog().length;
    const reqMark = reqLog().length;

    // 4) Sid-guarden.
    const g1 = await page.evaluate(async () => {
        try { await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'x' }); return 'gick igenom'; }
        catch (e) { return String(e.message || e); }
    });
    check('Guard blockerar cross-origin fetch', /härdat/i.test(g1), g1);

    const g2 = await page.evaluate(() => {
        try { const x = new XMLHttpRequest(); x.open('GET', 'https://api.open-meteo.com/v1/forecast'); return 'gick igenom'; }
        catch (e) { return String(e.message || e); }
    });
    check('Guard blockerar cross-origin XHR', /härdat/i.test(g2), g2);

    // 5) SW-spärren.
    const missPath = '/finns-inte-' + Date.now() + '.js';
    const s1 = await page.evaluate(async p => {
        const r = await fetch(p);
        return { status: r.status, body: (await r.text()).slice(0, 40) };
    }, missPath);
    check('SW 503:ar same-origin cachemiss', s1.status === 503 && /HARDENED/.test(s1.body), JSON.stringify(s1));
    check('Cachemissen nådde aldrig servern', !reqLog().slice(reqMark).includes(missPath));

    const s2 = await page.evaluate(() => new Promise(res => {
        const img = new Image();
        img.onload = () => res('LADDADES');
        img.onerror = () => res('error');
        img.src = 'https://a.tile.opentopomap.org/5/17/9.png?inv=' + Date.now();
        setTimeout(() => res('timeout'), 8000);
    }));
    check('Tile-request i härdat ger fel (SW 503)', s2 === 'error', s2);

    const s3 = await page.evaluate(url => window.PMTilesPrefetch.fetchSmart(url + '?inv=1', {}), PMTILES_URL);
    check('Nedladdningsjobb blockeras i härdat', !!(s3 && s3.ok === false && /härdat/i.test(s3.error || '')), JSON.stringify(s3));

    // 6) Appskal ur cache: reload i härdat ska fungera utan att nå servern.
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.SK_EXPORT && window.HVHardened, null, { timeout: 20000 });
    const shellOk = await page.evaluate(() => window.HVHardened.isActive());
    check('Appskalet servas ur cache vid reload i härdat', shellOk,
        'sensorskiss.html i server-loggen efter härdat: ' + reqLog().slice(reqMark).includes('/sensorskiss.html'));
    check('Reload nådde aldrig servern', !reqLog().slice(reqMark).includes('/sensorskiss.html'));

    // 7) PNG-export i härdat — sensorskiss.
    const expSk = await page.evaluate(async pts => {
        const SYM = window.SK_SYMBOLS || {};
        const typ = Object.keys(SYM).find(k => SYM[k] && SYM[k].category === 'point') || 'x';
        try {
            const out = await window.SK_EXPORT.renderExportAsync({
                objects: [
                    { typ: typ, lat: pts.p1.lat, lng: pts.p1.lng, numLabel: 1 },
                    { typ: typ, lat: pts.p2.lat, lng: pts.p2.lng, numLabel: 2 }
                ],
                title: 'INVARIANT', dpr: 1
            });
            return { ok: true, size: out.blob.size };
        } catch (e) { return { ok: false, error: String(e.message || e) }; }
    }, { p1: P1, p2: P2 });
    check('Sensorskiss-export renderar i härdat', !!(expSk && expSk.ok && expSk.size > 100000), JSON.stringify(expSk));

    // 8) PNG-export i härdat — minkarta (egen kopia av pipelinen).
    await page.goto(BASE + '/minkarta.html', { waitUntil: 'load' });
    await page.waitForFunction(() => window.MK_EXPORT && window.HVHardened && window.HVHardened.isActive(), null, { timeout: 20000 });
    const expMk = await page.evaluate(async pts => {
        const SYM = window.MK_SYMBOLS || {};
        const typ = Object.keys(SYM).find(k => SYM[k] && SYM[k].category === 'point') || 'x';
        try {
            const out = await window.MK_EXPORT.renderExportAsync({
                objects: [
                    { typ: typ, lat: pts.p1.lat, lng: pts.p1.lng },
                    { typ: typ, lat: pts.p2.lat, lng: pts.p2.lng }
                ],
                title: 'INVARIANT', dpr: 1
            });
            return { ok: true, size: out.blob.size };
        } catch (e) { return { ok: false, error: String(e.message || e) }; }
    }, { p1: P1, p2: P2 });
    check('Minkarta-export renderar i härdat', !!(expMk && expMk.ok && expMk.size > 100000), JSON.stringify(expMk));

    // 9) Vädersidan i härdat: knappen avstängd + banner synlig.
    await page.goto(BASE + '/vader.html', { waitUntil: 'load' });
    const vader = await page.evaluate(() => ({
        disabled: !!(document.getElementById('generaBtn') && document.getElementById('generaBtn').disabled),
        banner: !!(document.getElementById('hardenBanner') && document.getElementById('hardenBanner').textContent.includes('HÄRDAT'))
    }));
    check('Väderknappen avstängd i härdat', vader.disabled && vader.banner, JSON.stringify(vader));

    // 10) Auktoritativt proxy-bevis: noll extern trafik under hela härdat-fönstret.
    const extDuring = extLog().slice(extMark);
    check('0 extern egress under härdat (proxy-bevis)', extDuring.trim() === '',
        extDuring.trim().split('\n').slice(0, 3).join(' | '));

    // 10b) DOM-XSS-regression: STÄLLE autofylls från geokodningssvar och fick
    // tidigare gå rakt in i publishInfo.innerHTML. Fientlig text ska renderas
    // som TEXT, aldrig som element. (Fixad 2026-07-30, fem rapportsidor.)
    await page.goto(BASE + '/index.html', { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.showPublishDialog === 'function', null, { timeout: 20000 });
    const xss = await page.evaluate(() => {
        const nyttolast = '<img src=x onerror="window.__xss=1">';
        window.__xss = 0;
        document.getElementById('stalle').value = nyttolast;
        window.showPublishDialog();
        const info = document.getElementById('publishInfo');
        return {
            element: info.querySelectorAll('img').length,   // ska vara 0
            kord: window.__xss,                             // ska vara 0
            text: info.textContent.includes(nyttolast)      // ska vara true
        };
    });
    check('Fientlig STÄLLE-text renderas som text, inte HTML',
        xss.element === 0 && xss.kord === 0 && xss.text, JSON.stringify(xss));

    // 10c) DEN FARLIGA LUCKAN: sida UTAN service worker-controller.
    // Testet ovan garanterar bort just det tillstånd som är riskabelt — SW:n
    // registreras och controller väntas in innan mätningen. Men efter en
    // force-refresh (eller allra första besöket) saknar dokumentet controller,
    // och då finns ingen SW-spärr alls. Tile-bilder går inte via fetch/XHR, så
    // sid-guarden ser dem inte heller. Här körs index.html i ett FÄRSKT
    // context utan controller, med härdat lagrat och en koordinat i STÄLLE —
    // exakt scenariot där minikartan tidigare läckte operatörens position.
    const utanSW = await browser.newContext({ serviceWorkers: 'block' });
    const sidaUtanSW = await utanSW.newPage();
    const extForeUtanSW = extLog().length;
    await sidaUtanSW.addInitScript(url => {
        localStorage.setItem('pmtiles.hardening', JSON.stringify({
            active: true, url: url, flavor: 'topo', kind: 'vector'
        }));
    }, PMTILES_URL);
    await sidaUtanSW.goto(BASE + '/index.html', { waitUntil: 'load' });
    check('Ingen SW-controller i testkontexten (annars testar vi fel sak)',
        !(await sidaUtanSW.evaluate(() => !!navigator.serviceWorker.controller)));
    // Fyll STÄLLE med en koordinat och trigga minikartans synk.
    await sidaUtanSW.evaluate(() => {
        const el = document.getElementById('stalle');
        el.value = '59.3293 18.0686';
        el.dispatchEvent(new Event('change'));
        if (typeof syncStalleMiniFromField === 'function') syncStalleMiniFromField();
    });
    await sidaUtanSW.waitForTimeout(2500);
    const miniKarta = await sidaUtanSW.evaluate(() =>
        document.querySelectorAll('#stalleMiniMap .leaflet-tile').length);
    check('Minikartan skapar inga tiles utan SW-controller i härdat', miniKarta === 0, 'tiles=' + miniKarta);
    const extUtanSW = extLog().slice(extForeUtanSW);
    check('0 extern egress från sida utan SW-controller (proxy-bevis)',
        extUtanSW.trim() === '', extUtanSW.trim().split('\n').slice(0, 3).join(' | '));
    await utanSW.close();

    // 11) Härdat AV → nätet öppnas igen.
    await page.evaluate(() => {
        const s = JSON.parse(localStorage.getItem('pmtiles.hardening') || '{}');
        s.active = false;
        localStorage.setItem('pmtiles.hardening', JSON.stringify(s));
        window.HVHardened.sync();
    });
    await page.waitForTimeout(300);
    const missPath2 = '/finns-inte-' + Date.now() + '-efter.js';
    const s4 = await page.evaluate(async p => (await fetch(p)).status, missPath2);
    check('Efter av-slag når requests servern igen', s4 === 404 && reqLog().includes(missPath2), 'status=' + s4);

    // 12) Fas 1.4: aktivering utan nedladdat paket vägras.
    await page.goto(BASE + '/sensorskiss.html', { waitUntil: 'load' });
    await page.waitForFunction(() => window.SK_HARDENING, null, { timeout: 20000 });
    const act = await page.evaluate(async () => {
        window.alert = () => {};
        const ctrl = window.SK_HARDENING;
        await ctrl.setUrl('https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/finns-ej-invariant.pmtiles');
        const ok = await ctrl.activate();
        const state = JSON.parse(localStorage.getItem('pmtiles.hardening') || '{}');
        return { ok: ok, active: state.active };
    });
    check('Aktivering utan paket vägras (Fas 1.4)', !!(act && act.ok === false && act.active === false), JSON.stringify(act));

    await browser.close();
    console.log(failures === 0 ? '\nINVARIANTEN HÅLLER — alla kontroller gröna.' : '\n' + failures + ' KONTROLL(ER) RÖDA');
    process.exit(failures === 0 ? 0 : 1);
})().catch(err => { console.error('TESTFEL:', err); process.exit(1); });
