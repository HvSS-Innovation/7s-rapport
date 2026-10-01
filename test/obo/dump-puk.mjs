// Kör en plutonsorder genom PUK-importen och visa vad som blir underlag, strikt ifyllt och gruppval. Från repo-roten: node test/obo/dump-puk.mjs test/puk-exempel.txt
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = process.cwd();
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '')); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const puk = fs.readFileSync(process.argv[2], 'utf8');
const browser = await chromium.launch(); const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/obo.html`, { waitUntil: 'load' });
await page.fill('#pukInput', puk); await page.click('.btn-import');
console.log('FEEDBACK:', await page.textContent('#importFeedback'));
const ids = ['o_motstandaren','o_egna','o_understod','o_terrang','o_vader','o_civil','o_plut_uppgift','o_var_uppgift','b_malb','b_inled','b_darefter','b_slutligen','b_ril','b_rfi','o_skadeplats','o_underhall','o_samband','o_chef_pos'];
for (const id of ids) {
  const falt = await page.inputValue('#' + id);
  const ul = await page.locator(`#ul_${id} .underlag-text`).count() ? await page.textContent(`#ul_${id} .underlag-text`) : '';
  console.log(`[${id}] ${falt ? 'IFYLLT ' + JSON.stringify(falt) : ul ? 'UNDERLAG ' + JSON.stringify(ul) : '(inget)'}`);
}
console.log('GRUPPVAL:', (await page.$$eval('#grpVal .grp-btn', bs => bs.map(b => b.textContent))).join(' | ') || '(inga)');
console.log('ORDER-UNDERLAG:', await page.locator('#ul_orderLista .underlag-text').count() ? JSON.stringify(await page.textContent('#ul_orderLista .underlag-text')) : '(inget)');
console.log('ORDERKORT:', await page.locator('#orderLista .dyn-card').count());
await page.click('.btn-primary');
console.log('ORDTOTAL (inget nedbrutet än):', await page.textContent('#ordTotal'));
await browser.close(); server.close();
