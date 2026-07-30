// Statisk testserver för OPSEC-invariant-testet: serverar repo-roten på /
// och test/opsec/fixtures på /testdata/. Range-stöd krävs för .pmtiles.
// Loggar varje request till .tmp/requests.log — testet använder loggen som
// bevis på vilka anrop som faktiskt nådde servern.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const FIXTURES = path.join(__dirname, 'fixtures');
const TMP = path.join(__dirname, '.tmp');
const LOG = path.join(TMP, 'requests.log');
const PORT = parseInt(process.env.OPSEC_TEST_PORT || '8123', 10);

fs.mkdirSync(TMP, { recursive: true });

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.pmtiles': 'application/octet-stream'
};

http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    try { fs.appendFileSync(LOG, urlPath + '\n'); } catch (_) {}
    let file;
    if (urlPath.startsWith('/testdata/')) {
        file = path.join(FIXTURES, urlPath.slice('/testdata/'.length));
    } else {
        file = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath.slice(1));
    }
    fs.stat(file, (err, st) => {
        if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
        const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
        const range = req.headers.range;
        if (range) {
            const m = /bytes=(\d+)-(\d*)/.exec(range);
            if (m) {
                const start = parseInt(m[1], 10);
                const end = m[2] ? parseInt(m[2], 10) : st.size - 1;
                res.writeHead(206, {
                    'Content-Type': type,
                    'Content-Length': end - start + 1,
                    'Content-Range': `bytes ${start}-${end}/${st.size}`,
                    'Accept-Ranges': 'bytes'
                });
                fs.createReadStream(file, { start, end }).pipe(res);
                return;
            }
        }
        res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Accept-Ranges': 'bytes' });
        fs.createReadStream(file).pipe(res);
    });
}).listen(PORT, () => console.log('[server] http://localhost:' + PORT));
