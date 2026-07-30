// ─────────────────────────────────────────────────────────────────────────────
//  HÄRDAT-SVEP ÖVER ALLA SIDOR
//
//  Laddar varje app-sida i härdat läge bakom deny-all-proxyn och räknar all
//  egress. Körs i TVÅ lägen, eftersom skyddet ser helt olika ut i dem:
//
//    med-sw   — service workern kontrollerar sidan (normalfallet)
//    utan-sw  — ingen controller (force-refresh, första besöket, avregistrerad
//               SW). Här finns ingen SW-spärr alls, så sidans egen kod måste
//               hålla. Det var i detta läge minikartan, kartmodalen och
//               PMTiles-headern läckte — samtliga hittade EFTER att den
//               ordinarie invarianten redan var grön.
//
//  Sidan får också en koordinat i STÄLLE-fältet och en cachad kartposition,
//  så kod som pannar en karta till operatörens område faktiskt triggas.
//
//  Kör: node test/opsec/sweep.js   (server + proxy startas av run-sweep.js)
// ─────────────────────────────────────────────────────────────────────────────
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.OPSEC_TEST_PORT || '8123', 10);
const PROXY_PORT = parseInt(process.env.OPSEC_PROXY_PORT || '8124', 10);
const BASE = 'http://localhost:' + PORT;
// URL utanför presets → isPrefetched() gör ingen storlekskontroll, så vi kan
// lägga den lokala fixturen i cachen under en extern nyckel.
const EXT_PMTILES = 'https://pub-c61a5f3b22434be6a223f1c6221b2f95.r2.dev/svep.pmtiles';

const SIDOR = fs.readdirSync(path.join(__dirname, '..', '..'))
    .filter(f => f.endsWith('.html'))
    .filter(f => !/^(landing|tipsa|tavla)/.test(f))
    .sort();

function ärExtern(u) {
    return !u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith('about:');
}

// VIKTIGT: `page.on('request')` är INTE bevis på egress. Eventet fyrar även
// för anrop som service workern sedan besvarar ur cache — de rör aldrig nätet.
// Ett tidigt utkast av detta svep rapporterade 8 sidor som läckande på den
// signalen; deny-proxyn visade 0. Proxyloggen är därför den auktoritativa
// mätpunkten, precis som i invariant.js. Sid-signalen behålls som sekundär
// information: den visar vad SW:n absorberade.
const PROXY_LOGG = path.join(__dirname, '.tmp', 'external.log');
function proxyLogg() {
    try { return fs.readFileSync(PROXY_LOGG, 'utf8'); } catch (_) { return ''; }
}

(async () => {
    const browser = await chromium.launch({
        proxy: { server: 'http://localhost:' + PROXY_PORT, bypass: 'localhost' }
    });

    const resultat = [];

    for (const läge of ['med-sw', 'utan-sw']) {
        for (const sida of SIDOR) {
            const ctx = await browser.newContext(
                läge === 'utan-sw' ? { serviceWorkers: 'block' } : {});
            const page = await ctx.newPage();
            const externa = [];
            page.on('request', r => { if (ärExtern(r.url())) externa.push(r.url()); });

            await page.addInitScript(url => {
                localStorage.setItem('pmtiles.hardening', JSON.stringify({
                    active: true, url: url, flavor: 'topo', kind: 'vector'
                }));
                // Cachad kartposition — det som setView() pannar till.
                localStorage.setItem('7s_mapLast', JSON.stringify({ lat: 59.3293, lng: 18.0686, z: 13 }));
                localStorage.setItem('mk_lastView', JSON.stringify({ lat: 59.3293, lng: 18.0686, z: 13 }));
            }, EXT_PMTILES);

            try {
                // Första besöket: lägg fixturen i PMTiles-cachen under den
                // externa nyckeln, så aktiveringen når längre än paketkollen.
                await page.goto(BASE + '/' + sida, { waitUntil: 'domcontentloaded', timeout: 25000 });
                await page.evaluate(async (ext) => {
                    try {
                        const r = await fetch('/testdata/firenze.pmtiles');
                        const buf = await r.arrayBuffer();
                        const c = await caches.open('hv-pmtiles-v1');
                        await c.put(ext, new Response(buf, {
                            headers: { 'Content-Type': 'application/octet-stream', 'Accept-Ranges': 'bytes' }
                        }));
                    } catch (_) {}
                }, EXT_PMTILES);

                if (läge === 'med-sw') {
                    await page.evaluate(async () => {
                        try {
                            await navigator.serviceWorker.register('service-worker.js');
                            await navigator.serviceWorker.ready;
                        } catch (_) {}
                    });
                }

                externa.length = 0;                       // mät från ren utgångspunkt
                var proxyFöre = proxyLogg().length;
                await page.reload({ waitUntil: 'load', timeout: 25000 });

                // Fyll STÄLLE om fältet finns och trigga kart-synk.
                await page.evaluate(() => {
                    const el = document.getElementById('stalle');
                    if (el) {
                        el.value = '59.3293 18.0686';
                        el.dispatchEvent(new Event('change'));
                        if (typeof syncStalleMiniFromField === 'function') syncStalleMiniFromField();
                    }
                    if (typeof openMapModal === 'function') { try { openMapModal(); } catch (_) {} }
                });
                await page.waitForTimeout(2500);
            } catch (err) {
                resultat.push({
                    läge, sida, fel: String(err.message || err).slice(0, 60),
                    egress: proxyLogg().slice(proxyFöre).trim(), sidSignal: externa.length
                });
                await ctx.close();
                continue;
            }

            resultat.push({
                läge, sida,
                egress: proxyLogg().slice(proxyFöre).trim(),   // auktoritativt
                sidSignal: externa.length                       // absorberat av SW
            });
            await ctx.close();
        }
    }

    await browser.close();

    // ── Rapport ──
    let trasiga = 0;
    for (const läge of ['med-sw', 'utan-sw']) {
        const rader = resultat.filter(r => r.läge === läge);
        const dåliga = rader.filter(r => r.egress);
        const absorberat = rader.reduce((s, r) => s + r.sidSignal, 0);
        console.log('\n=== ' + läge.toUpperCase() + ' — ' + rader.length + ' sidor ===');
        if (!dåliga.length) {
            console.log('  0 extern egress (deny-proxyn) på samtliga sidor.');
            if (absorberat) {
                console.log('  (' + absorberat + ' sid-initierade anrop absorberades av service workern ' +
                    'utan att nå nätet — förväntat, inte en läcka.)');
            }
        } else {
            trasiga += dåliga.length;
            for (const r of dåliga) {
                const rader2 = r.egress.split('\n');
                console.log('  LÄCKER  ' + r.sida.padEnd(22) + rader2.length + ' requests ut på nätet');
                rader2.slice(0, 4).forEach(l => console.log('            ' + l));
            }
        }
        const fel = rader.filter(r => r.fel);
        if (fel.length) fel.forEach(r => console.log('  (laddningsfel ' + r.sida + ': ' + r.fel + ')'));
    }

    console.log('\n' + (trasiga === 0
        ? 'SVEP RENT — ingen sida läcker i härdat läge, med eller utan service worker.'
        : trasiga + ' sid-läge(n) läcker.'));
    process.exit(trasiga === 0 ? 0 : 1);
})().catch(err => { console.error('SVEPFEL:', err); process.exit(1); });
