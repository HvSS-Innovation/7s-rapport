// footer.js — gemensam sidfot för alla tabs.
// Konfigurera per sida innan denna laddas:
//   <script>window.FORM_ID = { title: 'VADER', body: 'VADER' };</script>
//   <script src="footer.js"></script>
// title styr GitHub-issue-titeln, body styr formularnamnet i issue-bodyn.
// body är valfritt och defaultar till title.
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
        footer.style.cssText = 'margin-top:24px;padding:0 0 32px;text-align:center;font-size:0.7rem;color:#5a7a5a;line-height:1.6';

        // Integritetsnot
        const priv = document.createElement('p');
        priv.textContent = 'Ingen data skickas eller lagras utanför din enhet.';
        priv.style.cssText = 'font-size:0.65rem;color:#3a5a3a;margin-bottom:12px';

        // Feedback-länk
        const fb = document.createElement('a');
        fb.href = buildFeedbackUrl();
        fb.target = '_blank';
        fb.rel = 'noopener noreferrer';
        fb.textContent = 'Bugg eller förslag? Lämna feedback →';
        fb.style.cssText = 'display:inline-block;color:#5a7a5a;text-decoration:none;padding:4px 0';

        // Om-länk
        const aboutToggle = document.createElement('button');
        aboutToggle.textContent = 'Om projektet';
        aboutToggle.style.cssText = 'display:inline-block;background:none;border:none;color:#5a7a5a;font-size:0.7rem;font-family:inherit;cursor:pointer;padding:4px 0;margin-left:16px;text-decoration:underline;text-underline-offset:2px';

        // Om-sektion (dold som standard)
        const aboutBox = document.createElement('div');
        aboutBox.id = 'om';
        aboutBox.style.cssText = 'display:none;text-align:left;background:#152815;border:1px solid #2d4a2d;border-radius:8px;padding:16px 18px;margin-top:14px;font-size:0.78rem;color:#8aaa8a;line-height:1.7';
        aboutBox.innerHTML = `
<div style="background:#2a1a0a;border:1px solid #c8a24e;border-radius:6px;padding:12px 14px;margin-bottom:14px;text-align:center">
<p style="margin:0 0 2px;font-size:0.85rem;font-weight:800;letter-spacing:0.08em;color:#c8a24e;text-transform:uppercase">LITA ALDRIG BLINT PÅ INNEHÅLLET PÅ 7SRAPPORT.COM</p>
<p style="margin:0 0 6px;font-size:0.72rem;font-weight:700;letter-spacing:0.06em;color:#c8a24e">ELLER PÅ INFORMATIONEN NEDAN</p>
<p style="margin:0;font-size:0.72rem;color:#a08050">Kör alltid din egen granskade kopia. <a href="https://7srapport.com/#egenKopia" style="color:#c8a24e;font-weight:600" onclick="document.getElementById('egenKopia').scrollIntoView({behavior:'smooth'});return false">Läs hur ↓</a></p>
</div>

<h3 style="color:#4caf50;font-size:0.85rem;margin:0 0 10px;letter-spacing:0.06em">OM 7S RAPPORT</h3>
<p style="margin:0 0 10px">Webbaserade rapportverktyg för Hemvärnet. 13 formulär paketerade som en PWA (Progressive Web App) som fungerar <strong>100% offline</strong> direkt i mobilen.</p>

<p style="margin:0 0 10px"><strong>Funktioner i urval:</strong></p>
<ul style="margin:0 0 12px;padding-left:18px">
<li>Mörkeranpassad UX – strikt Dark Mode</li>
<li>Metadata-stöttning – tid och koordinater från GPS/foto</li>
<li>Anpassat för Signal – genererar ren text redo att klistras in</li>
<li>Ingen data skickas utanför din enhet – allt stannar lokalt i webbläsaren</li>
</ul>

<h3 style="color:#4caf50;font-size:0.85rem;margin:16px 0 10px;letter-spacing:0.06em">INTEGRITET & NÄTVERKSANROP</h3>
<p style="margin:0 0 10px">Verktyget skickar <strong>aldrig</strong> dina rapporter, koordinater eller annan data till någon server. All information stannar på din enhet i webbläsarens lokala lagring. Formulären genererar ren text som du själv kopierar och klistrar in där du vill.</p>

<p style="margin:12px 0 6px"><strong style="color:#4caf50">✅ Offline</strong> – inga externa anrop:</p>
<ul style="margin:0 0 10px;padding-left:18px">
<li>Alla formulär, knappar och rapportgenerering</li>
<li>Sparade platser och sagesmän (lokal lagring)</li>
<li>Manuell MGRS-inmatning</li>
<li>Tidsstämpel från foto (EXIF läses lokalt)</li>
</ul>

<p style="margin:12px 0 6px"><strong style="color:#c8a24e">⚠ Online</strong> – dessa funktioner gör externa anrop när de används:</p>
<ul style="margin:0 0 10px;padding-left:18px">
<li><strong>Kartvisning</strong> – hämtar kartbilder från <a href="https://opentopomap.org/about" target="_blank" rel="noopener noreferrer" style="color:#4caf50">OpenTopoMap</a></li>
<li><strong>GPS → adress</strong> – slår upp gatunamn via <a href="https://nominatim.org/release-docs/latest/api/Reverse/" target="_blank" rel="noopener noreferrer" style="color:#4caf50">Nominatim</a> (<a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer" style="color:#4caf50">OpenStreetMap</a>) och <a href="https://wiki.openstreetmap.org/wiki/Overpass_API" target="_blank" rel="noopener noreferrer" style="color:#4caf50">Overpass API</a></li>
<li><strong>VÄDER-formuläret</strong> – hämtar prognos från <a href="https://opendata.smhi.se/apidocs/metfcst/about.html" target="_blank" rel="noopener noreferrer" style="color:#4caf50">SMHI</a></li>
</ul>
<div style="background:#1a0a0a;border:1px solid #6b2020;border-radius:6px;padding:10px 14px;margin:12px 0 10px">
<p style="margin:0;font-size:0.78rem;color:#d4a0a0"><strong style="color:#e05050">I skarpt läge:</strong> Använd manuell MGRS-inmatning och undvik kartfunktionen – då görs inga externa anrop och din position avslöjas inte via nätverkstrafik.</p>
</div>

<h3 id="egenKopia" style="color:#4caf50;font-size:0.85rem;margin:16px 0 10px;letter-spacing:0.06em">KÖR DIN EGEN KOPIA</h3>
<p style="margin:0 0 10px">Med en egen kopia har du full kontroll över koden och är inte beroende av att 7srapport.com finns kvar. Klona alltid den senaste versionen – den innehåller sannolikt fler funktioner och säkerhetsfixar.</p>

<p style="margin:0 0 6px"><strong>Tre steg – fork, granska, publicera:</strong></p>
<ol style="margin:0 0 12px;padding-left:18px">
<li>Gå till <a href="https://github.com/gitjoda71/7s-rapport" target="_blank" rel="noopener noreferrer" style="color:#4caf50">github.com/gitjoda71/7s-rapport</a> och klicka <strong>Fork</strong> (uppe till höger). Du får en egen kopia av hela projektet på ditt GitHub-konto.</li>
<li><strong style="color:#c8a24e">⚠ Granska koden</strong> – gå igenom filerna och sök efter okända URL:er, externa skript eller anrop du inte känner igen. Lita aldrig blint på kod från internet, oavsett källa.</li>
<li><strong>Aktivera GitHub Pages:</strong>
<ul style="margin:4px 0 2px;padding-left:16px">
<li>Gå till ditt forkade repo</li>
<li>Klicka <strong>Settings</strong></li>
<li>Klicka <strong>Pages</strong> (i vänstermenyn)</li>
<li>Under "Source" – välj <strong>main</strong> och <strong>/ (root)</strong></li>
<li>Klicka <strong>Save</strong></li>
</ul>
<p style="margin:6px 0 0;font-size:0.72rem;color:#5a7a5a">Inom någon minut är din sida live på <code style="background:#0f240f;padding:2px 5px;border-radius:3px;font-size:0.72rem">https://dittanvändarnamn.github.io/7s-rapport</code> – med HTTPS, redo för GPS och PWA-installation.</p>
</li>
</ol>
<p style="margin:0 0 10px;font-size:0.72rem;color:#5a7a5a">Du kan också ladda ner filerna som ZIP och öppna <code style="background:#0f240f;padding:2px 5px;border-radius:3px;font-size:0.72rem">index.html</code> lokalt, men då saknas HTTPS (krävs för GPS/PWA).</p>

<h3 style="color:#4caf50;font-size:0.85rem;margin:16px 0 10px;letter-spacing:0.06em">INFÖR ÖVNING</h3>
<p style="margin:0 0 10px">Behöver ni en ny funktion inför en övning? Hör av er i god tid – helst några veckor innan. Då hinner vi köra hela kedjan:</p>
<ol style="margin:0 0 10px;padding-left:18px">
<li>Ni beskriver vad ni behöver</li>
<li>Jag tar fram funktionen</li>
<li>Ni testar och ger feedback</li>
<li>Jag justerar</li>
<li>Ni godkänner</li>
<li><strong>Ni klonar repot och tar med er den granskade klonen ut på övningen</strong></li>
</ol>
<p style="margin:0 0 10px;font-size:0.72rem;color:#5a7a5a">Använd aldrig en ogranskad klon i skarpt läge eller på övning. Gå alltid igenom koden innan.</p>

<h3 style="color:#4caf50;font-size:0.85rem;margin:16px 0 10px;letter-spacing:0.06em">LICENS & KÄLLKOD</h3>
<p style="margin:0 0 4px">Licensierat under <strong>CC BY-NC-SA 4.0</strong> – fritt att använda och anpassa för icke-kommersiellt bruk.</p>
<p style="margin:0"><a href="https://github.com/gitjoda71/7s-rapport" target="_blank" rel="noopener noreferrer" style="color:#4caf50">Källkod på GitHub →</a></p>
`;

        aboutToggle.addEventListener('click', () => {
            const open = aboutBox.style.display !== 'none';
            aboutBox.style.display = open ? 'none' : 'block';
            aboutToggle.textContent = open ? 'Om projektet' : 'Stäng';
        });

        const linkRow = document.createElement('div');
        linkRow.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap';
        linkRow.appendChild(fb);
        const sep = document.createElement('span');
        sep.textContent = '·';
        sep.style.color = '#3a5a3a';
        linkRow.appendChild(sep);
        linkRow.appendChild(aboutToggle);

        footer.appendChild(priv);
        footer.appendChild(linkRow);
        footer.appendChild(aboutBox);
        c.appendChild(footer);

        // Auto-öppna Om-sektionen om URL:en innehåller #om eller #egenKopia
        if (location.hash === '#om' || location.hash === '#egenKopia') {
            aboutBox.style.display = 'block';
            aboutToggle.textContent = 'Stäng';
            setTimeout(() => {
                const target = document.getElementById(location.hash.slice(1));
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    });
})();
