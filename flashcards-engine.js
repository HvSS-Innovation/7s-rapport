/* Flashcards-engine — återanvändbar.
   Användning:
     Flashcards.mountBrowse(el, cards, opts)   // bläddra-läge
     Flashcards.mountExam(el, questions, opts) // prov-läge (flerval)
   Kort: { id, category?, front, back, hint? }
   Frågor: { q, options:[...], correct:n }
   Opts: { storageKey?:string }   — används för bestnoter (streak/best).
*/
(function (global) {
  'use strict';

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function fmtTime(ms) {
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}:${String(r).padStart(2,'0')}` : `${r}s`;
  }

  function safeGet(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }
  function safeSet(key, v) { try { localStorage.setItem(key, v); } catch (_) {} }

  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  /* ───────── Bläddra-läge ───────── */
  function mountBrowse(container, allCards, opts) {
    opts = opts || {};
    const storageKey = opts.storageKey || 'flashcards_browse';

    // State
    let queue = shuffle(allCards);     // återstående kort
    let missed = [];                    // kort markerade "kunde inte" — köas in igen
    let idx = 0;
    let flipped = false;
    let knew = 0;
    let didnt = 0;
    let startTs = Date.now();
    let total = queue.length;

    function render() {
      container.innerHTML = '';

      if (idx >= queue.length) {
        // Om missed finns: rotera in dem (du måste klara dem en gång innan sessionen är slut)
        if (missed.length > 0) {
          queue = shuffle(missed);
          missed = [];
          idx = 0;
          total = total + queue.length;
          // Fall-through till nästa kort
        } else {
          renderDone();
          return;
        }
      }

      const card = queue[idx];

      const wrap = el('div', 'fc-wrap');

      // Progress
      const prog = el('div', 'fc-progress');
      prog.appendChild(el('span', 'fc-prog-counter', `${idx + 1} / ${queue.length}`));
      if (card.category) prog.appendChild(el('span', 'fc-prog-cat', card.category));
      wrap.appendChild(prog);

      // Kort
      const cardEl = el('div', 'fc-card' + (flipped ? ' flipped' : ''));
      cardEl.setAttribute('role', 'button');
      cardEl.setAttribute('tabindex', '0');
      cardEl.setAttribute('aria-label', flipped ? 'Visar baksida. Tryck för att vända tillbaka.' : 'Tryck för att vända kortet.');

      if (!flipped) {
        const front = el('div', 'fc-front');
        const ft = el('div', 'fc-front-text');
        ft.textContent = card.front;
        front.appendChild(ft);
        if (card.hint) {
          const h = el('div', 'fc-hint', card.hint);
          front.appendChild(h);
        }
        const tip = el('div', 'fc-tap-hint', 'Tryck för att vända');
        front.appendChild(tip);
        cardEl.appendChild(front);
      } else {
        const back = el('div', 'fc-back');
        const bt = el('div', 'fc-back-text');
        bt.textContent = card.back;
        back.appendChild(bt);
        cardEl.appendChild(back);
      }
      cardEl.addEventListener('click', flip);
      cardEl.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      });
      wrap.appendChild(cardEl);

      // Actions
      const actions = el('div', 'fc-actions');
      if (!flipped) {
        const flipBtn = el('button', 'fc-btn fc-btn-secondary', 'Vänd');
        flipBtn.type = 'button';
        flipBtn.addEventListener('click', flip);
        actions.appendChild(flipBtn);
      } else {
        const noBtn = el('button', 'fc-btn fc-btn-no', 'Kunde inte');
        noBtn.type = 'button';
        noBtn.addEventListener('click', () => answer(false));
        const yesBtn = el('button', 'fc-btn fc-btn-yes', 'Kunde');
        yesBtn.type = 'button';
        yesBtn.addEventListener('click', () => answer(true));
        actions.appendChild(noBtn);
        actions.appendChild(yesBtn);
      }
      wrap.appendChild(actions);

      container.appendChild(wrap);
      cardEl.focus();
    }

    function flip() { flipped = !flipped; render(); }
    function answer(correct) {
      if (correct) knew++;
      else { didnt++; missed.push(queue[idx]); }
      idx++;
      flipped = false;
      render();
    }

    function renderDone() {
      const dur = Date.now() - startTs;
      const ratio = knew + didnt > 0 ? Math.round((knew / (knew + didnt)) * 100) : 0;

      // Bestnoter
      const bestKey = storageKey + '_best_ratio';
      const prevBest = parseInt(safeGet(bestKey) || '0', 10);
      let newBest = false;
      if (ratio > prevBest) { safeSet(bestKey, String(ratio)); newBest = true; }

      const wrap = el('div', 'fc-wrap');
      const head = el('div', 'fc-done-head', 'Klar');
      wrap.appendChild(head);

      const stats = el('div', 'fc-stats');
      stats.appendChild(buildStat(`${knew}/${knew + didnt}`, 'kunde'));
      stats.appendChild(buildStat(`${ratio}%`, 'andel'));
      stats.appendChild(buildStat(fmtTime(dur), 'tid'));
      if (prevBest > 0 || newBest) {
        const label = newBest ? 'nytt bästa' : 'bästa';
        const val = newBest ? `${ratio}%` : `${prevBest}%`;
        stats.appendChild(buildStat(val, label));
      }
      wrap.appendChild(stats);

      const actions = el('div', 'fc-actions');
      const again = el('button', 'fc-btn fc-btn-secondary', 'Slumpa om');
      again.type = 'button';
      again.addEventListener('click', () => {
        queue = shuffle(allCards); missed = []; idx = 0; flipped = false;
        knew = 0; didnt = 0; startTs = Date.now(); total = queue.length;
        render();
      });
      actions.appendChild(again);
      wrap.appendChild(actions);

      container.innerHTML = '';
      container.appendChild(wrap);
    }

    function buildStat(value, label) {
      const s = el('div', 'fc-stat');
      s.appendChild(el('div', 'fc-stat-val', value));
      s.appendChild(el('div', 'fc-stat-label', label));
      return s;
    }

    // Tangentbord
    function onKey(e) {
      if (!container.isConnected) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
      else if (flipped && (e.key === 'j' || e.key === 'J' || e.key === 'ArrowRight')) { e.preventDefault(); answer(true); }
      else if (flipped && (e.key === 'f' || e.key === 'F' || e.key === 'ArrowLeft')) { e.preventDefault(); answer(false); }
    }
    document.addEventListener('keydown', onKey);

    render();

    return { destroy() { document.removeEventListener('keydown', onKey); container.innerHTML = ''; } };
  }

  /* ───────── Prov-läge ───────── */
  function mountExam(container, allQuestions, opts) {
    opts = opts || {};
    const storageKey = opts.storageKey || 'flashcards_exam';
    const count = Math.min(opts.count || 20, allQuestions.length);
    const passAt = opts.passAt || Math.ceil(count * 0.8);

    let questions = shuffle(allQuestions).slice(0, count).map(q => ({
      ...q,
      // Slumpa även alternativen
      _opts: shuffle(q.options.map((o, i) => ({ text: o, originalIdx: i })))
    }));
    let idx = 0;
    let correct = 0;
    let wrongList = [];
    let answered = false;
    let chosenIdx = -1;
    let startTs = Date.now();

    function render() {
      container.innerHTML = '';

      if (idx >= questions.length) {
        renderDone();
        return;
      }

      const q = questions[idx];
      const wrap = el('div', 'fc-wrap');

      const prog = el('div', 'fc-progress');
      prog.appendChild(el('span', 'fc-prog-counter', `Fråga ${idx + 1} / ${questions.length}`));
      prog.appendChild(el('span', 'fc-prog-cat', `Godkänt ≥ ${passAt}`));
      wrap.appendChild(prog);

      const qBox = el('div', 'fc-q');
      qBox.textContent = q.q;
      wrap.appendChild(qBox);

      const optsEl = el('div', 'fc-options');
      q._opts.forEach((o, i) => {
        const btn = el('button', 'fc-option', o.text);
        btn.type = 'button';
        if (answered) {
          btn.disabled = true;
          if (o.originalIdx === q.correct) btn.classList.add('correct');
          if (i === chosenIdx && o.originalIdx !== q.correct) btn.classList.add('wrong');
        }
        btn.addEventListener('click', () => choose(i));
        optsEl.appendChild(btn);
      });
      wrap.appendChild(optsEl);

      const actions = el('div', 'fc-actions');
      if (answered) {
        const next = el('button', 'fc-btn fc-btn-primary', idx + 1 >= questions.length ? 'Visa resultat' : 'Nästa');
        next.type = 'button';
        next.addEventListener('click', advance);
        actions.appendChild(next);
        next.focus();
      }
      wrap.appendChild(actions);

      container.appendChild(wrap);
    }

    function choose(i) {
      if (answered) return;
      answered = true;
      chosenIdx = i;
      const q = questions[idx];
      const picked = q._opts[i];
      if (picked.originalIdx === q.correct) correct++;
      else wrongList.push({ q: q.q, picked: picked.text, right: q.options[q.correct] });
      render();
    }

    function advance() {
      idx++;
      answered = false;
      chosenIdx = -1;
      render();
    }

    function renderDone() {
      const dur = Date.now() - startTs;
      const passed = correct >= passAt;

      const bestKey = storageKey + '_best';
      const prevBest = parseInt(safeGet(bestKey) || '0', 10);
      let newBest = false;
      if (correct > prevBest) { safeSet(bestKey, String(correct)); newBest = true; }

      const wrap = el('div', 'fc-wrap');
      const head = el('div', 'fc-done-head ' + (passed ? 'pass' : 'fail'), passed ? 'Godkänt' : 'Underkänt');
      wrap.appendChild(head);

      const stats = el('div', 'fc-stats');
      stats.appendChild(buildStat(`${correct}/${questions.length}`, 'rätt'));
      stats.appendChild(buildStat(`${passAt}`, 'krävs'));
      stats.appendChild(buildStat(fmtTime(dur), 'tid'));
      if (prevBest > 0 || newBest) {
        stats.appendChild(buildStat(newBest ? `${correct}` : `${prevBest}`, newBest ? 'nytt bästa' : 'bästa'));
      }
      wrap.appendChild(stats);

      if (wrongList.length > 0) {
        const wrongHead = el('div', 'fc-wrong-head', 'Fel:');
        wrap.appendChild(wrongHead);
        const list = el('div', 'fc-wrong-list');
        wrongList.forEach(w => {
          const row = el('div', 'fc-wrong-row');
          row.appendChild(el('div', 'fc-wrong-q', w.q));
          const ans = el('div', 'fc-wrong-ans');
          const picked = el('span', 'fc-wrong-picked', `Du: ${w.picked}`);
          const right = el('span', 'fc-wrong-right', `Rätt: ${w.right}`);
          ans.appendChild(picked); ans.appendChild(right);
          row.appendChild(ans);
          list.appendChild(row);
        });
        wrap.appendChild(list);
      }

      const actions = el('div', 'fc-actions');
      const again = el('button', 'fc-btn fc-btn-primary', 'Nytt prov');
      again.type = 'button';
      again.addEventListener('click', () => {
        questions = shuffle(allQuestions).slice(0, count).map(q => ({
          ...q,
          _opts: shuffle(q.options.map((o, i) => ({ text: o, originalIdx: i })))
        }));
        idx = 0; correct = 0; wrongList = []; answered = false; chosenIdx = -1;
        startTs = Date.now();
        render();
      });
      actions.appendChild(again);
      wrap.appendChild(actions);

      container.innerHTML = '';
      container.appendChild(wrap);
    }

    function buildStat(value, label) {
      const s = el('div', 'fc-stat');
      s.appendChild(el('div', 'fc-stat-val', value));
      s.appendChild(el('div', 'fc-stat-label', label));
      return s;
    }

    render();

    return { destroy() { container.innerHTML = ''; } };
  }

  global.Flashcards = { mountBrowse, mountExam };
})(window);
