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
  var list = document.querySelector('[data-filterable]'); //[cite: 2]
  if (list) {
    var search = document.querySelector('[data-filter="q"]'); //[cite: 2]
    var selects = Array.prototype.slice.call(document.querySelectorAll('select[data-filter]')); //[cite: 2]
    var chips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-filter-statut]')); //[cite: 2]
    var counter = document.querySelector('[data-count]'); //[cite: 2]
    var empty = document.querySelector('[data-empty]'); //[cite: 2]
    var active = new Set(); //[cite: 2]

    function norm(s) {
      return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); //[cite: 2]
    }

    function apply() {
      // CORRECTION 1 : On récupère les items à chaque appel pour inclure ceux générés dynamiquement par le JSON
      var currentItems = Array.prototype.slice.call(list.querySelectorAll('[data-item]'));
      
      var q = norm(search ? search.value : ''); //[cite: 2]
      var sel = {}; //[cite: 2]
      selects.forEach(function (s) { if (s.value) sel[s.getAttribute('data-filter')] = s.value; }); //[cite: 2]
      var shown = 0; //[cite: 2]

      currentItems.forEach(function (el) {
        var ok = true; //[cite: 2]
        if (active.size && !active.has(el.getAttribute('data-statut'))) ok = false; //[cite: 2]
        for (var k in sel) { //[cite: 2]
          if (ok && (el.getAttribute('data-' + k) || '').split(' ').indexOf(sel[k]) === -1) ok = false; //[cite: 2]
        }
        if (ok && q && norm(el.getAttribute('data-search')).indexOf(q) === -1) ok = false; //[cite: 2]
        
        // CORRECTION 2 : Utilisation prioritaire du style CSS inline pour contrer un éventuel "display: flex/grid"
        el.style.display = ok ? '' : 'none';
        
        if (ok) shown++; //[cite: 2]
      });
      
      if (counter) counter.textContent = shown + (shown > 1 ? ' entrées' : ' entrée'); //[cite: 2]
      
      // Adaptation de l'affichage du message vide avec le style.display
      if (empty) empty.style.display = (shown === 0 && currentItems.length > 0) ? '' : 'none';

      try { //[cite: 2]
        var p = new URLSearchParams(); //[cite: 2]
        if (q) p.set('q', search.value); //[cite: 2]
        if (active.size) p.set('statut', Array.from(active).join(',')); //[cite: 2]
        for (var k2 in sel) p.set(k2, sel[k2]); //[cite: 2]
        var s = p.toString(); //[cite: 2]
        history.replaceState(null, '', s ? '?' + s : location.pathname); //[cite: 2]
      } catch (e) { /* ignore */ } //[cite: 2]
    }

    chips.forEach(function (c) { //[cite: 2]
      c.addEventListener('click', function () { //[cite: 2]
        var v = c.getAttribute('data-filter-statut'); //[cite: 2]
        if (active.has(v)) { active.delete(v); c.setAttribute('aria-pressed', 'false'); } //[cite: 2]
        else { active.add(v); c.setAttribute('aria-pressed', 'true'); } //[cite: 2]
        apply(); //[cite: 2]
      });
    });
    
    if (search) search.addEventListener('input', apply); //[cite: 2]
    selects.forEach(function (s) { s.addEventListener('change', apply); }); //[cite: 2]

    var reset = document.querySelector('[data-action="reset"]'); //[cite: 2]
    if (reset) reset.addEventListener('click', function () { //[cite: 2]
      if (search) search.value = ''; //[cite: 2]
      selects.forEach(function (s) { s.value = ''; }); //[cite: 2]
      active.clear(); //[cite: 2]
      chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); }); //[cite: 2]
      apply(); //[cite: 2]
    });

    /* Pré-remplissage depuis l'URL */ //[cite: 2]
    try { //[cite: 2]
      var params = new URLSearchParams(location.search); //[cite: 2]
      if (params.get('q') && search) search.value = params.get('q'); //[cite: 2]
      if (params.get('statut')) { //[cite: 2]
        params.get('statut').split(',').forEach(function (v) { //[cite: 2]
          active.add(v); //[cite: 2]
          var c = document.querySelector('.chip[data-filter-statut="' + v + '"]'); //[cite: 2]
          if (c) c.setAttribute('aria-pressed', 'true'); //[cite: 2]
        });
      }
      selects.forEach(function (s) { //[cite: 2]
        var v = params.get(s.getAttribute('data-filter')); //[cite: 2]
        if (v) s.value = v; //[cite: 2]
      });
    } catch (e) { /* ignore */ } //[cite: 2]
    
    apply(); //[cite: 2]

    // CORRECTION 3 : Écouteur invisible surveillant l'injection asynchrone des données JSON
    var observer = new MutationObserver(function(mutations) {
        var hasNewNodes = mutations.some(function(m) { return m.addedNodes.length > 0; });
        if (hasNewNodes) apply(); 
    });
    observer.observe(list, { childList: true, subtree: true });
  }

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
