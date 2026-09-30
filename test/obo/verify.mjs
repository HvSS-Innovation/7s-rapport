// Headless verifiering av obo.html (OBO/OBK/OSK, PUK-import, utskrift). Kör från repo-roten: node test/obo/verify.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html');
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/obo.html`;

const fails = [];
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails.push(msg); };

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('dialog', d => d.accept());
await page.goto(url, { waitUntil: 'load' });

// ── Default OBO
ok(await page.isVisible('#fullForm'), 'OBO: fullForm synlig');
ok(await page.isHidden('#kortForm'), 'OBO: kortForm dold');
ok((await page.textContent('#formatHint')).includes('5-punktsorder'), 'OBO: formatHint satt');
ok((await page.locator('.xfer').count()) >= 14, 'OBO: överföringsgrad-badges renderade (' + await page.locator('.xfer').count() + ')');

// ── PUK-import med Understöd + Uthållighet
const puk = `1. ORIENTERING
Fi: Inbrott i förråd, motståndaren kan uppträda i M90 med understöd - granatkastare i väster.
Egna förband: Kompaniet bevakar objektet.
Understöd: 3 grp ksp i skogsbrynet.
Terrängen: Öppen åker norr om vägen.
Civilläget: Boende i gårdarna.

2. VÅR UPPGIFT
Bevaka vägkorset.

3. GENOMFÖRANDE
Målbild: Vägkorset under kontroll.
Genomförandeidé:
Inledningsvis: framrycka.
Därefter: gruppera.
Slutligen: rapportera.
Riktlinjer
Eld endast på min order.
Order
1 grp: framrycka först.
Insatsregler
Varningsskott tillåtna.

4. UTHÅLLIGHET
Sjukvårdstjänst: Skadade tas till plutonens samlingsplats vid ladan.
Underhållstjänst: Påfyllning av vatten och amm vid ladan kl 18.

