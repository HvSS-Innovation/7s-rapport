// skyttebok-extras.js — UI-tillägg för SKYTTEBOK:
//   B) Ljust läge-toggle (sun/moon i header) med persist i localStorage.
//   C) QR-flöde: rendering av QR-koder och scanning via file capture.
//
// Ingen ändring i skyttebok-sig.js — vi wrappar bara dess publika API.
// Vendor-libs:
//   - vendor/qrcode-generator/qrcode.js  (Kazuhiko Arase, MIT) → window.qrcode
//   - vendor/jsqr/jsQR.js                (cozmo, Apache-2.0)   → window.jsQR
//
// LocalStorage-nyckel: skyttebok_settings_lightmode ('on' | 'off' | saknas → auto)

(function () {
    'use strict';

    var LIGHTMODE_KEY = 'skyttebok_settings_lightmode';

    // ── Theme toggle (Spår B) ───────────────────────────────────────────
    // Inline-script i <head> sätter data-theme innan body renderas.
    // Här uppdaterar vi bara ikon + persist när användaren togglar.

    var ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    var ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="4.2"/>' +
        '<line x1="12" y1="2.5" x2="12" y2="5.5"/>' +
        '<line x1="12" y1="18.5" x2="12" y2="21.5"/>' +
        '<line x1="2.5" y1="12" x2="5.5" y2="12"/>' +
        '<line x1="18.5" y1="12" x2="21.5" y2="12"/>' +
        '<line x1="4.9" y1="4.9" x2="7.0" y2="7.0"/>' +
        '<line x1="17" y1="17" x2="19.1" y2="19.1"/>' +
        '<line x1="4.9" y1="19.1" x2="7.0" y2="17"/>' +
        '<line x1="17" y1="7.0" x2="19.1" y2="4.9"/></svg>';

    function isLight() {
        return document.documentElement.getAttribute('data-theme') === 'light';
    }

    function syncThemeIcon() {
        var btn = document.getElementById('themeToggle');
        if (!btn) return;
        // Visa motsatsen — knappen visar vad du växlar TILL.
        btn.innerHTML = isLight() ? ICON_MOON : ICON_SUN;
        btn.setAttribute('aria-label', isLight()
            ? 'Växla till mörkt läge' : 'Växla till ljust läge');
        btn.setAttribute('title', isLight()
            ? 'Växla till mörkt läge' : 'Växla till ljust läge');
    }

    window.skyttebokToggleTheme = function () {
        var nextLight = !isLight();
        if (nextLight) document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem(LIGHTMODE_KEY, nextLight ? 'on' : 'off'); }
        catch (_) {}
        syncThemeIcon();
        // Uppdatera meta theme-color för Android-statusfält.
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', nextLight ? '#ffffff' : '#0d1f0d');
    };

    // ── QR-modal (Spår C) ───────────────────────────────────────────────

    function showQrModal(opts) {
        // opts: { title, description, payload (object|string), filenameForFallback?, onFallback? }
        var overlay = document.getElementById('qrOverlay');
        var canvasWrap = document.getElementById('qrCanvasWrap');
        var meta = document.getElementById('qrMeta');
        var warning = document.getElementById('qrWarning');
        var fallbackBtn = document.getElementById('qrFallbackBtn');
        if (!overlay || !canvasWrap) return;

        document.getElementById('qrTitle').textContent = opts.title || 'QR-kod';
        document.getElementById('qrDescription').textContent =
            opts.description || 'Scanna med mottagarens enhet.';

        var payloadStr = typeof opts.payload === 'string'
            ? opts.payload
            : JSON.stringify(opts.payload);
        // UTF-8 byte-storlek (TextEncoder hanterar svenska tecken korrekt).
        var bytes = new TextEncoder().encode(payloadStr).length;

        warning.style.display = 'none';
        fallbackBtn.style.display = 'none';
        canvasWrap.innerHTML = '';

        // Hård gräns: > 2 KB → QR blir för tät för pålitlig scanning.
        // Erbjud filfallback istället för att försöka rendera.
        if (bytes > 2048) {
            warning.style.display = 'block';
            warning.textContent = 'Datat är för stort för QR (' + bytes +
                ' B, gränsen är 2048 B). Använd fil-export istället.';
            meta.textContent = '';
            if (opts.onFallback) {
                fallbackBtn.style.display = 'inline-flex';
                fallbackBtn.textContent = 'Använd fil istället';
                fallbackBtn.onclick = function () {
                    closeQr();
                    opts.onFallback();
                };
            }
            overlay.classList.add('open');
            return;
        }

        try {
            var qr;
            // qrcode-generator: typeNumber=0 låter biblioteket auto-välja
            // version (storlek) baserat på data och error-correction.
            // Level 'M' = 15 % redundans → bra balans utomhus.
            qr = window.qrcode(0, 'M');
            qr.addData(payloadStr, 'Byte');
            qr.make();
            // SVG-rendering — skalbar, integrerar med tema utan pixlering.
            canvasWrap.innerHTML = qr.createSvgTag({
                cellSize: 6,
                margin: 4,
                scalable: true
            });
            meta.textContent = 'Storlek: ' + bytes + ' B · QR Version ' +
                qr.getModuleCount() + 'x' + qr.getModuleCount();
        } catch (e) {
            warning.style.display = 'block';
            warning.textContent = 'Kunde inte rendera QR: ' +
                (e && e.message ? e.message : 'okänt fel') +
                '. Använd fil-export istället.';
            meta.textContent = '';
            if (opts.onFallback) {
                fallbackBtn.style.display = 'inline-flex';
                fallbackBtn.textContent = 'Använd fil istället';
                fallbackBtn.onclick = function () {
                    closeQr();
                    opts.onFallback();
                };
            }
        }

        overlay.classList.add('open');
    }

    function closeQr() {
        var overlay = document.getElementById('qrOverlay');
        if (overlay) overlay.classList.remove('open');
    }
    window.skyttebokCloseQr = closeQr;

    // ── QR-scan via fil-capture + jsQR (Spår C2) ────────────────────────
    // Vi tar emot en File (image/*) → ImageData → jsQR → text/JSON.
    // Skala bilden till max 640 px bredd för att hålla dekodningstid låg.

    function decodeQrFromFile(file) {
        return new Promise(function (resolve, reject) {
            if (!file) return reject(new Error('Ingen fil vald'));
            if (!window.jsQR) return reject(new Error('jsQR-biblioteket är inte laddat'));
            var img = new Image();
            var url = URL.createObjectURL(file);
            img.onload = function () {
                URL.revokeObjectURL(url);
                try {
                    var maxW = 640;
                    var scale = Math.min(1, maxW / img.naturalWidth);
                    var w = Math.round(img.naturalWidth * scale);
                    var h = Math.round(img.naturalHeight * scale);
                    var c = document.createElement('canvas');
                    c.width = w; c.height = h;
                    var ctx = c.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    var imgData = ctx.getImageData(0, 0, w, h);
                    var result = window.jsQR(imgData.data, w, h, {
                        inversionAttempts: 'attemptBoth'
                    });
                    if (!result || !result.data) {
                        return reject(new Error('Ingen QR-kod hittades i bilden. ' +
                            'Tips: håll kameran stilla, undvik glansiga ytor, ' +
                            'fyll så mycket av rutan som möjligt med QR-koden.'));
                    }
                    resolve(result.data);
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error('Kunde inte ladda bilden.'));
            };
            img.src = url;
        });
    }

    // Helper för UI-flöden — öppnar file-pickern bakom ett dolt input-element.
    function triggerFilePicker(inputId) {
        var input = document.getElementById(inputId);
        if (!input) return;
        input.value = '';
        input.click();
    }

    // ── Public API ──────────────────────────────────────────────────────
    window.SkyttebokExtras = {
        showQrModal: showQrModal,
        closeQrModal: closeQr,
        decodeQrFromFile: decodeQrFromFile,
        triggerFilePicker: triggerFilePicker,
        syncThemeIcon: syncThemeIcon,
        isLightTheme: isLight
    };

    // ── Init ────────────────────────────────────────────────────────────
    function init() {
        syncThemeIcon();
        // Bind file-pickers för QR-scan om de finns. Felhantering konsolideras
        // i skyttebok.js där befintliga importflöden lever — vi vill inte
        // duplicera showConfirm-anropen här.
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
