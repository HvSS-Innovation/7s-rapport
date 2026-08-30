// ─────────────────────────────────────────────────────────────────────────────
//  RACE-TEST — atomisk aktivering av Härdat läge
//
//  Prövar interleavingen: paketkollen passerar → paketet försvinner (t.ex. en
//  annan flik raderar cachen) → PMTiles-headern läses ändå. Om service workern
//  inte redan är fail-closed vid det laget går Range-anropet ut på nätet.
//
//  Bekräftat som verklig läcka 2026-07-30: 2 CONNECT mot R2, OCH aktiveringen
//  returnerade true — operatören fick grönt ljus efter att trafiken lämnat
//  enheten. Åtgärd: spärren sätts nu FÖRE detectKind().
//
//  Interleavingen görs deterministisk genom att wrappa caches.open: första
//  lyckade match() mot pmtiles-cachen raderar posten direkt efteråt. Det är
//  exakt det tillstånd den andra fliken skapar, utan att förlita sig på tur.
//
//  Kör via run-race.js (som startar server + deny-proxy).
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.OPSEC_TEST_PORT || '8123', 10);
const PROXY_PORT = parseInt(process.env.OPSEC_PROXY_PORT || '8124', 10);
const BASE = 'http://localhost:' + PORT;
const EXT = 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/race-test.pmtiles';
const LOGG = path.join(__dirname, '.tmp', 'external.log');
const logg = () => { try { return fs.readFileSync(LOGG, 'utf8'); } catch (_) { return ''; } };

let fel = 0;
function check(namn, ok, detalj) {
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + namn + (detalj ? '  [' + String(detalj).slice(0, 120) + ']' : ''));
    if (!ok) fel++;
}

(async () => {
    const browser = await chromium.launch({
        proxy: { server: 'http://localhost:' + PROXY_PORT, bypass: 'localhost' }
    });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto(BASE + '/sensorskiss.html', { waitUntil: 'load' });
    await page.evaluate(async () => {
        await navigator.serviceWorker.register('service-worker.js');
        await navigator.serviceWorker.ready;
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() =>
        window.SK_HARDENING && window.HVHardened && navigator.serviceWorker.controller,
        null, { timeout: 20000 });

    // Paketet i cachen under en EXTERN nyckel; härdat AV som utgångsläge.
    await page.evaluate(async (ext) => {
        const r = await fetch('/testdata/firenze.pmtiles');
        const buf = await r.arrayBuffer();
        const ca = await caches.open('hv-pmtiles-v1');
        await ca.put(ext, new Response(buf, { headers: { 'Accept-Ranges': 'bytes' } }));
        localStorage.setItem('pmtiles.hardening', JSON.stringify({ active: false, url: ext, flavor: 'topo' }));
        await window.HVHardened.sync();
    }, EXT);

    const före = logg().length;

    const res = await page.evaluate(async (ext) => {
        const origOpen = caches.open.bind(caches);
        caches.open = async function (namn) {
            const cache = await origOpen(namn);
            if (namn !== 'hv-pmtiles-v1') return cache;
            const origMatch = cache.match.bind(cache);
            cache.match = async function (req, opt) {
                const träff = await origMatch(req, opt);
                if (träff) { try { await cache.delete(ext); } catch (_) {} }
                return träff;
            };
            // isPrefetched läser numera meta-posten + keys() i stället för
            // paketet (WebKit-minne) — racet ska raderas efter paketkollen
            // oavsett vilken väg kollen tar.
            const origKeys = cache.keys.bind(cache);
            cache.keys = async function () {
                const k = await origKeys();
                try { await cache.delete(ext); } catch (_) {}
                return k;
            };
            return cache;
        };
        window.alert = () => {};
        const ctrl = window.SK_HARDENING;
        await ctrl.setUrl(ext);
        const ok = await ctrl.activate();
        return {
            aktiveringOk: ok,
            hardat: window.HVHardened.isActive(),
            fel: (typeof ctrl.getFel === 'function') ? ctrl.getFel() : null
        };
    }, EXT);

    await page.waitForTimeout(2500);
    const egress = logg().slice(före).trim();

    check('0 egress när paketet försvinner mitt i aktiveringen', egress === '',
        egress.split('\n').slice(0, 3).join(' | '));
    check('Aktiveringen ljuger inte om resultatet',
        !(res.aktiveringOk === true && res.hardat === false),
        'activate=' + res.aktiveringOk + ' hardat=' + res.hardat);
    // Paketet är oläsbart när headern ska läsas → aktiveringen ska MISSLYCKAS
    // och lämna ett synligt felläge. Tidigare svalde detectKind() felet,
    // antog 'vector' och byggde ett lager som aldrig kunde rita en tile:
    // grönt "Härdat: PÅ", tom karta.
    check('Oläsbart paket = misslyckad aktivering med synligt felläge',
        res.aktiveringOk === false && !!res.fel && /läsa/.test(res.fel.text || ''),
        'activate=' + res.aktiveringOk + ' fel=' + JSON.stringify(res.fel));

    await browser.close();
    console.log(fel === 0 ? '\nAKTIVERINGEN ÄR ATOMISK — inget läcker i racet.' : '\n' + fel + ' KONTROLL(ER) RÖDA');
    process.exit(fel === 0 ? 0 : 1);
})().catch(err => { console.error('RACE-TESTFEL:', err); process.exit(1); });
