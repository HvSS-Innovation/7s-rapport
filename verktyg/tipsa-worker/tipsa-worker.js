// tipsa-worker.js — Cloudflare Worker för 7srapport.com.
//
// Fyra endpoints:
//   POST /auth     — validera pin (pin-wall i sidorna)
//   POST /         — ta emot tips från tipsa.html → skapa GitHub Issue
//   GET  /issues   — lista GitHub Issues för tavla.html (kanban)
//   POST /move     — flytta Issue mellan kanban-kolumner från tavla.html
//
// Alla skyddade endpoints kräver att klienten skickar en kod (pin) via
// Authorization: Bearer <PIN>  ELLER  body.pin  (alternativt body.secret
// för bakåtkompat). Koden matchas mot ACCESS_PIN-secreten i Workern.
//
// Worker secrets / vars (sätts i Cloudflare dashboard eller via wrangler):
//   GITHUB_TOKEN     (secret) — PAT med scope `repo`
//   ACCESS_PIN       (secret) — pin som mottagarna matar in i pin-wall
//                               (primär — använd denna sedan v0.6)
//   FORM_SECRET      (secret) — bakåtkompat, fallback om ACCESS_PIN saknas
//   ALLOWED_ORIGIN   (var)    — t.ex. "https://7srapport.com"
//   GITHUB_REPO      (var)    — t.ex. "gitjoda71/7s-rapport"
//
// KV-binding (lagring av kanban-ordning, sedan v0.8):
//   KANBAN_KV        (KV)     — namespace för manuell prio-ordning per kolumn
//
// Kanban-kolumner mappas så här:
//   Issue closed                                   → Klart
//   Issue open + label "status:inprogress"         → Pågår
//   Issue open + label "status:soon"               → Kommer snart
//   Övriga öppna issues (inkl. label status:wished) → Önskat

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const cors = corsHeadersFor(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // POST /auth → testa pin utan side-effects (pin-wall i sidorna)
    if (path === '/auth' && request.method === 'POST') {
      return handleAuth(request, env, cors);
    }
    // POST / → tipsa
    if (path === '/' && request.method === 'POST') {
      return handleTipsa(request, env, cors);
    }
    // GET /issues → lista
    if (path === '/issues' && request.method === 'GET') {
      return handleListIssues(request, env, cors);
    }
    // POST /move → flytta
    if (path === '/move' && request.method === 'POST') {
      return handleMove(request, env, cors);
    }
    // POST /reorder → spara ny ordning för en kolumn (KV-baserad)
    if (path === '/reorder' && request.method === 'POST') {
      return handleReorder(request, env, cors);
    }

    return jsonErr('Method not allowed', 405, cors);
  }
};

// ── /auth  (pin-wall validering) ─────────────────────────────────────

async function handleAuth(request, env, cors) {
  if (!originOk(request, env)) return jsonErr('Origin ej tillåten', 403, cors);
  let payload;
  try { payload = await request.json(); } catch (e) {
    return jsonErr('Ogiltig JSON', 400, cors);
  }
  if (!secretOk(extractSecret(request, payload), env)) {
    return jsonErr('Fel kod', 403, cors);
  }
  return jsonOk({}, cors);
}

// ── /  (tipsa) ───────────────────────────────────────────────────────

