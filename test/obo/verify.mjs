// Headless verifiering av obo.html (OBO/OBK/OSK, PUK-import som underlag, gruppval, ordräkning, utskrift). Kör från repo-roten: node test/obo/verify.mjs
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

const BUDGET = ['o_motstandaren', 'o_egna', 'o_understod', 'o_terrang', 'o_vader', 'o_civil', 'b_malb', 'b_inled', 'b_darefter', 'b_slutligen', 'b_ril', 'o_skadeplats', 'o_underhall', 'o_samband', 'o_chef_pos'];
const ul = id => page.textContent(`#ul_${id} .underlag-text`);
const val = id => page.inputValue('#' + id);

// ── Default OBO
ok(await page.isVisible('#fullForm'), 'OBO: fullForm synlig');
ok(await page.isHidden('#kortForm'), 'OBO: kortForm dold');
ok((await page.textContent('#formatHint')).includes('5-punktsorder'), 'OBO: formatHint satt');
ok((await page.locator('.xfer').count()) >= 14, 'OBO: överföringsgrad-badges renderade (' + await page.locator('.xfer').count() + ')');
ok((await page.locator('.xfer[aria-hidden="true"]').count()) === (await page.locator('.xfer').count()), 'Badges: alla aria-hidden');
ok((await page.locator('.ordrakn').count()) === BUDGET.length, 'Ordräknare: en per bryt ner/viktigaste-fält');
ok(await page.isHidden('#ulToggle'), 'Underlag-knappen dold före import');

// ── PUK-import: underlag, inte innehåll
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
2 grp: kontrollplats vägkorset.
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

const tomma = [];
for (const id of BUDGET) if (await val(id)) tomma.push(id);
ok(tomma.length === 0, 'Import: inga bryt ner/viktigaste-fält fylls i' + (tomma.length ? ' — ifyllda: ' + tomma.join(',') : ''));
ok((await ul('o_understod')).startsWith('3 grp ksp'), 'Underlag: Understöd');
ok(!(await ul('o_egna')).includes('Understöd'), 'Underlag: Egna innehåller inte Understöd-raden');
ok((await ul('o_motstandaren')).includes('granatkastare'), 'Underlag: "med understöd" mitt i Fi-raden stannar i Fi');
ok(!(await ul('o_understod')).includes('granatkastare'), 'Underlag: Understöd tar inte prosa-"understöd" ur Fi');
ok((await ul('o_skadeplats')).startsWith('Skadade tas'), 'Underlag: Sjukvårdstjänst → Skadeplatsen');
ok((await ul('o_underhall')).startsWith('Påfyllning'), 'Underlag: Underhållstjänst → Underhåll');
ok(!(await ul('o_skadeplats')).includes('Påfyllning'), 'Underlag: skadeplats innehåller inte underhåll');
ok((await ul('o_civil')) === 'Boende i gårdarna.', 'Underlag: Civilläget (sista fältet i sektion 1)');
ok((await ul('b_slutligen')) === 'rapportera.', 'Underlag: Slutligen stannar före Riktlinjer-rubriken');
ok((await ul('b_malb')) === 'Vägkorset under kontroll.', 'Underlag: Målbild stannar före Genomförandeidé-rubriken');
ok((await ul('b_ril')) === 'Eld endast på min order.', 'Underlag: Riktlinjer → RIL');
ok((await ul('o_samband')) === 'Plutonsnät kanal 3.', 'Underlag: Samband');
ok((await page.textContent('#ul_o_civil summary')) === 'Ur plutonsordern – Civilläget (3 ord)', 'Underlag: rubrik med fältnamn och ordantal');
ok((await page.textContent('#importFeedback')).includes('2 strikta fält ifyllda'), 'Feedback: två strikta fält utan gruppval');
ok(!(await page.locator('#ul_o_civil').getAttribute('open') !== null), 'Underlag: hopfällt som default');

