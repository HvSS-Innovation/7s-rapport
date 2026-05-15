// shared/theme-toggle.js — gemensam ljust/mörkt-tema-toggle för tab-sidor.
// LocalStorage-nyckel: skyttebok_settings_lightmode ('on' | 'off' | saknas → auto).
// Samma nyckel som SKYTTEBOK → val följer med mellan tabs.
//
// Inline <head>-script (i varje sida) sätter data-theme FÖRE body renderas
// så vi slipper FOUC. Den här filen sköter knapp-mount + click-handler.

(function () {
    'use strict';

    var LIGHTMODE_KEY = 'skyttebok_settings_lightmode';

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

    function syncIcon(btn) {
        if (!btn) return;
        // Knappen visar vad du växlar TILL (inverterad ikon).
        btn.innerHTML = isLight() ? ICON_MOON : ICON_SUN;
        var label = isLight() ? 'Växla till mörkt läge' : 'Växla till ljust läge';
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
    }

    function applyMetaThemeColor() {
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', isLight() ? '#ffffff' : '#0d1f0d');
    }

    function toggleTheme(btn) {
        var nextLight = !isLight();
        if (nextLight) document.documentElement.setAttribute('data-theme', 'light');
        else document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem(LIGHTMODE_KEY, nextLight ? 'on' : 'off'); }
        catch (_) { /* localStorage kan vara avstängd — ignorera */ }
        syncIcon(btn);
        applyMetaThemeColor();
    }

    function mount() {
        // Hoppa över om sidan redan har en theme-toggle (skyttebok m.fl.)
        if (document.getElementById('themeToggle') ||
            document.querySelector('.theme-toggle-fab')) {
            return;
        }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-toggle-fab';
        btn.id = 'themeToggleFab';
        btn.addEventListener('click', function () { toggleTheme(btn); });

        // Placering: i <header> så knappen ligger på rubrikens rad
        // (matchar SKYTTEBOK). Saknas header → fallback till fixed FAB i hörn.
        var header = document.querySelector('header');
        if (header) {
            var cs = window.getComputedStyle(header).position;
            if (cs === 'static') header.style.position = 'relative';
            header.appendChild(btn);
        } else {
            btn.classList.add('theme-toggle-fab--floating');
            document.body.appendChild(btn);
        }
        syncIcon(btn);
        applyMetaThemeColor();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();