async function handleTipsa(request, env, cors) {
  if (!originOk(request, env)) return jsonErr('Origin ej tillåten', 403, cors);

  let payload;
  try { payload = await request.json(); } catch (e) {
    return jsonErr('Ogiltig JSON', 400, cors);
  }
  if (!secretOk(extractSecret(request, payload), env)) return jsonErr('Ogiltig kod', 403, cors);

  const title = String(payload.title || '').trim().slice(0, 200);
  const body  = String(payload.body  || '').trim().slice(0, 8000);
  const cat   = String(payload.category || '').trim().slice(0, 50);
  const role  = String(payload.role || '').trim().slice(0, 60);
  const name  = String(payload.name || '').trim().slice(0, 100);

  if (!title || !body) return jsonErr('Rubrik och beskrivning krävs', 400, cors);

  if (!env.GITHUB_REPO || !env.GITHUB_TOKEN) {
    return jsonErr('Workern är inte konfigurerad', 500, cors);
  }

  const issueTitle = buildIssueTitle(cat, title);
  const issueBody  = buildIssueBody(body, name, role, cat);
  const labels     = buildLabels(cat);

  const r = await fetch(ghUrl(env, '/issues'), {
    method: 'POST',
    headers: ghHeaders(env, true),
    body: JSON.stringify({ title: issueTitle, body: issueBody, labels })
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    return jsonErr('GitHub API-fel (' + r.status + ')', 502, cors, { detail: text.slice(0, 300) });
  }
  const issue = await r.json();
  return jsonOk({ issueNumber: issue.number }, cors);
}

// ── /issues  (lista för kanban) ──────────────────────────────────────

async function handleListIssues(request, env, cors) {
  if (!originOk(request, env)) return jsonErr('Origin ej tillåten', 403, cors);

  // Pin via Authorization: Bearer <pin>
  if (!secretOk(extractSecret(request, null), env)) return jsonErr('Ogiltig kod', 403, cors);

  if (!env.GITHUB_REPO || !env.GITHUB_TOKEN) {
    return jsonErr('Workern är inte konfigurerad', 500, cors);
  }

  // Hämta open + closed parallellt
  const [openR, closedR] = await Promise.all([
    fetch(ghUrl(env, '/issues?state=open&per_page=100'),  { headers: ghHeaders(env) }),
    fetch(ghUrl(env, '/issues?state=closed&per_page=30'), { headers: ghHeaders(env) })
  ]);
  if (!openR.ok || !closedR.ok) {
    return jsonErr('GitHub API-fel', 502, cors, {
      detail: 'open=' + openR.status + ' closed=' + closedR.status
    });
  }
  const openItems   = await openR.json();
  const closedItems = await closedR.json();

  // GitHub blandar Issues och PRs i samma endpoint — filtrera bort PRs.
  const isPR = x => !!x.pull_request;
  const all = [...openItems, ...closedItems].filter(x => !isPR(x));

  const items = all.map(toItem);

  // Berika med position-fält från KV (om binding är konfigurerad)
  let order = null;
  if (env.KANBAN_KV) {
    try { order = await env.KANBAN_KV.get('order', 'json'); } catch (_) { /* om KV inte fungerar, fall tillbaka till default-sort */ }
  }
  if (order) {
    for (const item of items) {
      const colOrder = order[item.column];
      if (Array.isArray(colOrder)) {
        const idx = colOrder.indexOf(item.number);
        if (idx >= 0) item.position = idx;
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, items }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}

// ── /reorder  (manuell prio-ordning per kolumn, lagrad i KV) ────────

async function handleReorder(request, env, cors) {
  if (!originOk(request, env)) return jsonErr('Origin ej tillåten', 403, cors);

  let payload;
  try { payload = await request.json(); } catch (e) {
    return jsonErr('Ogiltig JSON', 400, cors);
  }
  if (!secretOk(extractSecret(request, payload), env)) return jsonErr('Ogiltig kod', 403, cors);

  const column = String(payload.column || '').trim();
  if (!['wished', 'soon', 'inprogress', 'done'].includes(column)) {
    return jsonErr('Ogiltig kolumn', 400, cors);
  }
  if (!Array.isArray(payload.orderedNumbers)) {
    return jsonErr('orderedNumbers (array) krävs', 400, cors);
  }
  const orderedNumbers = payload.orderedNumbers
    .map(n => parseInt(n, 10))
    .filter(n => Number.isInteger(n) && n > 0);

  if (!env.KANBAN_KV) {
    return jsonErr('KV-binding KANBAN_KV saknas — se SETUP.md', 500, cors);
  }

  // Slå ihop med existerande ordning för övriga kolumner
  let existing = null;
  try { existing = await env.KANBAN_KV.get('order', 'json'); } catch (_) {}
  if (!existing || typeof existing !== 'object') existing = {};
  existing[column] = orderedNumbers;

  await env.KANBAN_KV.put('order', JSON.stringify(existing));

  return jsonOk({ column, count: orderedNumbers.length }, cors);
}

// ── /move  (flytta mellan kolumner) ─────────────────────────────────

async function handleMove(request, env, cors) {
  if (!originOk(request, env)) return jsonErr('Origin ej tillåten', 403, cors);

  let payload;
  try { payload = await request.json(); } catch (e) {
    return jsonErr('Ogiltig JSON', 400, cors);
  }
  if (!secretOk(extractSecret(request, payload), env)) return jsonErr('Ogiltig kod', 403, cors);

  const issueNumber = parseInt(payload.issueNumber, 10);
  const target = String(payload.target || '').trim();
  const validTargets = ['wished', 'soon', 'inprogress', 'done'];
  if (!issueNumber || !validTargets.includes(target)) {
    return jsonErr('Ogiltigt request', 400, cors);
  }

  if (!env.GITHUB_REPO || !env.GITHUB_TOKEN) {
    return jsonErr('Workern är inte konfigurerad', 500, cors);
  }

  // 1) Hämta nuvarande issue
  const curR = await fetch(ghUrl(env, '/issues/' + issueNumber), { headers: ghHeaders(env) });
  if (!curR.ok) return jsonErr('Kunde inte hämta Issue ' + issueNumber, 502, cors);
  const issue = await curR.json();

  // 2) Ta bort alla existerande status:*-labels
  const existing = (issue.labels || []).map(l => typeof l === 'string' ? l : l.name);
  for (const l of existing.filter(x => x.startsWith('status:'))) {
    await fetch(ghUrl(env, '/issues/' + issueNumber + '/labels/' + encodeURIComponent(l)), {
      method: 'DELETE',
      headers: ghHeaders(env)
    });
  }

  // 3) Sätt nytt tillstånd
  if (target === 'done') {
    // Closa issuet — status:* tas redan bort ovan
    const r = await fetch(ghUrl(env, '/issues/' + issueNumber), {
      method: 'PATCH',
      headers: ghHeaders(env, true),
      body: JSON.stringify({ state: 'closed', state_reason: 'completed' })
    });
    if (!r.ok) return jsonErr('Kunde inte stänga issue', 502, cors);
  } else {
    // Öppna issuet om den är closed
    if (issue.state === 'closed') {
      const r = await fetch(ghUrl(env, '/issues/' + issueNumber), {
        method: 'PATCH',
        headers: ghHeaders(env, true),
        body: JSON.stringify({ state: 'open' })
      });
      if (!r.ok) return jsonErr('Kunde inte öppna issue', 502, cors);
    }
    // Lägg till önskad status-label (om något — wished är default utan label)
    const newLabel = target === 'wished' ? null : 'status:' + target;
    if (newLabel) {
      const r = await fetch(ghUrl(env, '/issues/' + issueNumber + '/labels'), {
        method: 'POST',
        headers: ghHeaders(env, true),
        body: JSON.stringify({ labels: [newLabel] })
      });
      if (!r.ok) return jsonErr('Kunde inte sätta label', 502, cors);
    }
  }

  // Returnera nya item-state
  const finalR = await fetch(ghUrl(env, '/issues/' + issueNumber), { headers: ghHeaders(env) });
  const finalIssue = await finalR.json();
  return jsonOk({ item: toItem(finalIssue) }, cors);
}

// ── helpers ──────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  onskemal:    'Önskemål',
  ramsa:       'Förslag-ramsa',
  bugg:        'Bugg',
  forbattring: 'Förbättring',
  ovrigt:      'Övrigt'
};

function buildIssueTitle(cat, title) {
  const tag = CATEGORY_LABELS[cat] || 'Tips';
  return '[Tipsa] [' + tag + '] ' + title;
}

function buildIssueBody(body, name, role, cat) {
  const lines = [
    body,
    '',
    '---',
    name ? '**Från:** ' + name : '**Från:** _anonym_',
    role ? '**Roll:** ' + role : null,
    cat  ? '**Kategori:** ' + (CATEGORY_LABELS[cat] || cat) : null,
    '**Inkommet via:** privat tipsa-sida (utvalda mottagare)',
    '**Tidpunkt:** ' + new Date().toISOString()
  ].filter(Boolean);
  return lines.join('\n');
}

function buildLabels(cat) {
  const labels = ['tipsa'];
  if (cat && CATEGORY_LABELS[cat]) labels.push('kat:' + cat);
  return labels;
}

// Mappa GitHub-issue → kanban-item (det vi exponerar för tavla.html)
function toItem(issue) {
  const labels = (issue.labels || []).map(l => typeof l === 'string' ? l : l.name);
  let column = 'wished';
  if (issue.state === 'closed')                 column = 'done';
  else if (labels.includes('status:inprogress')) column = 'inprogress';
  else if (labels.includes('status:soon'))       column = 'soon';
  else                                           column = 'wished';

  return {
    number:  issue.number,
    title:   issue.title || '',
    body:    String(issue.body || '').slice(0, 2000),
    url:     issue.html_url,
    state:   issue.state,
    column:  column,
    labels:  labels,
    created: issue.created_at,
    updated: issue.updated_at,
    closed:  issue.closed_at || null
  };
}

function originOk(request, env) {
  if (!env.ALLOWED_ORIGIN) return true;
  const origin = request.headers.get('Origin') || '';
  if (!origin) return true; // tillåt om Origin saknas helt (ex. nyfiken curl)
  return origin === env.ALLOWED_ORIGIN;
}

// Kontrollerar inkommande "secret" mot serverns konfigurerade kod(er).
// Sedan v0.6 är ACCESS_PIN primär — användaren matar in den i pin-wall
// och den lagras BARA i sessionStorage på klienten + Worker-secrets.
// FORM_SECRET behålls som fallback för bakåtkompat under övergången.
function secretOk(value, env) {
  if (!value) return false;
  if (env.ACCESS_PIN) return value === env.ACCESS_PIN;
  if (env.FORM_SECRET) return value === env.FORM_SECRET;
  return true; // ingen secret satt = öppet
}

// Extrahera secret från (i prioritetsordning):
//   1) Authorization: Bearer <X>
//   2) payload.pin
//   3) payload.secret  (bakåtkompat)
function extractSecret(request, payload) {
  const auth = request.headers.get('Authorization') || '';
  const fromAuth = auth.replace(/^Bearer\s+/i, '').trim();
  if (fromAuth) return fromAuth;
  if (payload && payload.pin) return String(payload.pin);
  if (payload && payload.secret) return String(payload.secret);
  return null;
}

function corsHeadersFor(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

function ghUrl(env, path) {
  return 'https://api.github.com/repos/' + env.GITHUB_REPO + path;
}

function ghHeaders(env, withJson) {
  const h = {
    'Authorization': 'Bearer ' + env.GITHUB_TOKEN,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': '7srapport-tipsa-worker'
  };
  if (withJson) h['Content-Type'] = 'application/json';
  return h;
}

function jsonOk(extra, cors) {
  return new Response(JSON.stringify({ ok: true, ...(extra || {}) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}

function jsonErr(message, status, cors, extra) {
  return new Response(JSON.stringify({ ok: false, error: message, ...(extra || {}) }), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors }
  });
}