// Strikt-fälten
ok((await val('o_plut_uppgift')) === 'Bevaka vägkorset.', 'Strikt: PlutO sektion 2 → Plutonens uppgift');
ok((await val('b_rfi')) === 'Varningsskott tillåtna.', 'Strikt: Insatsregler → RFI');
ok((await val('o_var_uppgift')) === '', 'Strikt: VÅR UPPGIFT tom tills grupp valts');

// Gruppval + plutonens rader blir inte orderkort
const knappar = await page.$$eval('#grpVal .grp-btn', bs => bs.map(b => b.textContent));
ok(JSON.stringify(knappar) === '["1 grp","2 grp"]', 'Gruppval: en knapp per IGU-rad, prosa-"order" i RIL triggar inte: ' + JSON.stringify(knappar));
await page.click('#grpVal .grp-btn:has-text("2 grp")');
ok((await val('o_var_uppgift')) === 'kontrollplats vägkorset.', 'Gruppval: vald rad → VÅR UPPGIFT ordagrant');
ok((await page.locator('#grpVal .grp-btn.active').textContent()) === '2 grp', 'Gruppval: vald knapp markerad');
const kort = await page.$$eval('#orderLista .dyn-card', cs => cs.map(c => c.querySelector('input').value + c.querySelector('textarea').value));
ok(kort.length === 2 && kort.every(k => k === ''), 'Orderkort: plutonens rader skapar inga kort (två tomma standardkort kvar)');
ok((await ul('orderLista')).includes('1 grp: framrycka först.'), 'Underlag: plutonens order till grupperna visas vid orderkorten');

// Fäll ut / ihop
ok(await page.isVisible('#ulToggle'), 'Underlag-knappen synlig efter import');
await page.click('#ulToggle');
ok(await page.$$eval('.underlag', ds => ds.every(d => d.open)), 'Fäll ut allt: alla underlag öppna');
ok((await page.textContent('#ulToggle')) === 'Fäll ihop allt underlag', 'Fäll ut allt: knapptext växlar');

// Kopiera hit + ordräknare
await page.click('#ul_o_understod button');
ok((await val('o_understod')).startsWith('3 grp ksp'), 'Kopiera hit: underlaget hamnar i fältet');
ok((await page.textContent('#or_o_understod')) === '5 ord', 'Ordräknare: uppdateras vid Kopiera hit');
await page.click('#ul_o_underhall button');
await page.fill('#o_egna', Array.from({ length: 25 }, (_, i) => 'ord' + i).join(' '));
ok((await page.textContent('#or_o_egna')).startsWith('25 ord – korta') && await page.$eval('#or_o_egna', e => e.classList.contains('over')), 'Ordräknare: över riktmärket varnar');
await page.fill('#o_egna', 'Kompaniet bevakar objektet.');
ok((await page.textContent('#or_o_egna')) === '3 ord' && !(await page.$eval('#or_o_egna', e => e.classList.contains('over'))), 'Ordräknare: under riktmärket ingen varning');

// ── Generera OBO
await page.click('.btn-primary');
let out = await page.textContent('#reportOutput');
ok(out.includes('MANÖVER! ORDER!'), 'OBO-utskrift: lystringsgrad');
ok(out.includes('Tid meddelas:') && out.includes('Riktning meddelas: "Norr är dit!"'), 'OBO-utskrift: tid + riktning meddelas');
ok(out.includes('Understöd:         3 grp ksp'), 'OBO-utskrift: Understöd-rad');
ok(out.includes('Underhåll:    Påfyllning'), 'OBO-utskrift: Underhåll-rad');
ok(out.includes('Plutonens uppgift: Bevaka vägkorset.') && out.includes('VÅR UPPGIFT:       kontrollplats vägkorset.'), 'OBO-utskrift: plutonens och gruppens uppgift på rätt rad');
ok(out.includes('Fi:                -') && !out.includes('granatkastare') && !out.includes('Ur plutonsordern'), 'OBO-utskrift: underlag läcker inte ut i ordern');
ok(out.trim().endsWith('SLUT. Tillägg? Frågor? Kontrollfrågor! Framåt!'), 'OBO-utskrift: avslut med kontrollfrågor');
ok((await page.textContent('#resultHeader')) === 'OBO redo att kopieras', 'OBO: resultrubrik');
const tot = await page.textContent('#ordTotal');
ok(/^\d+ ord · plutonsordern \d+ ord \(\d+ %\)$/.test(tot) && !(await page.$eval('#ordTotal', e => e.classList.contains('over'))), 'Ordtotal: jämförs mot plutonsordern utan varning: ' + tot);
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
ok((await page.textContent('#ordTotal')) === '8 ord', 'OBK: ordtotal utan jämförelse');
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

