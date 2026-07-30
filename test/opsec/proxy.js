// Loggande deny-all-proxy. All browsertrafik (inklusive service worker-
// fetches) går genom denna — localhost är bypass:ad i Playwright-konfigen.
// Varje extern request loggas till .tmp/external.log och vägras: under
// testet är nätet utanför localhost avstängt på riktigt, och loggen är det
// auktoritativa beviset på egress (roadmap-opsec Fas 3.2, "lokal proxy").
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const TMP = path.join(__dirname, '.tmp');
const LOG = path.join(TMP, 'external.log');
const PORT = parseInt(process.env.OPSEC_PROXY_PORT || '8124', 10);

fs.mkdirSync(TMP, { recursive: true });

function log(line) {
    try { fs.appendFileSync(LOG, line + '\n'); } catch (_) {}
}

const srv = http.createServer((req, res) => {
    log('HTTP ' + req.url);
    res.writeHead(403);
    res.end('denied');
});
srv.on('connect', (req, socket) => {
    log('CONNECT ' + req.url);
    socket.end();
});
srv.listen(PORT, () => console.log('[proxy] deny-all on ' + PORT));
