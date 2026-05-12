// footer.js — gemensam sidfot för alla tabs.
// Konfigurera per sida innan denna laddas:
//   <script>window.FORM_ID = { title: 'VADER', body: 'VADER' };</script>
//   <script src="footer.js"></script>
// title styr GitHub-issue-titeln, body styr formularnamnet i issue-bodyn.
// body är valfritt och defaultar till title.

// --- iOS ITP-notis -------------------------------------------------------
// Apples Intelligent Tracking Prevention kan rensa lokal data efter ~7
// dagars inaktivitet — även för installerade PWA-appar. Om vi upptäcker
// iOS-användare som varit borta >5 dagar visar vi en mild banner som
// rekommenderar säkerhetskopia. Engångsnotis per återbesök (sessionStorage).
(function () {
    try {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (!isIOS) return;

        const FIVE_DAYS = 5 * 24 * 3600 * 1000;
        const now = Date.now();
        const lastSeenRaw = localStorage.getItem('hv_lastSeen');
        const lastSeen = lastSeenRaw ? parseInt(lastSeenRaw, 10) : 0;
        localStorage.setItem('hv_lastSeen', String(now));

        // Är vi på data.html själva? Då är banner överflödig.
        if (location.pathname.endsWith('data.html')) return;

        const inactiveLong = lastSeen > 0 && (now - lastSeen) > FIVE_DAYS;
        if (!inactiveLong) return;

        if (sessionStorage.getItem('hv_itpNotisDismissed') === '1') return;

        document.addEventListener('DOMContentLoaded', () => {
            const banner = document.createElement('div');
            banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;background:#0a1a2a;border-top:1px solid #1f4566;color:#a8d0ff;padding:12px 16px;font-family:inherit;font-size:0.84rem;line-height:1.45;z-index:9000;box-shadow:0 -4px 16px rgba(0,0,0,0.4)';
            banner.innerHTML =
                '<div style="max-width:600px;margin:0 auto;display:flex;gap:12px;align-items:center;flex-wrap:wrap">' +
                '<div style="flex:1;min-width:200px"><strong style="color:#c8e0ff">Tips för iPhone:</strong> Apples ITP kan rensa lokal data efter ~7 dagars inaktivitet. <a href="data.html" style="color:#90c0ff;font-weight:600">Ladda ner en säkerhetskopia →</a></div>' +
                '<button id="hv-itp-dismiss" style="background:transparent;border:1px solid #1f4566;color:#a8d0ff;padding:6px 12px;border-radius:6px;font-family:inherit;font-size:0.82rem;cursor:pointer">Stäng</button>' +
                '</div>';
            document.body.appendChild(banner);
            const dismissBtn = banner.querySelector('#hv-itp-dismiss');
            if (dismissBtn) dismissBtn.addEventListener('click', () => {
                sessionStorage.setItem('hv_itpNotisDismissed', '1');
                banner.remove();
            });
        });
    } catch (_) { /* iOS-notis är best-effort, inte säkerhetskritisk */ }
})();

