// tipsa-worker.js — Cloudflare Worker som tar emot formulärposter från
// `tipsa.html` på 7srapport.com och skapar en GitHub Issue automatiskt.
//
// Användaren behöver inte ha GitHub-konto. Tipset hamnar i samma
// Issues-kö som "Lämna ett önskemål"-länken på den publika
// roadmap-sidan, men kommer in via en separat, ej publik kanal.
//
// Konfiguration: se SETUP.md i samma mapp.
//
// Worker secrets / vars (sätts i Cloudflare dashboard eller via wrangler):
//   GITHUB_TOKEN     (secret) — PAT med scope `repo`
//   FORM_SECRET      (secret) — delas med tipsa.html
//   ALLOWED_ORIGIN   (var)    — t.ex. "https://7srapport.com"
//   GITHUB_REPO      (var)    — t.ex. "gitjoda71/7s-rapport"

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    };

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return jsonErr('Method not allowed', 405, corsHeaders);
    }

    // Origin-koll: bara requests från rätt sida släpps igenom
    if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) {
      return jsonErr('Origin ej tillåten', 403, corsHeaders);
    }

    // Läs JSON-payload
    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return jsonErr('Ogiltig JSON', 400, corsHeaders);
    }

    // Shared-secret-koll (extra lager utöver Origin)
    if (env.FORM_SECRET && payload.secret !== env.FORM_SECRET) {
      return jsonErr('Ogiltig token', 403, corsHeaders);
    }

    // Validera fält (trimma + längdspärr som hard cap utöver formulärets maxlength)
    const title = String(payload.title || '').trim().slice(0, 200);
    const body  = String(payload.body  || '').trim().slice(0, 8000);
    const cat   = String(payload.category || '').trim().slice(0, 50);
    const role  = String(payload.role || '').trim().slice(0, 60);
    const name  = String(payload.name || '').trim().slice(0, 100);

    if (!title || !body) {
      return jsonErr('Rubrik och beskrivning krävs', 400, corsHeaders);
    }

    // Bygg Issue
    const issueTitle = buildIssueTitle(cat, title);
    const issueBody  = buildIssueBody(body, name, role, cat);
    const labels     = buildLabels(cat);

    // Skapa Issue via GitHub API
    if (!env.GITHUB_REPO || !env.GITHUB_TOKEN) {
      return jsonErr('Workern är inte konfigurerad (saknar GITHUB_REPO eller GITHUB_TOKEN)', 500, corsHeaders);
    }

    let ghResp;
    try {
      ghResp = await fetch('https://api.github.com/repos/' + env.GITHUB_REPO + '/issues', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + env.GITHUB_TOKEN,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': '7srapport-tipsa-worker',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: labels
        })
      });
    } catch (e) {
      return jsonErr('Kunde inte nå GitHub: ' + (e && e.message ? e.message : e), 502, corsHeaders);
    }

    if (!ghResp.ok) {
      const text = await ghResp.text().catch(() => '');
      return jsonErr('GitHub API-fel (' + ghResp.status + ')', 502, corsHeaders, {
        detail: text.slice(0, 300)
      });
    }

    const issue = await ghResp.json();
    return jsonOk({ issueNumber: issue.number }, corsHeaders);
  }
};

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
  // Lägg också till en kategori-label så det är lätt att triagera
  if (cat && CATEGORY_LABELS[cat]) {
    labels.push('kat:' + cat);
  }
  return labels;
}

function jsonOk(extra, corsHeaders) {
  return new Response(JSON.stringify({ ok: true, ...(extra || {}) }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

function jsonErr(message, status, corsHeaders, extra) {
  return new Response(JSON.stringify({ ok: false, error: message, ...(extra || {}) }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}