5. LEDNING
Samband: Plutonsnät kanal 3.
Plutch leder från vägkorset.
`;
await page.fill('#pukInput', puk);
await page.click('.btn-import');
ok((await page.inputValue('#o_understod')).startsWith('3 grp ksp'), 'PUK: Understöd → o_understod');
ok(!(await page.inputValue('#o_egna')).includes('Understöd'), 'PUK: Egna innehåller inte Understöd-raden');
ok((await page.inputValue('#o_motstandaren')).includes('granatkastare'), 'PUK: "med understöd" mitt i Fi-raden stannar i Fi');
ok(!(await page.inputValue('#o_understod')).includes('granatkastare'), 'PUK: Understöd-fältet tar inte prosa-"understöd" ur Fi');
ok((await page.locator('.xfer[aria-hidden="true"]').count()) === (await page.locator('.xfer').count()), 'Badges: alla aria-hidden');
ok((await page.inputValue('#o_skadeplats')).startsWith('Skadade tas'), 'PUK: Sjukvårdstjänst → o_skadeplats');
ok((await page.inputValue('#o_underhall')).startsWith('Påfyllning'), 'PUK: Underhållstjänst → o_underhall');
ok(!(await page.inputValue('#o_skadeplats')).includes('Påfyllning'), 'PUK: skadeplats innehåller inte underhåll');
ok((await page.inputValue('#o_var_uppgift')) === 'Bevaka vägkorset.', 'PUK: Vår uppgift (utan nästa rubrik)');
ok((await page.inputValue('#o_civil')) === 'Boende i gårdarna.', 'PUK: Civilläget (sista fältet i sektion 1)');
ok((await page.inputValue('#b_slutligen')) === 'rapportera.', 'PUK: Slutligen stannar före Riktlinjer-rubriken');
ok((await page.inputValue('#b_malb')) === 'Vägkorset under kontroll.', 'PUK: Målbild stannar före Genomförandeidé-rubriken');
ok((await page.inputValue('#b_ril')) === 'Eld endast på min order.', 'PUK: Riktlinjer → RIL');
ok((await page.inputValue('#b_rfi')) === 'Varningsskott tillåtna.', 'PUK: Insatsregler → RFI');
const kort = await page.$$eval('#orderLista .dyn-card', cs => cs.map(c => c.querySelector('input').value + '::' + c.querySelector('textarea').value));
ok(kort.length === 1 && kort[0] === '1 grp::framrycka först.', 'PUK: Order-blocket ger exakt ett kort, prosa-"order" i RIL triggar inte: ' + JSON.stringify(kort));
ok((await page.inputValue('#o_samband')) === 'Plutonsnät kanal 3.', 'PUK: Samband');

// ── Generera OBO
await page.click('.btn-primary');
let out = await page.textContent('#reportOutput');
ok(out.includes('MANÖVER! ORDER!'), 'OBO-utskrift: lystringsgrad');
ok(out.includes('Tid meddelas:') && out.includes('Riktning meddelas: "Norr är dit!"'), 'OBO-utskrift: tid + riktning meddelas');
ok(out.includes('Understöd:         3 grp ksp'), 'OBO-utskrift: Understöd-rad');
ok(out.includes('Underhåll:    Påfyllning'), 'OBO-utskrift: Underhåll-rad');
ok(out.trim().endsWith('SLUT. Tillägg? Frågor? Kontrollfrågor! Framåt!'), 'OBO-utskrift: avslut med kontrollfrågor');
ok((await page.textContent('#resultHeader')) === 'OBO redo att kopieras', 'OBO: resultrubrik');
await page.click('.btn-secondary'); // Redigera

// ── OBK
await page.selectOption('#orderFormat', 'OBK');
ok(await page.isHidden('#fullForm'), 'OBK: fullForm dold');
ok(await page.isVisible('#kortForm'), 'OBK: kortForm synlig');
ok((await page.textContent('#kortMidLetter')) === 'B' && (await page.textContent('#kortMidTitle')) === 'Beslut', 'OBK: mittsektion B/Beslut');
ok((await page.getAttribute('#k_k', 'placeholder')) === 'Ex: ELD!', 'OBK: placeholder K');
ok((await page.textContent('#headerSub')).includes('Kommando'), 'OBK: header-undertext');
await page.fill('#k_o', 'Skyttar skogsbrynet klockan 1');
await page.fill('#k_mid', 'Nedkämpa, samtidigt eldöppnande');
await page.fill('#k_k', 'ELD!');
await page.click('.btn-primary');
out = await page.textContent('#reportOutput');
ok(out.startsWith('ORDER (OBK)'), 'OBK-utskrift: rubrik');
ok(/ORIENTERING\nSkyttar skogsbrynet klockan 1\n\nBESLUT\nNedkämpa, samtidigt eldöppnande\n\nKOMMANDO\nELD!/.test(out), 'OBK-utskrift: tre block');
ok(!out.includes('MANÖVER') && !out.includes('SLUT.'), 'OBK-utskrift: ingen lystringsgrad/avslut');
ok((await page.textContent('#resultHeader')) === 'OBK redo att kopieras', 'OBK: resultrubrik');
await page.click('.btn-secondary');

// ── OSK
await page.selectOption('#orderFormat', 'OSK');
ok((await page.textContent('#kortMidLetter')) === 'S' && (await page.textContent('#kortMidTitle')) === 'Skjutgränser', 'OSK: mittsektion S/Skjutgränser');
ok((await page.getAttribute('#k_mid', 'placeholder')).startsWith('Ex: Skjutgräns vänster'), 'OSK: placeholder S');
await page.fill('#k_mid', 'Skjutgräns vänster STORA GRANEN!');
await page.click('.btn-primary');
out = await page.textContent('#reportOutput');
ok(out.includes('\nSKJUTGRÄNSER\nSkjutgräns vänster STORA GRANEN!\n'), 'OSK-utskrift: SKJUTGRÄNSER-block');
ok(out.includes('ORDER (OSK)'), 'OSK-utskrift: rubrik');
await page.click('.btn-secondary');

// ── Tillbaka till OBO: text i gemensamma/fulla fält kvar
await page.selectOption('#orderFormat', 'OBO');
ok(await page.isVisible('#fullForm') && await page.isHidden('#kortForm'), 'OBO igen: formulär växlat tillbaka');
ok((await page.inputValue('#o_understod')).startsWith('3 grp ksp'), 'OBO igen: ifylld text kvar');
ok((await page.textContent('#headerSub')) === 'Orientering · Beslut · Order', 'OBO igen: header-undertext');

// ── Nollställ (confirm accepteras av dialog-handlern)
await page.selectOption('#orderFormat', 'OSK');
await page.click('.btn-primary');
await page.click('.btn-danger');
ok((await page.inputValue('#orderFormat')) === 'OBO' && await page.isVisible('#fullForm'), 'Nollställ: tillbaka till OBO + fullForm');
ok((await page.inputValue('#o_understod')) === '' && (await page.inputValue('#k_mid')) === '', 'Nollställ: fält tömda');

// Känt, sajtövergripande: frame-ancestors i CSP-<meta> ignoreras av Chromium (pre-existerande, ej obo-specifikt)
const relevantErrors = errors.filter(e => !e.includes("'frame-ancestors' is ignored"));
ok(relevantErrors.length === 0, 'Inga JS-fel: ' + (relevantErrors.join(' | ') || 'rent'));

await browser.close();
server.close();
console.log(fails.length ? `\n${fails.length} FAIL` : '\nALLT GRÖNT');
process.exit(fails.length ? 1 : 0);
