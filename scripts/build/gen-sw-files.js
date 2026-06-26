// ─────────────────────────────────────────────────────────────────────────────
//  gen-sw-files.js
//
//  Auto-genererar FILES-arrayen i service-worker.js från on-disk innehåll.
//  Kör manuellt: `node scripts/build/gen-sw-files.js`
//  (Senare: kan kopplas in som pre-commit hook.)
//
//  Listan har tidigare underhållits för hand — buggrisk: ny sida läggs till
//  och glöms i FILES → cachen seedar inte den, första request misslyckas
//  offline. Det här skriptet eliminerar felklassen.
//
//  In/ut: replacar exakt blocket `const FILES = [ ... ];` i service-worker.js.
//  Allt annat i SW lämnas orört.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// Alltid med, oavsett glob:
const EXTRAS = ['./', './manifest.json'];

// Vad som scannas:
const INCLUDE = [
  { dir: '.',      extensions: ['.html', '.js', '.css'], recursive: false },
  { dir: '.',      files: ['icon.svg', 'favicon.ico', 'ortnamn.json'], recursive: false },
  { dir: 'fonts',  extensions: ['.css', '.woff2'], recursive: true },
  { dir: 'vendor', extensions: ['.js', '.css', '.png'], recursive: true },
  { dir: 'shared', extensions: ['.js', '.css'], recursive: true },
];

// Aldrig med:
const EXCLUDE_FILES = new Set([
  'service-worker.js',      // själv-referens
  'arkitektur-review.html', // engångs-review, ej runtime
  // Privata sidor (delas via hemlig URL, ska inte seedas i alla användares
  // SW-precache). Se README dagbok 2026-05-12 (Cloudflare Worker, pin-wall).
  'tipsa.html',
  'tavla.html',
]);
const EXCLUDE_DIRS = new Set([
  '.git', 'node_modules',
  'docs', 'scripts', 'tools', 'raw', 'stab', 'tests',
  'tccc',          // innehåller bara PDF-källa
  '_scratch',
  'NAV mått',      // legacy untracked
]);

function walk(rel, opts) {
  const out = [];
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return out;
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    const r = rel === '.' ? ent.name : `${rel}/${ent.name}`;
    if (ent.isDirectory()) {
      if (EXCLUDE_DIRS.has(ent.name)) continue;
      if (opts.recursive) out.push(...walk(r, opts));
    } else if (ent.isFile()) {
      if (EXCLUDE_FILES.has(ent.name)) continue;
      const ext = path.extname(ent.name);
      const okExt = !opts.extensions || opts.extensions.includes(ext);
      const okFile = !opts.files || opts.files.includes(ent.name);
      if (opts.extensions && !okExt) continue;
      if (opts.files && !okFile) continue;
      out.push(r);
    }
  }
  return out;
}

let collected = [];
for (const pat of INCLUDE) {
  collected.push(...walk(pat.dir, pat));
}

// Format: './path', deterministisk sortering (top-level först, sen subtree)
collected = collected.map(p => './' + p);
const seen = new Set(EXTRAS);
const unique = [...EXTRAS];
for (const f of collected) {
  if (!seen.has(f)) { seen.add(f); unique.push(f); }
}

// Patcha service-worker.js
const swPath = path.join(ROOT, 'service-worker.js');
const before = fs.readFileSync(swPath, 'utf8');
const arrayBody = unique.map(f => `  '${f}',`).join('\n');
const newBlock = `const FILES = [\n${arrayBody}\n];`;

const replaced = before.replace(/const FILES = \[[\s\S]*?\];/, newBlock);

if (replaced === before) {
  console.error('gen-sw-files: hittade inte FILES-blocket i service-worker.js');
  process.exit(1);
}

if (process.argv.includes('--check')) {
  // Dry-run: skriv inte, exit-koden indikerar drift
  if (replaced !== before) {
    console.error('gen-sw-files: FILES-listan är inte i sync med disken');
    process.exit(2);
  }
  console.log('gen-sw-files: FILES i sync');
} else {
  fs.writeFileSync(swPath, replaced);
  console.log(`gen-sw-files: skrev ${unique.length} paths till service-worker.js`);
}
