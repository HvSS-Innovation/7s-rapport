// ── PWA: Install banner + offline-info ──
(function() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');

  // Gemensam toast-stil
  function createToast(html, duration) {
    const el = document.createElement('div');
    el.innerHTML = html;
    el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#152815;color:#c8e6c9;border:1px solid #2d4a2d;border-radius:10px;padding:14px 20px;font-size:0.82rem;line-height:1.5;z-index:99999;max-width:340px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.5);opacity:0;transition:opacity 0.4s';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.style.opacity = '1');
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, duration);
    return el;
  }

  // 1) Egen install-banner med Mer info-panel
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;transition:opacity 0.4s';

    // Info-panel (dold initialt)
    const info = document.createElement('div');
    info.style.cssText = 'display:none;background:#0d1f0d;border-top:1px solid #2d4a2d;padding:16px 20px;font-size:0.78rem;line-height:1.6;color:#a0c4a0';
    info.innerHTML = '<b style="color:#c8e6c9">Varfor installera?</b><br>' +
      'Installationen gor att verktyget fungerar offline, direkt fran din enhet. ' +
      'Ingen data skickas eller lagras utanfor din telefon/dator.<br><br>' +
      '<b style="color:#c8e6c9">Sakerhet</b><br>' +
      'Installation sker pa egen risk. All kallkod ar oppen och kan granskas: ' +
      '<a href="https://github.com/gitjoda71/7s-rapport" target="_blank" rel="noopener" style="color:#4caf50;text-decoration:underline">github.com/gitjoda71/7s-rapport</a><br><br>' +
      '<b style="color:#c8e6c9">Hur vet jag att sidan verkligen kommer fran GitHub?</b><br>' +
      'Langst ner pa varje sida visas ett versions-ID (t.ex. <code style="color:#4caf50">a1b2c3d</code>). ' +
      'Klicka pa det for att se exakt den version av kallkoden som din sida anvander. ' +
      'Sidan hostas via GitHub Pages, vilket innebar att den serveras direkt fran det oppna repositoriet \u2014 ' +
      'inget mellansteg dar koden kan andras.';

    // Banner-rad
    const banner = document.createElement('div');
    banner.style.cssText = 'background:#152815;border-top:1px solid #2d4a2d;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 -2px 16px rgba(0,0,0,0.5);flex-wrap:wrap;gap:8px';
    banner.innerHTML = '<span style="color:#c8e6c9;font-size:0.85rem">Installera som app</span>' +
      '<span style="display:flex;gap:8px;align-items:center">' +
      '<button id="pwaInfo" style="background:none;border:1px solid #2d4a2d;color:#4caf50;border-radius:6px;padding:8px 12px;font-size:0.8rem;cursor:pointer">Mer info</button>' +
      '<button id="pwaDismiss" style="background:none;border:1px solid #2d4a2d;color:#5a7a5a;border-radius:6px;padding:8px 12px;font-size:0.8rem;cursor:pointer">Inte nu</button>' +
      '<button id="pwaInstall" style="background:#4caf50;border:none;color:#0d1f0d;border-radius:6px;padding:8px 14px;font-size:0.8rem;font-weight:600;cursor:pointer">Installera</button>' +
      '</span>';

    wrapper.appendChild(info);
    wrapper.appendChild(banner);
    document.body.appendChild(wrapper);

    // Auto-dolj efter 12 sekunder
    const autoHide = setTimeout(() => { wrapper.style.opacity = '0'; setTimeout(() => wrapper.remove(), 400); }, 12000);

    document.getElementById('pwaInfo').onclick = () => {
      clearTimeout(autoHide);
      info.style.display = info.style.display === 'none' ? 'block' : 'none';
    };
    document.getElementById('pwaInstall').onclick = () => {
      clearTimeout(autoHide);
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
      wrapper.remove();
    };
    document.getElementById('pwaDismiss').onclick = () => {
      clearTimeout(autoHide);
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
