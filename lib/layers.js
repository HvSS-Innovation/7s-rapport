// ── lib/layers.js ───────────────────────────────────────────────────────────
// Photoshop-style lager-system med composite (merge) + split + intern history.
// Återanvänds av minkarta och sensorskiss. Inga externa beroenden.
//
// API (window.LAYERS):
//   create(opts) → mgr
//   CAP                              // max antal baslager (10)
//
// opts:
//   onChange()                       // anropas efter varje mutation (rendering, autosave)
//   onActiveChange(oldId, newId)     // anropas när aktivt lager byter
//   getShortcutMap()                 // returnerar appens shortcutMap
//   saveShortcutMap()                // sparar appens shortcutMap
//   openShortcutDialog(target, opts) // anropas när användaren vill binda tangent
//                                       target = '__layer:<id>', opts.label = lagernamn
//   panelHost                        // DOM-element där panelen renderas
//   labelDefault                     // 'Lager' (eller 'Layer')
//
// Layer-objekt:
//   { id, name, visible, type, childIds?, mergedAt? }
//   type = 'single' | 'composite'
//   composite har childIds = [layerId, ...]
//
// mgr.layers          Map<id, Layer>
// mgr.order           string[] — top-level lager-ids (composites + fristående singles), top→bottom
// mgr.activeId        string — alltid en 'single'
// mgr.history         Array — append-only ops-logg