// ── Tillbaka till OBO: text och underlag kvar
await page.selectOption('#orderFormat', 'OBO');
ok(await page.isVisible('#fullForm') && await page.isHidden('#kortForm'), 'OBO igen: formulär växlat tillbaka');
ok((await val('o_understod')).startsWith('3 grp ksp') && (await page.locator('.underlag').count()) > 10, 'OBO igen: ifylld text och underlag kvar');
ok((await page.textContent('#headerSub')) === 'Orientering · Beslut · Order', 'OBO igen: header-undertext');

// ── Nollställ (confirm accepteras av dialog-handlern)
await page.selectOption('#orderFormat', 'OSK');
await page.click('.btn-primary');
await page.click('.btn-danger');
ok((await val('orderFormat')) === 'OBO' && await page.isVisible('#fullForm'), 'Nollställ: tillbaka till OBO + fullForm');
ok((await val('o_understod')) === '' && (await val('k_mid')) === '', 'Nollställ: fält tömda');
ok((await page.locator('.underlag').count()) === 0 && (await page.locator('#grpVal .grp-btn').count()) === 0 && await page.isHidden('#ulToggle'), 'Nollställ: underlag, gruppval och knapp borta');
ok((await page.textContent('#or_o_understod')) === '', 'Nollställ: ordräknare nollade');

// ── Från-fältet väljer grupp direkt; avskrift av plutonsordern varnas
await page.fill('#fran', '2a grp');
await page.fill('#pukInput', puk);
await page.click('.btn-import');
ok((await val('o_var_uppgift')) === 'kontrollplats vägkorset.', 'Gruppval: Från "2A GRP" väljer 2 grp direkt');
ok((await page.textContent('#importFeedback')).includes('3 strikta fält ifyllda'), 'Feedback: autovald grupp räknas som strikt fält');
ok((await page.getAttribute('#grpVal .grp-btn.active', 'aria-pressed')) === 'true', 'Gruppval: aria-pressed på vald knapp');

// Omimport av rättad order: orörda strikt-fält följer med, egen text behålls
const puk2 = puk.replace('Varningsskott tillåtna.', 'Varningsskott EJ tillåtna.').replace('kontrollplats vägkorset.', 'kontrollplats vid bron.');
await page.fill('#pukInput', puk2);
await page.click('.btn-import');
ok((await val('b_rfi')) === 'Varningsskott EJ tillåtna.', 'Omimport: orört RFI uppdateras till ny lydelse');
ok((await val('o_var_uppgift')) === 'kontrollplats vid bron.', 'Omimport: tidigare vald grupp följer med till ny lydelse');
ok((await page.locator('.underlag').count()) === 15, 'Omimport: underlagen dubbleras inte');
await page.fill('#b_rfi', 'Min egen lydelse.');
await page.fill('#pukInput', puk);
await page.click('.btn-import');
ok((await val('b_rfi')) === 'Min egen lydelse.' && (await ul('b_rfi')) === 'Varningsskott tillåtna.', 'Omimport: egen RFI-text behålls, plutonsorderns lydelse som underlag');
ok((await page.textContent('#importFeedback')).includes('behöll din text'), 'Omimport: feedbacken säger att egen text behölls');
await page.evaluate(() => { document.getElementById('ul_b_rfi').open = true; });
await page.click('#ul_b_rfi button');
ok((await val('b_rfi')) === 'Varningsskott tillåtna.', 'Omimport: "Använd denna lydelse" ersätter egen text');
await page.fill('#b_rfi', 'Varningsskott tillåtna.');
await page.click('#ulToggle'); // knapparna syns först när underlagen är utfällda
for (const b of await page.$$('.underlag button')) await b.click();
await page.click('.btn-primary');
const tot2 = await page.textContent('#ordTotal');
ok(tot2.endsWith('– bryt ner mer') && await page.$eval('#ordTotal', e => e.classList.contains('over')), 'Ordtotal: avskrift av plutonsordern varnas: ' + tot2);
await page.click('.btn-danger');

