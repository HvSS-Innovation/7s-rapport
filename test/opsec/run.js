// Orkestrerar OPSEC-invariant-testet: fixture → server + proxy → invariant.js
// → städning. Exit-kod 0 = invarianten håller. Körs lokalt med
// `node test/opsec/run.js` (kräver `npm i --no-save playwright` +
// `npx playwright install chromium` en gång) och i CI via opsec-gate.yml.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FIXTURES = path.join(__dirname, 'fixtures');
const TMP = path.join(__dirname, '.tmp');
const FIXTURE = path.join(FIXTURES, 'firenze.pmtiles');
// Protomaps officiella spec-exempel (6,6 MB vektor, z 0–14). Hämtas EN gång
// och cachas i fixtures/ (gitignorerad — 6,6 MB binär hör inte hemma i repot).
const FIXTURE_URL = 'https://raw.githubusercontent.com/protomaps/PMTiles/main/spec/v3/protomaps%28vector%29ODbL_firenze.pmtiles';
const FIXTURE_BYTES = 6601156;

async function ensureFixture() {
    fs.mkdirSync(FIXTURES, { recursive: true });
    if (fs.existsSync(FIXTURE) && fs.statSync(FIXTURE).size === FIXTURE_BYTES) return;
    console.log('[run] hämtar test-fixture (Florens-demo, 6,6 MB)…');
    const resp = await fetch(FIXTURE_URL);
    if (!resp.ok) throw new Error('fixture-hämtning misslyckades: HTTP ' + resp.status);
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length !== FIXTURE_BYTES) {
        throw new Error('fixture har fel storlek (' + buf.length + ' B, väntade ' + FIXTURE_BYTES + ')');
    }
    fs.writeFileSync(FIXTURE, buf);
    console.log('[run] fixture klar.');
}

function startChild(script) {
    const child = spawn(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit' });
    child.on('exit', code => {
        if (code !== null && code !== 0) console.error('[run] ' + script + ' avslutades med kod ' + code);
    });
    return child;
}

(async () => {
    // Rena loggar per körning — testet läser dem som bevis.
    fs.rmSync(TMP, { recursive: true, force: true });
    fs.mkdirSync(TMP, { recursive: true });

    await ensureFixture();

    const server = startChild('server.js');
    const proxy = startChild('proxy.js');
    await new Promise(r => setTimeout(r, 800));

    const test = spawn(process.execPath, [path.join(__dirname, 'invariant.js')], { stdio: 'inherit' });
    const code = await new Promise(res => test.on('exit', res));

    server.kill();
    proxy.kill();
    process.exit(code === 0 ? 0 : 1);
})().catch(err => { console.error('[run] FEL:', err.message); process.exit(1); });