(function () {
    const FORM = window.FORM_ID || { title: '7S' };
    const title = FORM.title;
    const body = FORM.body || title;

    function buildFeedbackUrl() {
        const t = encodeURIComponent('[Beta-Feedback] ' + title);
        const b = encodeURIComponent('**Form:** ' + body + '\n\n**Beskriv problemet/förslaget:**');
        return 'https://github.com/gitjoda71/7s-rapport/issues/new?title=' + t + '&body=' + b;
    }

    document.addEventListener('DOMContentLoaded', () => {
        const c = document.querySelector('.container');
        if (!c) return;

        const footer = document.createElement('footer');
        footer.style.cssText = 'margin-top:24px;padding:0 0 32px;text-align:center;font-size:0.7rem;color:var(--text-muted);line-height:1.6';

        // Positionerings-disclaimer (Paket D) — synlig direkt i sidfoten
        // utan att man behöver öppna Om-sektionen. Tonen är diskret men
        // texten är otvetydig: detta är ett självständigt verktyg.
        const disclaimer = document.createElement('p');
        disclaimer.textContent = 'Privatutvecklat utbildnings- och minneshjälpverktyg. Inte kopplat till eller fastställt av Försvarsmakten.';
        disclaimer.style.cssText = 'font-size:0.65rem;color:var(--text-muted);opacity:0.75;margin-bottom:6px;max-width:480px;margin-left:auto;margin-right:auto';

        // Integritetsnot
        const priv = document.createElement('p');
        priv.textContent = 'Ingen data skickas eller lagras utanför din enhet.';
        priv.style.cssText = 'font-size:0.65rem;color:var(--text-muted);opacity:0.7;margin-bottom:12px';

        // Feedback-länk
        const fb = document.createElement('a');
        fb.href = buildFeedbackUrl();
        fb.target = '_blank';
        fb.rel = 'noopener noreferrer';
        fb.textContent = 'Bugg eller förslag? Lämna feedback →';
        fb.style.cssText = 'display:inline-block;color:var(--text-muted);text-decoration:none;padding:4px 0';

        // Om-länk. Behaller link-stil i "stangd"-laget sa den smalter in i
        // sidfoten. Fas 1: nar modalen ar oppen byter vi till en .btn-default
        // sa Stang-knappen ar tydlig.
        const aboutToggle = document.createElement('button');
        const linkStyle = 'display:inline-block;background:none;border:none;color:var(--text-muted);font-size:0.7rem;font-family:inherit;cursor:pointer;padding:4px 0;margin-left:16px;text-decoration:underline;text-underline-offset:2px';
        aboutToggle.textContent = 'Om projektet';
        aboutToggle.style.cssText = linkStyle;

        // Om-sektion (dold som standard).
        // Tokens: anvander de mork-grona designsystem-variablerna fran
        // varje sidas :root sa modalen ar konsekvent med resten av appen.
        // Varningsboxen behaller sina egna hex (gul/orange/rod) eftersom
        // de ar avsiktligt avvikande och saknar tokens.
        const aboutBox = document.createElement('div');
        aboutBox.id = 'om';
        aboutBox.style.cssText = 'display:none;text-align:left;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:16px 18px;margin-top:14px;font-size:0.78rem;color:var(--text-secondary);line-height:1.7';
        aboutBox.innerHTML = `
<div style="background:#2a1a0a;border:1px solid #c8a24e;border-radius:6px;padding:12px 14px;margin-bottom:14px;text-align:center">
<p style="margin:0 0 2px;font-size:0.85rem;font-weight:800;letter-spacing:0.08em;color:#c8a24e;text-transform:uppercase">LITA ALDRIG BLINT PÅ INNEHÅLLET PÅ 7SRAPPORT.COM</p>
<p style="margin:0 0 6px;font-size:0.72rem;font-weight:700;letter-spacing:0.06em;color:#c8a24e">ELLER PÅ INFORMATIONEN NEDAN</p>
<p style="margin:0;font-size:0.72rem;color:#a08050">Kör alltid din egen granskade kopia. <a href="https://7srapport.com/#egenKopia" style="color:#c8a24e;font-weight:600" onclick="document.getElementById('egenKopia').scrollIntoView({behavior:'smooth'});return false">Läs hur ↓</a></p>
</div>

<h3 style="color:var(--accent);font-size:0.85rem;margin:0 0 10px;letter-spacing:0.06em">OM 7S RAPPORT</h3>
<p style="margin:0 0 10px"><strong>Privatutvecklat utbildnings- och minneshjälpverktyg riktat till hemvärnssoldater.</strong> Inte kopplat till eller fastställt av Försvarsmakten. <strong>13 rapport-formulär</strong> plus två kart-verktyg (MINKARTA för minläggning, SENSORSKISS för bevakningsobjekt) — paketerade som en PWA (Progressive Web App) som fungerar <strong>100% offline</strong> direkt i mobilen.</p>

<p style="margin:0 0 10px"><strong>Funktioner i urval:</strong></p>
<ul style="margin:0 0 12px;padding-left:18px">
<li>Mörkeranpassad UX – strikt Dark Mode</li>
<li>Metadata-stöttning – tid och koordinater från GPS/foto</li>
<li>Anpassat för Signal – genererar ren text redo att klistras in</li>
<li>Ingen data skickas utanför din enhet – allt stannar lokalt i webbläsaren</li>
</ul>

<h3 style="color:var(--accent);font-size:0.85rem;margin:16px 0 10px;letter-spacing:0.06em">MINA DATA & SÄKERHETSKOPIA</h3>
<p style="margin:0 0 10px">All data ligger på din enhet — aldrig hos oss eller på GitHub. Du kan exportera alla utkast och sparade objekt som en JSON-fil och importera tillbaka senare.</p>
<p style="margin:0 0 10px"><a href="data.html" style="color:var(--accent)">Mina data & säkerhetskopia →</a></p>

<h3 style="color:var(--accent);font-size:0.85rem;margin:16px 0 10px;letter-spacing:0.06em">INTEGRITET & NÄTVERKSANROP</h3>
<p style="margin:0 0 10px">Verktyget skickar <strong>aldrig</strong> dina rapporter, koordinater eller annan data till någon server. All information stannar på din enhet i webbläsarens lokala lagring. Formulären genererar ren text som du själv kopierar och klistrar in där du vill.</p>

<p style="margin:12px 0 6px"><strong style="color:var(--accent)">✅ Offline</strong> – inga externa anrop:</p>
<ul style="margin:0 0 10px;padding-left:18px">
<li>Alla formulär, knappar och rapportgenerering</li>
<li>Sparade platser och sagesmän (lokal lagring)</li>
<li>Manuell MGRS-inmatning</li>
<li>Tidsstämpel från foto (EXIF läses lokalt)</li>
<li><strong>Härdat läge</strong> i MINKARTA/SENSORSKISS – kartan serveras från en lokal PMTiles-fil</li>
<li><strong>Cachat kart-område</strong> via "Spara område offline" – tidigare nedladdade tiles serveras lokalt</li>
</ul>

<p style="margin:12px 0 6px"><strong style="color:#c8a24e">⚠ Online</strong> – dessa funktioner gör externa anrop när de används:</p>
<ul style="margin:0 0 10px;padding-left:18px">
<li><strong>Kartvisning</strong> (utan Härdat läge) – hämtar kartbilder från <a href="https://opentopomap.org/about" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">OpenTopoMap</a></li>
<li><strong>GPS → adress</strong> – slår upp gatunamn via <a href="https://nominatim.org/release-docs/latest/api/Reverse/" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">Nominatim</a> (<a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">OpenStreetMap</a>) och <a href="https://wiki.openstreetmap.org/wiki/Overpass_API" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">Overpass API</a></li>
<li><strong>VÄDER-formuläret</strong> – hämtar prognos från <a href="https://opendata.smhi.se/apidocs/metfcst/about.html" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">SMHI</a></li>
</ul>
<div style="background:#1a0a0a;border:1px solid #6b2020;border-radius:6px;padding:10px 14px;margin:12px 0 10px">
<p style="margin:0 0 8px;font-size:0.78rem;color:#d4a0a0"><strong style="color:#e05050">I skarpt läge:</strong> Aktivera Härdat läge och förladda kartan innan operationen — då lämnar inga koordinater enheten. Konkret arbetsgång:</p>
<ol style="margin:0;padding-left:18px;font-size:0.76rem;color:#d4a0a0">
<li>Öppna MINKARTA eller SENSORSKISS på en betrodd anslutning.</li>
<li>Slå på <strong>Härdat läge</strong> — kartan byts till lokal PMTiles-fil utan tile-requests.</li>
<li>Klicka <strong>Ladda ner offline</strong> en gång — hela bundlen hashas och cachas lokalt.</li>
<li>Använd <strong>manuell MGRS-inmatning</strong> i rapport-formulären istället för GPS-uppslag mot Nominatim/Overpass.</li>
<li><strong>Undvik VÄDER-formuläret</strong> i skarpt läge — det går alltid till SMHI när det används.</li>
</ol>
</div>

<h3 id="egenKopia" style="color:var(--accent);font-size:0.85rem;margin:16px 0 10px;letter-spacing:0.06em">KÖR DIN EGEN KOPIA</h3>
<p style="margin:0 0 10px">Med en egen kopia har du full kontroll över koden och är inte beroende av att 7srapport.com finns kvar. Klona alltid den senaste versionen – den innehåller sannolikt fler funktioner och säkerhetsfixar.</p>

<p style="margin:0 0 6px"><strong>Tre steg – fork, granska, publicera:</strong></p>
<ol style="margin:0 0 12px;padding-left:18px">
<li>Gå till <a href="https://github.com/gitjoda71/7s-rapport" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">github.com/gitjoda71/7s-rapport</a> och klicka <strong>Fork</strong> (uppe till höger). Du får en egen kopia av hela projektet på ditt GitHub-konto.</li>
<li><strong style="color:#c8a24e">⚠ Granska koden</strong> – gå igenom filerna och sök efter okända URL:er, externa skript eller anrop du inte känner igen. Lita aldrig blint på kod från internet, oavsett källa.</li>
<li><strong>Aktivera GitHub Pages:</strong>
<ul style="margin:4px 0 2px;padding-left:16px">
<li>Gå till ditt forkade repo</li>
<li>Klicka <strong>Settings</strong></li>
<li>Klicka <strong>Pages</strong> (i vänstermenyn)</li>
<li>Under "Source" – välj <strong>main</strong> och <strong>/ (root)</strong></li>
<li>Klicka <strong>Save</strong></li>
</ul>
<p style="margin:6px 0 0;font-size:0.72rem;color:var(--text-muted)">Inom någon minut är din sida live på <code style="background:var(--bg-input);padding:2px 5px;border-radius:3px;font-size:0.72rem">https://dittanvändarnamn.github.io/7s-rapport</code> – med HTTPS, redo för GPS och PWA-installation.</p>
</li>
</ol>
<p style="margin:0 0 10px;font-size:0.72rem;color:var(--text-muted)">Du kan också ladda ner filerna som ZIP och öppna <code style="background:var(--bg-input);padding:2px 5px;border-radius:3px;font-size:0.72rem">index.html</code> lokalt, men då saknas HTTPS (krävs för GPS/PWA).</p>

<h3 style="color:var(--accent);font-size:0.85rem;margin:16px 0 10px;letter-spacing:0.06em">INFÖR ÖVNING</h3>
<p style="margin:0 0 10px">Behöver ni en ny funktion inför en övning? Hör av er i god tid – helst några veckor innan. Då hinner vi köra hela kedjan:</p>
<ol style="margin:0 0 10px;padding-left:18px">
<li>Ni beskriver vad ni behöver</li>
<li>Jag tar fram funktionen</li>
<li>Ni testar och ger feedback</li>
<li>Jag justerar</li>
<li>Ni godkänner</li>
<li><strong>Ni klonar repot och tar med er den granskade klonen ut på övningen</strong></li>
</ol>
<p style="margin:0 0 10px;font-size:0.72rem;color:var(--text-muted)">Använd aldrig en ogranskad klon i skarpt läge eller på övning. Gå alltid igenom koden innan.</p>

<h3 style="color:var(--accent);font-size:0.85rem;margin:16px 0 10px;letter-spacing:0.06em">ROADMAP & ÖNSKEMÅL</h3>
<p style="margin:0 0 10px">Se vad som är på gång och vad som finns på önskelistan — och lämna gärna ett eget önskemål.</p>
<p style="margin:0 0 10px"><a href="roadmap.html" style="color:var(--accent)">Roadmap & önskemål →</a></p>

<h3 style="color:var(--accent);font-size:0.85rem;margin:16px 0 10px;letter-spacing:0.06em">LICENS & KÄLLKOD</h3>
<p style="margin:0 0 4px">Licensierat under <strong>CC BY-NC-SA 4.0</strong> – fritt att använda och anpassa för icke-kommersiellt bruk.</p>
<p style="margin:0"><a href="https://github.com/gitjoda71/7s-rapport" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">Källkod på GitHub →</a></p>
`;

        // Stang-knapp byter form: link-stil nar modalen ar stangd, knapp-stil
        // nar den ar oppen. Designsystem-knapp signalerar tydligare att det
        // gar att stanga; link-stil halls subtil i sidfoten.
        const closeBtnStyle = 'display:inline-flex;align-items:center;justify-content:center;min-height:var(--btn-h-sm,36px);padding:6px var(--btn-pad-x-sm,12px);background:var(--btn-bg,var(--bg-card));color:var(--btn-fg,var(--text-secondary));border:1px solid var(--btn-border,var(--border));border-radius:var(--btn-radius-sm,4px);font-family:inherit;font-size:var(--btn-font-sm,0.82rem);font-weight:600;letter-spacing:0.04em;cursor:pointer;margin-left:16px;text-decoration:none';

        aboutToggle.addEventListener('click', () => {
            const open = aboutBox.style.display !== 'none';
            aboutBox.style.display = open ? 'none' : 'block';
            aboutToggle.textContent = open ? 'Om projektet' : 'Stäng';
            aboutToggle.style.cssText = open ? linkStyle : closeBtnStyle;
        });

        const linkRow = document.createElement('div');
        linkRow.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap';
        linkRow.appendChild(fb);
        const sep = document.createElement('span');
        sep.textContent = '·';
        sep.style.color = 'var(--border)';
        linkRow.appendChild(sep);
        linkRow.appendChild(aboutToggle);

        footer.appendChild(disclaimer);
        footer.appendChild(priv);
        footer.appendChild(linkRow);
        footer.appendChild(aboutBox);
        c.appendChild(footer);

        // Auto-öppna Om-sektionen om URL:en innehåller #om eller #egenKopia
        if (location.hash === '#om' || location.hash === '#egenKopia') {
            aboutBox.style.display = 'block';
            aboutToggle.textContent = 'Stäng';
            aboutToggle.style.cssText = closeBtnStyle;
            setTimeout(() => {
                const target = document.getElementById(location.hash.slice(1));
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    });
})();