(function (global) {
    'use strict';

    const CAP = 10;
    const STYLE_INJECTED_FLAG = '__layersCssInjected';

    function uid() {
        return 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    function nowMs() { return Date.now(); }

    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function injectCss() {
        if (document[STYLE_INJECTED_FLAG]) return;
        document[STYLE_INJECTED_FLAG] = true;
        const style = document.createElement('style');
        style.textContent = `
.lyr-panel { margin: 6px 0; }
.lyr-panel summary { cursor: pointer; padding: 6px 10px; user-select: none;
    display: flex; align-items: center; gap: 8px; font-weight: 600;
    background: var(--surface-2, #1f2a1f); border: 1px solid var(--border, #3a4a3a);
    border-radius: 4px; color: var(--text-primary, #d4d4d4); font-size: 0.85rem; }
.lyr-panel summary::-webkit-details-marker { display: none; }
.lyr-panel summary::marker { content: ''; }
.lyr-panel summary::before { content: '▸'; display: inline-block; transition: transform .15s; font-size: .7rem; }
.lyr-panel[open] summary::before { transform: rotate(90deg); }
.lyr-head-count { color: var(--text-muted, #888); font-weight: 400; font-size: 0.75rem; }
.lyr-head-actions { margin-left: auto; display: flex; gap: 4px; }
.lyr-head-actions button { background: transparent; border: 1px solid var(--border, #3a4a3a);
    color: var(--text-primary, #d4d4d4); padding: 2px 8px; border-radius: 3px;
    font-size: 0.74rem; cursor: pointer; }
.lyr-head-actions button:hover:not(:disabled) { background: var(--surface-3, #2a3a2a); }
.lyr-head-actions button:disabled { opacity: 0.4; cursor: not-allowed; }
.lyr-head-actions button.is-primary { background: var(--accent, #5a8a5a); border-color: var(--accent, #5a8a5a); color: #fff; }
.lyr-body { padding: 6px 4px 4px; }
.lyr-list { list-style: none; margin: 0; padding: 0; }
.lyr-row { display: flex; align-items: center; gap: 4px; padding: 4px 6px;
    border: 1px solid transparent; border-radius: 3px; margin-bottom: 2px;
    font-size: 0.82rem; color: var(--text-primary, #d4d4d4); }
.lyr-row:hover { background: var(--surface-2, #1f2a1f); }
.lyr-row.is-active { background: var(--surface-3, #2a3a2a); border-color: var(--accent, #5a8a5a); }
.lyr-row.is-composite { background: rgba(90,138,90,0.08); border-style: dashed; border-color: var(--border, #3a4a3a); }
.lyr-row.is-child { margin-left: 18px; opacity: 0.85; font-size: 0.78rem; }
.lyr-mergecb { margin: 0 4px 0 0; cursor: pointer; }
.lyr-vis { background: transparent; border: 1px solid var(--border, #3a4a3a);
    color: var(--text-primary, #d4d4d4); width: 22px; height: 22px; border-radius: 3px;
    cursor: pointer; font-size: 0.85rem; padding: 0; line-height: 1; }
.lyr-vis.is-hidden { color: var(--text-muted, #888); background: transparent; }
.lyr-vis:hover { background: var(--surface-3, #2a3a2a); }
.lyr-name { flex: 1; min-width: 0; padding: 2px 4px; border-radius: 2px; cursor: pointer;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lyr-name[contenteditable="true"] { background: var(--surface-1, #0f1a0f); outline: 1px solid var(--accent, #5a8a5a);
    cursor: text; white-space: nowrap; overflow: hidden; }
.lyr-count { color: var(--text-muted, #888); font-size: 0.72rem; padding: 0 4px; }
.lyr-key { font-family: monospace; font-size: 0.74rem; padding: 1px 5px; border-radius: 2px;
    background: var(--surface-1, #0f1a0f); border: 1px solid var(--border, #3a4a3a);
    color: var(--text-primary, #d4d4d4); cursor: pointer; min-width: 18px; text-align: center; }
.lyr-key.is-empty { color: var(--text-muted, #888); }
.lyr-btn { background: transparent; border: 1px solid var(--border, #3a4a3a);
    color: var(--text-primary, #d4d4d4); padding: 1px 6px; border-radius: 2px;
    cursor: pointer; font-size: 0.74rem; line-height: 1; }
.lyr-btn:hover:not(:disabled) { background: var(--surface-3, #2a3a2a); }
.lyr-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.lyr-btn.is-danger:hover { background: #6b2a2a; border-color: #6b2a2a; color: #fff; }
.lyr-children { list-style: none; margin: 4px 0 0; padding: 0; }
.lyr-empty { color: var(--text-muted, #888); font-size: 0.78rem; padding: 8px;
    text-align: center; font-style: italic; }
.lyr-hint { color: var(--text-muted, #888); font-size: 0.72rem; padding: 6px 4px 0;
    text-align: center; }
.lyr-warn { color: #e0a060; font-size: 0.72rem; padding: 4px 6px; }
        `;
        document.head.appendChild(style);
    }

    // ── Manager-fabriken ───────────────────────────────────────────────────
    function createManager(opts) {
        opts = opts || {};
        injectCss();

        const mgr = {
            layers: Object.create(null),
            order: [],          // top-level ids (singles ej i composite + composites)
            activeId: null,
            history: [],
            _renderQueued: false
        };

        // ── Internal helpers ────────────────────────────────────────────────
        function pushHistory(op, payload) {
            mgr.history.push(Object.assign({ ts: nowMs(), op: op }, payload || {}));
            if (mgr.history.length > 500) mgr.history.shift();
        }

        function markChanged() {
            if (typeof opts.onChange === 'function') opts.onChange();
            queueRender();
        }

        function queueRender() {
            if (mgr._renderQueued) return;
            mgr._renderQueued = true;
            Promise.resolve().then(() => {
                mgr._renderQueued = false;
                renderPanel();
            });
        }

        function parentOf(id) {
            for (const lid of Object.keys(mgr.layers)) {
                const l = mgr.layers[lid];
                if (l.type === 'composite' && l.childIds && l.childIds.indexOf(id) >= 0) return lid;
            }
            return null;
        }

        function topLevelOf(id) {
            let cur = id;
            let safety = 20;
            while (safety-- > 0) {
                const p = parentOf(cur);
                if (!p) return cur;
                cur = p;
            }
            return cur;
        }

        function descendantsOf(id) {
            const l = mgr.layers[id];
            if (!l) return [];
            if (l.type === 'single') return [id];
            const out = [];
            (l.childIds || []).forEach(cid => {
                out.push.apply(out, descendantsOf(cid));
            });
            return out;
        }

        function countSingles() {
            let n = 0;
            for (const lid of Object.keys(mgr.layers)) {
                if (mgr.layers[lid].type === 'single') n++;
            }
            return n;
        }

        function findFirstSingleInOrder() {
            // För välj-aktiv vid radera. Loopar mgr.order top→bottom, dyker ned i composites.
            for (const lid of mgr.order) {
                const dl = descendantsOf(lid);
                if (dl.length) return dl[0];
            }
            return null;
        }

        function isVisible(id) {
            let cur = id;
            let safety = 20;
            while (cur && safety-- > 0) {
                const l = mgr.layers[cur];
                if (!l) return false;
                if (!l.visible) return false;
                cur = parentOf(cur);
            }
            return true;
        }

        // ── Public ops ──────────────────────────────────────────────────────
        function createLayer(name, atTop) {
            if (countSingles() >= CAP) return null;
            const id = uid();
            const layer = {
                id: id,
                name: name || ((opts.labelDefault || 'Lager') + ' ' + (countSingles() + 1)),
                visible: true,
                type: 'single'
            };
            mgr.layers[id] = layer;
            if (atTop !== false) mgr.order.unshift(id); else mgr.order.push(id);
            if (!mgr.activeId) mgr.activeId = id;
            pushHistory('create', { id: id, name: layer.name });
            markChanged();
            return id;
        }

        function renameLayer(id, newName) {
            const l = mgr.layers[id];
            if (!l) return;
            const prev = l.name;
            l.name = String(newName || '').trim() || prev;
            if (l.name !== prev) {
                pushHistory('rename', { id: id, from: prev, to: l.name });
                markChanged();
            }
        }

        function reorder(id, delta) {
            // delta = -1 (upp), +1 (ner) i top-level. Composite-barn rörs via separat API.
            const idx = mgr.order.indexOf(id);
            if (idx < 0) return;
            const newIdx = Math.max(0, Math.min(mgr.order.length - 1, idx + delta));
            if (newIdx === idx) return;
            mgr.order.splice(idx, 1);
            mgr.order.splice(newIdx, 0, id);
            pushHistory('reorder', { id: id, from: idx, to: newIdx });
            markChanged();
        }

        function setVisible(id, v) {
            const l = mgr.layers[id];
            if (!l) return;
            if (l.visible === v) return;
            l.visible = !!v;
            pushHistory('visible', { id: id, visible: !!v });
            markChanged();
        }

        function toggleVisible(id) {
            const l = mgr.layers[id];
            if (l) setVisible(id, !l.visible);
        }

        function setActive(id) {
            const l = mgr.layers[id];
            if (!l || l.type !== 'single') return;
            if (mgr.activeId === id) return;
            const old = mgr.activeId;
            mgr.activeId = id;
            pushHistory('active', { from: old, to: id });
            if (typeof opts.onActiveChange === 'function') opts.onActiveChange(old, id);
            queueRender();
        }

        function deleteLayer(id, moveTargetId) {
            // Tar bort ett baslager. Anroparen är ansvarig för att flytta/radera objekten
            // före anropet — vi rapporterar bara via callback om vad som ska hända.
            const l = mgr.layers[id];
            if (!l) return false;
            if (l.type === 'single' && countSingles() <= 1) return false; // sista lagret får inte tas bort
            // Plocka ut ur composite om den är ett barn
            const pid = parentOf(id);
            if (pid) {
                const p = mgr.layers[pid];
                p.childIds = p.childIds.filter(c => c !== id);
                // Om compositen blir tom, splittra också
                if (!p.childIds.length) {
                    delete mgr.layers[pid];
                    mgr.order = mgr.order.filter(o => o !== pid);
                }
            } else {
                mgr.order = mgr.order.filter(o => o !== id);
            }
            // Om composite raderas, lyft barnen till top-level (= split)
            if (l.type === 'composite') {
                (l.childIds || []).forEach(cid => {
                    if (!mgr.order.includes(cid)) mgr.order.push(cid);
                });
            }
            delete mgr.layers[id];
            // Rensa hotkey
            unbindKey(id);
            // Aktivt lager → välj ett annat
            if (mgr.activeId === id || !mgr.layers[mgr.activeId] || mgr.layers[mgr.activeId].type !== 'single') {
                mgr.activeId = findFirstSingleInOrder();
            }
            pushHistory('delete', { id: id, name: l.name, type: l.type, moveTargetId: moveTargetId || null });
            markChanged();
            return true;
        }

        function merge(ids, name) {
            // Skapar composite som referar singles (eller andra composites — vi flatten:ar)
            if (!ids || ids.length < 2) return null;
            const baseIds = [];
            ids.forEach(id => {
                const l = mgr.layers[id];
                if (!l) return;
                if (l.type === 'composite') {
                    baseIds.push.apply(baseIds, l.childIds || []);
                } else {
                    baseIds.push(id);
                }
            });
            // Dedupe
            const seen = Object.create(null);
            const childIds = [];
            baseIds.forEach(id => { if (!seen[id]) { seen[id] = 1; childIds.push(id); } });
            if (childIds.length < 2) return null;

            const cid = uid();
            const composite = {
                id: cid,
                name: name || (opts.labelDefault || 'Lager') + ' (' + childIds.length + ' sammansl.)',
                visible: true,
                type: 'composite',
                childIds: childIds,
                mergedAt: nowMs(),
                sourceNames: childIds.map(c => (mgr.layers[c] && mgr.layers[c].name) || c)
            };
            mgr.layers[cid] = composite;

            // Bestäm position: där det första sammanslagna lagret låg i top-level
            const firstIdx = mgr.order.findIndex(o => o === childIds[0] || (mgr.layers[o].childIds && mgr.layers[o].childIds.indexOf(childIds[0]) >= 0));
            // Ta bort alla sammanslagna IDs (och eventuella composites som flattenades) från order
            const idsToRemove = new Set();
            ids.forEach(id => idsToRemove.add(id));
            childIds.forEach(id => idsToRemove.add(id));
            // Composites som flattenades: rensa även dem från layers
            ids.forEach(id => {
                if (mgr.layers[id] && mgr.layers[id].type === 'composite' && id !== cid) {
                    delete mgr.layers[id];
                    unbindKey(id);
                }
            });
            mgr.order = mgr.order.filter(o => !idsToRemove.has(o));
            const insertAt = firstIdx >= 0 ? Math.min(firstIdx, mgr.order.length) : 0;
            mgr.order.splice(insertAt, 0, cid);

            // Aktivt lager kan vara ett av barnen — det är OK, det fortsätter peka på rätt single
            pushHistory('merge', { id: cid, childIds: childIds.slice(), name: composite.name });
            markChanged();
            return cid;
        }

        function split(compositeId) {
            const c = mgr.layers[compositeId];
            if (!c || c.type !== 'composite') return false;
            const idx = mgr.order.indexOf(compositeId);
            const children = (c.childIds || []).slice();
            mgr.order.splice(idx, 1);
            // Lägg in barnen där compositen låg, i samma ordning som childIds
            children.forEach((cid, i) => {
                if (mgr.layers[cid]) mgr.order.splice(idx + i, 0, cid);
            });
            unbindKey(compositeId);
            delete mgr.layers[compositeId];
            pushHistory('split', { id: compositeId, name: c.name, childIds: children });
            markChanged();
            return true;
        }

        // ── Hotkey-integration ──────────────────────────────────────────────
        function targetForLayer(id) { return '__layer:' + id; }

        function keyForLayer(id) {
            const sm = (typeof opts.getShortcutMap === 'function') ? opts.getShortcutMap() : null;
            if (!sm) return null;
            const target = targetForLayer(id);
            return Object.keys(sm).find(k => sm[k] === target) || null;
        }

        function unbindKey(id) {
            if (typeof opts.getShortcutMap !== 'function') return;
            const sm = opts.getShortcutMap();
            const t = targetForLayer(id);
            let changed = false;
            Object.keys(sm).forEach(k => {
                if (sm[k] === t) { delete sm[k]; changed = true; }
            });
            if (changed && typeof opts.saveShortcutMap === 'function') opts.saveShortcutMap();
        }

        function handleKey(key) {
            // Anropas från appens keydown. Returnerar true om tangenten togglade ett lager.
            if (typeof opts.getShortcutMap !== 'function') return false;
            const sm = opts.getShortcutMap();
            const target = sm[key];
            if (!target || typeof target !== 'string' || target.indexOf('__layer:') !== 0) return false;
            const lid = target.slice('__layer:'.length);
            if (!mgr.layers[lid]) return false;
            toggleVisible(lid);
            return true;
        }

        // ── Persistens ──────────────────────────────────────────────────────
        function serialize() {
            return {
                v: 1,
                layers: mgr.layers,
                order: mgr.order.slice(),
                activeId: mgr.activeId,
                history: mgr.history.slice(-200)  // begränsa storlek
            };
        }

        function deserialize(state) {
            if (!state || typeof state !== 'object') return false;
            mgr.layers = state.layers || Object.create(null);
            mgr.order = Array.isArray(state.order) ? state.order.slice() : [];
            mgr.activeId = state.activeId || null;
            mgr.history = Array.isArray(state.history) ? state.history.slice() : [];
            // Sanity: aktivt lager måste vara en existerande single
            if (!mgr.activeId || !mgr.layers[mgr.activeId] || mgr.layers[mgr.activeId].type !== 'single') {
                mgr.activeId = findFirstSingleInOrder();
            }
            queueRender();
            return true;
        }

        function ensureDefault() {
            // Skapar ett första baslager om inget finns. Anropas vid migration.
            if (Object.keys(mgr.layers).length === 0) {
                createLayer((opts.labelDefault || 'Lager') + ' 1');
            } else if (!mgr.activeId) {
                mgr.activeId = findFirstSingleInOrder();
                queueRender();
            }
        }

        // ── Panel-rendering ─────────────────────────────────────────────────
        let _mergeSelection = new Set();

        function renderPanel() {
            const host = opts.panelHost;
            if (!host) return;
            const wasOpen = host.querySelector('details.lyr-panel') ?
                host.querySelector('details.lyr-panel').open : true;

            const singles = countSingles();
            const canAdd = singles < CAP;
            const selectedCount = _mergeSelection.size;
            const canMerge = selectedCount >= 2;

            let html = '<details class="lyr-panel"' + (wasOpen ? ' open' : '') + '>';
            html += '<summary>';
            html += '<span>Lager</span>';
            html += '<span class="lyr-head-count">' + singles + ' / ' + CAP + '</span>';
            html += '<span class="lyr-head-actions">';
            html += '<button type="button" class="lyr-add"' + (canAdd ? '' : ' disabled title="Max ' + CAP + ' baslager"') + '>+ Nytt</button>';
            html += '<button type="button" class="lyr-merge' + (canMerge ? ' is-primary' : '') + '"' +
                (canMerge ? '' : ' disabled') + '>Sammanfoga' + (selectedCount ? ' (' + selectedCount + ')' : '') + '</button>';
            html += '</span></summary>';
            html += '<div class="lyr-body">';

            if (!mgr.order.length) {
                html += '<div class="lyr-empty">Inga lager. Klicka "+ Nytt" för att skapa.</div>';
            } else {
                html += '<ul class="lyr-list">';
                mgr.order.forEach(id => {
                    const l = mgr.layers[id];
                    if (!l) return;
                    html += renderRow(l, false);
                });
                html += '</ul>';
            }

            html += '<div class="lyr-hint">Tips: dubbelklicka tangent-rutan för att binda hotkey · Importera GPX/KMZ via menyn ovan</div>';
            html += '</div></details>';

            host.innerHTML = html;
            attachPanelHandlers(host);
        }

        function renderRow(l, isChild) {
            const isActive = (l.type === 'single' && l.id === mgr.activeId);
            const visEff = isVisible(l.id);
            const isComp = (l.type === 'composite');
            const classes = ['lyr-row'];
            if (isActive) classes.push('is-active');
            if (isComp) classes.push('is-composite');
            if (isChild) classes.push('is-child');

            const key = keyForLayer(l.id);
            const objCount = typeof opts.countObjectsInLayer === 'function' ? opts.countObjectsInLayer(l.id) : null;
            const checkboxDisabled = isChild ? ' disabled title="Barn till ett sammanfogat lager"' : '';

            let html = '<li class="' + classes.join(' ') + '" data-id="' + escapeHtml(l.id) + '">';
            html += '<input type="checkbox" class="lyr-mergecb" data-id="' + escapeHtml(l.id) + '"' +
                checkboxDisabled + (_mergeSelection.has(l.id) ? ' checked' : '') + '>';
            html += '<button type="button" class="lyr-vis' + (visEff ? '' : ' is-hidden') +
                '" data-id="' + escapeHtml(l.id) + '" title="Synlighet">' + (visEff ? '●' : '○') + '</button>';
            html += '<span class="lyr-name" data-id="' + escapeHtml(l.id) + '" title="Klick = aktivt, dubbelklick = byt namn">' +
                escapeHtml(l.name) + (isComp ? ' ⛓' : '') + '</span>';
            if (objCount != null && l.type === 'single') {
                html += '<span class="lyr-count" title="Antal objekt">' + objCount + '</span>';
            }
            html += '<span class="lyr-key' + (key ? '' : ' is-empty') + '" data-id="' + escapeHtml(l.id) +
                '" title="Klick = bind tangent">' + (key ? key.toUpperCase() : '–') + '</span>';
            const idx = mgr.order.indexOf(l.id);
            const isTop = !isChild && idx === 0;
            const isBottom = !isChild && idx === mgr.order.length - 1;
            html += '<button type="button" class="lyr-btn lyr-up" data-id="' + escapeHtml(l.id) +
                '"' + ((isChild || isTop) ? ' disabled' : '') + ' title="Flytta upp">▲</button>';
            html += '<button type="button" class="lyr-btn lyr-down" data-id="' + escapeHtml(l.id) +
                '"' + ((isChild || isBottom) ? ' disabled' : '') + ' title="Flytta ner">▼</button>';
            if (isComp) {
                html += '<button type="button" class="lyr-btn lyr-split" data-id="' + escapeHtml(l.id) +
                    '" title="Dela upp till enskilda lager">Dela</button>';
            }
            html += '<button type="button" class="lyr-btn is-danger lyr-del" data-id="' + escapeHtml(l.id) +
                '" title="Ta bort">×</button>';
            html += '</li>';

            // Composite-barn nästlat
            if (isComp && l.childIds && l.childIds.length) {
                html += '<ul class="lyr-children">';
                l.childIds.forEach(cid => {
                    const child = mgr.layers[cid];
                    if (child) html += renderRow(child, true);
                });
                html += '</ul>';
            }
            return html;
        }

        function attachPanelHandlers(host) {
            const addBtn = host.querySelector('.lyr-add');
            if (addBtn) addBtn.addEventListener('click', () => {
                const id = createLayer();
                if (id) setActive(id);
            });

            const mergeBtn = host.querySelector('.lyr-merge');
            if (mergeBtn) mergeBtn.addEventListener('click', () => {
                if (_mergeSelection.size < 2) return;
                const ids = Array.from(_mergeSelection);
                _mergeSelection.clear();
                merge(ids);
            });

            host.querySelectorAll('.lyr-mergecb').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    const id = e.target.dataset.id;
                    if (e.target.checked) _mergeSelection.add(id);
                    else _mergeSelection.delete(id);
                    queueRender();
                });
            });

            host.querySelectorAll('.lyr-vis').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleVisible(btn.dataset.id);
                });
            });

            host.querySelectorAll('.lyr-name').forEach(span => {
                let dblTimer = null;
                span.addEventListener('click', (e) => {
                    if (dblTimer) return;
                    dblTimer = setTimeout(() => {
                        dblTimer = null;
                        const id = span.dataset.id;
                        const l = mgr.layers[id];
                        if (l && l.type === 'single') setActive(id);
                    }, 220);
                });
                span.addEventListener('dblclick', (e) => {
                    if (dblTimer) { clearTimeout(dblTimer); dblTimer = null; }
                    e.preventDefault();
                    span.setAttribute('contenteditable', 'true');
                    span.textContent = mgr.layers[span.dataset.id].name;
                    const range = document.createRange();
                    range.selectNodeContents(span);
                    const sel = window.getSelection();
                    sel.removeAllRanges(); sel.addRange(range);
                    span.focus();
                });
                span.addEventListener('blur', () => {
                    if (span.getAttribute('contenteditable') !== 'true') return;
                    span.removeAttribute('contenteditable');
                    renameLayer(span.dataset.id, span.textContent);
                });
                span.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
                    else if (e.key === 'Escape') {
                        e.preventDefault();
                        span.textContent = mgr.layers[span.dataset.id].name;
                        span.blur();
                    }
                });
            });

            host.querySelectorAll('.lyr-key').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof opts.openShortcutDialog !== 'function') return;
                    const id = el.dataset.id;
                    const l = mgr.layers[id];
                    if (!l) return;
                    opts.openShortcutDialog(targetForLayer(id), { label: l.name });
                });
            });

            host.querySelectorAll('.lyr-up').forEach(btn => {
                btn.addEventListener('click', () => reorder(btn.dataset.id, -1));
            });
            host.querySelectorAll('.lyr-down').forEach(btn => {
                btn.addEventListener('click', () => reorder(btn.dataset.id, +1));
            });
            host.querySelectorAll('.lyr-split').forEach(btn => {
                btn.addEventListener('click', () => split(btn.dataset.id));
            });
            host.querySelectorAll('.lyr-del').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const l = mgr.layers[id];
                    if (!l) return;
                    const isLast = l.type === 'single' && countSingles() <= 1;
                    if (isLast) {
                        alert('Kan inte ta bort sista baslagret.');
                        return;
                    }
                    if (typeof opts.confirmDelete === 'function') {
                        opts.confirmDelete(id, (moveTargetId) => deleteLayer(id, moveTargetId));
                    } else {
                        if (confirm('Ta bort lagret "' + l.name + '" och alla dess objekt?')) {
                            deleteLayer(id);
                        }
                    }
                });
            });
        }

        // ── Exponera API ────────────────────────────────────────────────────
        Object.assign(mgr, {
            // Ops
            createLayer, renameLayer, reorder, setVisible, toggleVisible,
            setActive, deleteLayer, merge, split,
            // Read
            isVisible, parentOf, topLevelOf, descendantsOf, countSingles,
            // Hotkey
            keyForLayer, unbindKey, handleKey, targetForLayer,
            // Persistens
            serialize, deserialize, ensureDefault,
            // UI
            renderPanel,
            // Merge-selection
            clearMergeSelection: () => { _mergeSelection.clear(); queueRender(); }
        });

        return mgr;
    }

    global.LAYERS = {
        create: createManager,
        CAP: CAP
    };

}(window));
