// Startar server + deny-proxy och kör race-testet för atomisk aktivering.
// Kör: node test/opsec/run-race.js
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FIXTURES = path.join(__dirname, 'fixtures');
const FIXTURE = path.join(FIXTURES, 'firenze.pmtiles');
const FIXTURE_URL = 'https://raw.githubusercontent.com/protomaps/PMTiles/main/spec/v3/protomaps%28vector%29ODbL_firenze.pmtiles';
const FIXTURE_BYTES = 6601156;

async function ensureFixture() {
    fs.mkdirSync(FIXTURES, { recursive: true });
    if (fs.existsSync(FIXTURE) && fs.statSync(FIXTURE).size === FIXTURE_BYTES) return;
    console.log('[race] hämtar test-fixture…');
    const resp = await fetch(FIXTURE_URL);
    if (!resp.ok) throw new Error('fixture-hämtning misslyckades: HTTP ' + resp.status);
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length !== FIXTURE_BYTES) throw new Error('fixture har fel storlek');
    fs.writeFileSync(FIXTURE, buf);
}

(async () => {
    fs.rmSync(path.join(__dirname, '.tmp'), { recursive: true, force: true });
    await ensureFixture();
    const server = spawn(process.execPath, [path.join(__dirname, 'server.js')], { stdio: 'inherit' });
    const proxy = spawn(process.execPath, [path.join(__dirname, 'proxy.js')], { stdio: 'inherit' });
    await new Promise(r => setTimeout(r, 800));
    const test = spawn(process.execPath, [path.join(__dirname, 'race.js')], { stdio: 'inherit' });
    const kod = await new Promise(res => test.on('exit', res));
    server.kill();
    proxy.kill();
    process.exit(kod === 0 ? 0 : 1);
})().catch(err => { console.error('[race] FEL:', err.message); process.exit(1); });