await page.fill('#fran', '12 grp');
await page.fill('#pukInput', puk);
await page.click('.btn-import');
ok((await val('o_var_uppgift')) === '', 'Gruppval: Från "12 GRP" väljer inte 2 grp');

// Underlag öppnade ett och ett: knapptexten följer verkligt läge
await page.evaluate(() => document.querySelectorAll('.underlag').forEach(d => { d.open = true; }));
await page.waitForFunction(() => document.getElementById('ulToggle').textContent === 'Fäll ihop allt underlag');
ok(true, 'Fäll ut: knapptexten följer med när underlagen öppnas för hand');

// ── Kantfall i plutonsorderns form
const nollstall = () => page.evaluate(() => clearAll());
await nollstall();
await page.fill('#fran', 'AQ');
await page.fill('#pukInput', `1. ORIENTERING
Fi: Okänd.
Vår uppgift: Plutonen bevakar bron.

3. GENOMFÖRANDE
Inledningsvis: framrycka.
Insatsregler
Enligt bilaga.
Order
***: Samtliga bär skyddsväst.
1 grp: Post vid bron.
Beredd: understödja 2 grp.
2 grp: Reserv.
`);
await page.click('.btn-import');
ok((await val('o_plut_uppgift')) === 'Plutonen bevakar bron.' && (await val('o_var_uppgift')) === '', 'Kantfall: "Vår uppgift:" under ORIENTERING → Plutonens uppgift, inget falskt autoval');
const knappar2 = await page.$$eval('#grpVal .grp-btn', bs => bs.map(b => b.textContent));
ok(JSON.stringify(knappar2) === '["1 grp","2 grp"]', 'Kantfall: Order sist i sektionen hittas; "Beredd:" och "***" blir inga knappar: ' + JSON.stringify(knappar2));
await page.click('#grpVal .grp-btn:has-text("1 grp")');
ok((await val('o_var_uppgift')) === 'Post vid bron. Beredd: understödja 2 grp.', 'Kantfall: Beredd-raden följer med gruppens uppgift');
ok((await val('b_rfi')) === 'Enligt bilaga.', 'Kantfall: Insatsregler före Order');

// Fritext-genomförande: plutonsorderns ord räknas en gång
await nollstall();
await page.fill('#pukInput', `3. GENOMFÖRANDE
Plutonen framrycker till bron och grupperar för försvar där.
Insatsregler
Eld endast i självförsvar.
`);
await page.click('.btn-import');
await page.click('.btn-primary');
ok((await page.textContent('#ordTotal')).includes('plutonsordern 14 ord'), 'Ordtotal: fritext-sektion dubbelräknas inte: ' + await page.textContent('#ordTotal'));
await page.click('.btn-secondary');

// Känt, sajtövergripande: frame-ancestors i CSP-<meta> ignoreras av Chromium (pre-existerande, ej obo-specifikt)
const relevantErrors = errors.filter(e => !e.includes("'frame-ancestors' is ignored"));
ok(relevantErrors.length === 0, 'Inga JS-fel: ' + (relevantErrors.join(' | ') || 'rent'));

await browser.close();
server.close();
console.log(fails.length ? `\n${fails.length} FAIL` : '\nALLT GRÖNT');
process.exit(fails.length ? 1 : 0);
