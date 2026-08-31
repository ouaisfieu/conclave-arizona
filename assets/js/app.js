/* Conclave Arizona — comportements communs. Aucune dépendance. */
(function () {
  'use strict';

  /* --- Thème : sombre par défaut, préférence mémorisée si disponible --- */
  var root = document.documentElement;
  function readTheme() {
    try { return localStorage.getItem('ca-theme'); } catch (e) { return null; }
  }
  function writeTheme(v) {
    try { localStorage.setItem('ca-theme', v); } catch (e) { /* stockage indisponible */ }
  }
  var saved = readTheme();
  if (saved === 'light') root.setAttribute('data-theme', 'light');

  var themeBtn = document.querySelector('[data-action="theme"]');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var light = root.getAttribute('data-theme') === 'light';
      if (light) { root.removeAttribute('data-theme'); writeTheme('dark'); }
      else { root.setAttribute('data-theme', 'light'); writeTheme('light'); }
      themeBtn.setAttribute('aria-pressed', String(!light));
    });
  }

  /* --- Menu mobile --- */
  var menuBtn = document.querySelector('[data-action="menu"]');
  var nav = document.getElementById('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
  }

  /* --- Compte à rebours --- */
  var cd = document.querySelector('[data-countdown]');
  if (cd) {
    var target = new Date(cd.getAttribute('data-countdown') + 'T09:00:00+02:00');
    var fields = {
      j: cd.querySelector('[data-cd="j"]'),
      h: cd.querySelector('[data-cd="h"]'),
      m: cd.querySelector('[data-cd="m"]'),
      s: cd.querySelector('[data-cd="s"]')
    };
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var tick = function () {
      var d = target - new Date();
      if (d < 0) d = 0;
      var sec = Math.floor(d / 1000);
      if (fields.j) fields.j.textContent = Math.floor(sec / 86400);
      if (fields.h) fields.h.textContent = pad(Math.floor(sec / 3600) % 24);
      if (fields.m) fields.m.textContent = pad(Math.floor(sec / 60) % 60);
      if (fields.s) fields.s.textContent = pad(sec % 60);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* --- Filtres de liste (mesures, sources, acteurs) --- */
  var list = document.querySelector('[data-filterable]');
  if (list) {
    var items = Array.prototype.slice.call(list.querySelectorAll('[data-item]'));
    var search = document.querySelector('[data-filter="q"]');
    var selects = Array.prototype.slice.call(document.querySelectorAll('select[data-filter]'));
    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-filter-statut]'));
    var counter = document.querySelector('[data-count]');
    var empty = document.querySelector('[data-empty]');
    var active = new Set();

    function norm(s) {
      return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function apply() {
      var q = norm(search ? search.value : '');
      var sel = {};
      selects.forEach(function (s) { if (s.value) sel[s.getAttribute('data-filter')] = s.value; });
      var shown = 0;
      items.forEach(function (el) {
        var ok = true;
        if (active.size && !active.has(el.getAttribute('data-statut'))) ok = false;
        for (var k in sel) {
          if (ok && (el.getAttribute('data-' + k) || '').split(' ').indexOf(sel[k]) === -1) ok = false;
        }
        if (ok && q && norm(el.getAttribute('data-search')).indexOf(q) === -1) ok = false;
        el.hidden = !ok;
        if (ok) shown++;
      });
      if (counter) counter.textContent = shown + (shown > 1 ? ' entrées' : ' entrée');
      if (empty) empty.hidden = shown !== 0;
      try {
        var p = new URLSearchParams();
        if (q) p.set('q', search.value);
        if (active.size) p.set('statut', Array.from(active).join(','));
        for (var k2 in sel) p.set(k2, sel[k2]);
        var s = p.toString();
        history.replaceState(null, '', s ? '?' + s : location.pathname);
      } catch (e) { /* ignore */ }
    }

    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var v = c.getAttribute('data-filter-statut');
        if (active.has(v)) { active.delete(v); c.setAttribute('aria-pressed', 'false'); }
        else { active.add(v); c.setAttribute('aria-pressed', 'true'); }
        apply();
      });
    });
    if (search) search.addEventListener('input', apply);
    selects.forEach(function (s) { s.addEventListener('change', apply); });

    var reset = document.querySelector('[data-action="reset"]');
    if (reset) reset.addEventListener('click', function () {
      if (search) search.value = '';
      selects.forEach(function (s) { s.value = ''; });
      active.clear();
      chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
      apply();
    });

    /* Pré-remplissage depuis l'URL */
    try {
      var params = new URLSearchParams(location.search);
      if (params.get('q') && search) search.value = params.get('q');
      if (params.get('statut')) {
        params.get('statut').split(',').forEach(function (v) {
          active.add(v);
          var c = document.querySelector('.chip[data-filter-statut="' + v + '"]');
          if (c) c.setAttribute('aria-pressed', 'true');
        });
      }
      selects.forEach(function (s) {
        var v = params.get(s.getAttribute('data-filter'));
        if (v) s.value = v;
      });
    } catch (e) { /* ignore */ }
    apply();
  }
})();
