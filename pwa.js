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

  // 1) Egen install-banner (fångar webbläsarens event, visar egen banner längre)
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#152815;border-top:1px solid #2d4a2d;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;z-index:99999;box-shadow:0 -2px 16px rgba(0,0,0,0.5)';
    banner.innerHTML = '<span style="color:#c8e6c9;font-size:0.85rem">Installera som app for offlineanvandning</span><span style="display:flex;gap:10px"><button id="pwaDismiss" style="background:none;border:1px solid #2d4a2d;color:#5a7a5a;border-radius:6px;padding:8px 14px;font-size:0.8rem;cursor:pointer">Inte nu</button><button id="pwaInstall" style="background:#4caf50;border:none;color:#0d1f0d;border-radius:6px;padding:8px 14px;font-size:0.8rem;font-weight:600;cursor:pointer">Installera</button></span>';
    document.body.appendChild(banner);

    // Auto-dölj efter 12 sekunder (ca x2 webbläsarens standard)
    const autoHide = setTimeout(() => { banner.style.opacity = '0'; setTimeout(() => banner.remove(), 400); }, 12000);
    banner.style.transition = 'opacity 0.4s';

    document.getElementById('pwaInstall').onclick = () => {
      clearTimeout(autoHide);
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
      banner.remove();
    };
    document.getElementById('pwaDismiss').onclick = () => {
      clearTimeout(autoHide);
      banner.remove();
    };
  });

  // 2) Offline-info vid start i standalone-läge
  if (window.matchMedia('(display-mode: standalone)').matches) {
    window.addEventListener('load', () => {
      createToast('Appen fungerar offline.<br>Kartan och gatuadresser kraver natkoppling,<br>men MGRS-koordinater och ortnamn fungerar.', 5000);
    });
  }
})();
