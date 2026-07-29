const APP_VERSION = '20260729_063853';
const APP_COMMIT = 'a6358e3bd11dc9adba2238cc71025a9d1bd0ca9e';
document.addEventListener('DOMContentLoaded', () => {
    const el = document.createElement('div');
    el.style.cssText = 'text-align:center;padding:8px 0 16px;font-size:0.65rem;color:#3a5a3a;font-family:monospace';
    let verHtml;
    if (APP_COMMIT) {
        const short = APP_COMMIT.slice(0, 7);
        verHtml = APP_VERSION + ' &middot; <a href="https://github.com/gitjoda71/7s-rapport/tree/' + APP_COMMIT + '" target="_blank" rel="noopener" style="color:#4a7c4a;text-decoration:underline" title="Verifiera kallkoden pa GitHub" aria-label="Verifiera kallkod pa GitHub for version ' + short + '">' + short + '</a>';
    } else {
        verHtml = APP_VERSION;
    }
    // Opsec-länk är samma origin; ingen extern fetch.
    const opsecHtml = ' &middot; <a href="opsec.html" style="color:#4a7c4a;text-decoration:underline" title="Rensa all lokal data fran enheten" aria-label="Glom enheten — rensa all lokal data fran denna enhet">Glom enheten</a>';
    el.innerHTML = verHtml + opsecHtml;
    const c = document.querySelector('.container');
    if (c) {
        c.appendChild(el);
        // Webbplatskarta — alltid längst ner, direkt under versionsnumret.
        const sm = buildSiteMap();
        if (sm) c.appendChild(sm);
    }
});

// ── Webbplatskarta ───────────────────────────────────────────────────────────
// Byggs från lib/nav.js (window.HvNav) så listan aldrig hamnar i otakt med
// menyn. Kollapsad som standard (länkarna ligger ändå i DOM:en för sökmotorer
// och skärmläsare). Hoppas över i symbol-embed-iframes (?mode=embed).
function buildSiteMap() {
    const nav = window.HvNav;
    if (!nav || !Array.isArray(nav.ITEMS) || !Array.isArray(nav.GROUPS)) return null;
    try {
        if (new URLSearchParams(location.search).get('mode') === 'embed') return null;
    } catch (_) { /* URLSearchParams saknas i extremt gamla webbläsare — visa ändå */ }

    const activeFile = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    // Engångs-style: dölj details-markören och ge länkarna hover-stil.
    if (!document.getElementById('hv-sitemap-style')) {
        const st = document.createElement('style');
        st.id = 'hv-sitemap-style';
        st.textContent =
            '.hv-sitemap{max-width:560px;margin:0 auto 28px;padding:10px 4px 0;' +
            'border-top:1px solid var(--border,#1f331f);font-size:0.7rem;line-height:1.6}' +
            '.hv-sitemap>summary{list-style:none;cursor:pointer;text-align:center;' +
            'padding:6px 0;letter-spacing:0.1em;text-transform:uppercase;font-size:0.64rem;' +
            'color:var(--text-muted,#5a7a5a);user-select:none}' +
            '.hv-sitemap>summary::-webkit-details-marker{display:none}' +
            '.hv-sitemap[open]>summary{color:var(--text-secondary,#8aaa8a)}' +
            '.hv-sitemap a{color:var(--text-secondary,#8aaa8a);text-decoration:none}' +
            '.hv-sitemap a:hover{color:var(--accent,#4caf50);text-decoration:underline}';
        document.head.appendChild(st);
    }

    const details = document.createElement('details');
    details.className = 'hv-sitemap';

    const summary = document.createElement('summary');
    summary.textContent = 'Webbplatskarta';
    details.appendChild(summary);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'padding:6px 0 2px';

    // Verktygsgrupper i samma ordning som menyn. System-sidor (Mina data,
    // Roadmap, Glöm enheten m.m.) ligger numera i SYSTEM-gruppen i nav.js och
    // renderas därmed automatiskt här — ingen hårdkodad ÖVRIGT-lista behövs.
    nav.GROUPS.forEach(g => {
        const items = nav.ITEMS.filter(it => it.group === g.id);
        if (!items.length) return;
        wrap.appendChild(buildSiteMapGroup(g.label, items, activeFile));
    });

    details.appendChild(wrap);
    return details;
}

function buildSiteMapGroup(label, links, activeFile) {
    const sec = document.createElement('div');
    sec.style.cssText = 'margin:8px 0';

    const h = document.createElement('div');
    h.textContent = label;
    h.style.cssText = 'font-size:0.58rem;font-weight:700;letter-spacing:0.12em;color:var(--text-muted,#5a7a5a);opacity:0.7;text-align:center;margin-bottom:4px';
    sec.appendChild(h);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:3px 12px';
    links.forEach(l => {
        const hasFragment = l.href.indexOf('#') !== -1;
        const file = (l.href.split('#')[0] || '').toLowerCase();
        // Fragment-länkar (deep-links som Handtecken → ramsor.html#handtecken)
        // förblir klickbara även på samma fil — annars dubbelmarkeras sidan och
        // genvägen försvinner just där den är mest relevant.
        if (!hasFragment && file && file === activeFile) {
            // Nuvarande sida — markerad, ingen länk.
            const span = document.createElement('span');
            span.textContent = l.label;
            span.setAttribute('aria-current', 'page');
            span.style.cssText = 'color:var(--accent,#4caf50);font-weight:600';
            row.appendChild(span);
        } else {
            const a = document.createElement('a');
            a.href = l.href;
            a.textContent = l.label;
            row.appendChild(a);
        }
    });

    sec.appendChild(row);
    return sec;
}
