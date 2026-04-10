// ── PWA: Install banner + offline-info ──
(function() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');

  // Gemensam toast-stil
  function createToast(html, duration) {
    const el = document.createElement('div');
    el.innerHTML = html;
    el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#152815;color:#c8e6c9;border:1px solid #2d4a2d;border-radius:10px;padding:14px 20px;font-size:0.82rem;line-height:1.5;z-index:99999;max-width:340px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.5);opacity:0;transition:opacity 0.4s';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.style.opacity = '1');
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, duration);
    return el;
  }

  // Hämta version/commit från version.js (laddas i samma sida)
  function versionLink() {
    var sha = (typeof APP_COMMIT !== 'undefined' && APP_COMMIT) ? APP_COMMIT : '';
    var ver = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : '';
    if (sha) {
      return '<a href="https://github.com/gitjoda71/7s-rapport/tree/' + sha + '" target="_blank" rel="noopener" style="color:#4caf50;text-decoration:underline">' + sha.slice(0, 7) + '</a>';
    }
    return ver ? '<code style="color:#4caf50">' + ver + '</code>' : '';
  }

  // 1) Egen install-banner med Mer info-panel (högst upp)
  const PWA_SNOOZE_KEY = 'pwaInstallSnoozeUntil';
  const PWA_SNOOZE_MS = 10 * 60 * 1000;
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;

    const snoozeUntil = parseInt(localStorage.getItem(PWA_SNOOZE_KEY) || '0', 10);
    if (Date.now() < snoozeUntil) return;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;transition:opacity 0.4s';

    // Info-panel (dold initialt, under bannern)
    const info = document.createElement('div');
    info.style.cssText = 'display:none;background:#0d1f0d;border-bottom:1px solid #2d4a2d;padding:16px 20px;font-size:0.78rem;line-height:1.6;color:#a0c4a0';

    // Banner-rad
    const banner = document.createElement('div');
    banner.style.cssText = 'background:#152815;border-bottom:1px solid #2d4a2d;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 16px rgba(0,0,0,0.5);flex-wrap:wrap;gap:8px';
    banner.innerHTML = '<span style="color:#c8e6c9;font-size:0.85rem">Installera som app</span>' +
      '<span style="display:flex;gap:8px;align-items:center">' +
      '<button id="pwaInfo" style="background:none;border:1px solid #2d4a2d;color:#4caf50;border-radius:6px;padding:8px 12px;font-size:0.8rem;cursor:pointer">Mer info</button>' +
      '<button id="pwaDismiss" style="background:none;border:1px solid #2d4a2d;color:#5a7a5a;border-radius:6px;padding:8px 12px;font-size:0.8rem;cursor:pointer">Inte nu</button>' +
      '<button id="pwaInstall" style="background:#4caf50;border:none;color:#0d1f0d;border-radius:6px;padding:8px 14px;font-size:0.8rem;font-weight:600;cursor:pointer">Installera</button>' +
      '</span>';

    wrapper.appendChild(banner);
    wrapper.appendChild(info);
    document.body.appendChild(wrapper);

    // Auto-dolj efter 12 sekunder
    const autoHide = setTimeout(() => { wrapper.style.opacity = '0'; setTimeout(() => wrapper.remove(), 400); }, 12000);

    document.getElementById('pwaInfo').onclick = () => {
      clearTimeout(autoHide);
      if (info.style.display === 'none') {
        var vl = versionLink();
        var verLine = vl ? '<br>Aktuell version: ' + vl : '';
        info.innerHTML = '<b style="color:#c8e6c9">Varf\u00f6r installera?</b><br>' +
          'Installationen g\u00f6r att verktyget fungerar offline, direkt fr\u00e5n din enhet. ' +
          'Ingen data skickas eller lagras utanf\u00f6r din telefon/dator.<br><br>' +
          '<b style="color:#c8e6c9">S\u00e4kerhet</b><br>' +
          'Installation sker p\u00e5 egen risk. All k\u00e4llkod \u00e4r \u00f6ppen och kan granskas: ' +
          '<a href="https://github.com/gitjoda71/7s-rapport" target="_blank" rel="noopener" style="color:#4caf50;text-decoration:underline">github.com/gitjoda71/7s-rapport</a><br><br>' +
          '<b style="color:#c8e6c9">Hur vet jag att sidan verkligen kommer fr\u00e5n GitHub?</b><br>' +
          '<b style="color:#e05050">Det kan du inte veta.</b> ' +
          '<a href="https://7srapport.com/#egenKopia" style="color:#4caf50;text-decoration:underline">K\u00f6r din egen granskade kopia</a> f\u00f6r att vara s\u00e4ker.<br><br>' +
          'Jag p\u00e5st\u00e5r att sidan hostas via GitHub Pages, vilket inneb\u00e4r att den serveras direkt fr\u00e5n det \u00f6ppna repositoriet \u2014 ' +
          'inget mellansteg d\u00e4r koden kan \u00e4ndras. ' +
          'L\u00e4ngst ner p\u00e5 varje sida visas ett versions-ID som l\u00e4nkar till exakt den version av k\u00e4llkoden som k\u00f6rs.' +
          verLine;
        info.style.display = 'block';
      } else {
        info.style.display = 'none';
      }
    };
    document.getElementById('pwaInstall').onclick = () => {
      clearTimeout(autoHide);
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
      wrapper.remove();
    };
    document.getElementById('pwaDismiss').onclick = () => {
      clearTimeout(autoHide);
      localStorage.setItem(PWA_SNOOZE_KEY, String(Date.now() + PWA_SNOOZE_MS));
      wrapper.remove();
    };
  });

  // 2) Offline-info vid start i standalone-lage
  if (window.matchMedia('(display-mode: standalone)').matches) {
    window.addEventListener('load', () => {
      createToast('Appen fungerar offline.<br>Kartan och gatuadresser kraver natkoppling,<br>men MGRS-koordinater och ortnamn fungerar.', 5000);
    });
  }
})();
