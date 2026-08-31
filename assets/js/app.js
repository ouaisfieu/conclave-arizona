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

  /* --- Compte à rebours (Initialisation statique) --- */
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

  /* --- Logique de filtrage dynamique --- */
  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function applyFilters() {
    var list = document.querySelector('[data-filterable]');
    if (!list) return; // Ignore si la page ne contient pas de liste
    
    // Scan en temps réel des éléments et de l'état des filtres
    var items = Array.prototype.slice.call(list.querySelectorAll('[data-item]'));
    var search = document.querySelector('[data-filter="q"]');
    var selects = Array.prototype.slice.call(document.querySelectorAll('select[data-filter]'));
    var activeChips = Array.prototype.slice.call(document.querySelectorAll('.chip[data-filter-statut][aria-pressed="true"]'));
    
    var q = norm(search ? search.value : '');
    var sel = {};
    selects.forEach(function (s) { if (s.value) sel[s.getAttribute('data-filter')] = s.value; });
    
    var activeStatus = new Set();
    activeChips.forEach(function(c) { activeStatus.add(c.getAttribute('data-filter-statut')); });

    var shown = 0;
    
    items.forEach(function (el) {
      var ok = true;
      
      // Vérification Statut
      if (activeStatus.size && !activeStatus.has(el.getAttribute('data-statut'))) ok = false;
      
      // Vérification Catégories (Selects)
      for (var k in sel) {
        if (ok && (el.getAttribute('data-' + k) || '').split(' ').indexOf(sel[k]) === -1) ok = false;
      }
      
      // Vérification Texte
      var dataSearch = el.getAttribute('data-search') || '';
      if (ok && q && norm(dataSearch).indexOf(q) === -1) ok = false;
      
      // Forçage de l'affichage / masquage
      el.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    
    // Mise à jour de l'interface
    var counter = document.querySelector('[data-count]');
    if (counter) counter.textContent = shown + (shown > 1 ? ' entrées' : ' entrée');
    
    var empty = document.querySelector('[data-empty]');
    if (empty) empty.style.display = (shown === 0 && items.length > 0) ? '' : 'none';

    // Synchronisation URL
    try {
      var p = new URLSearchParams();
      if (q) p.set('q', search.value);
      if (activeStatus.size) p.set('statut', Array.from(activeStatus).join(','));
      for (var k2 in sel) p.set(k2, sel[k2]);
      var s = p.toString();
      history.replaceState(null, '', s ? '?' + s : location.pathname);
    } catch (e) { /* ignore */ }
  }

  // Pré-remplissage initial sécurisé (attente de l'injection DOM)
  var urlApplied = false;
  function applyUrlParams() {
    if (urlApplied) return;
    var search = document.querySelector('[data-filter="q"]');
    var selects = document.querySelectorAll('select[data-filter]');
    if (!search && selects.length === 0) return; // Filtres pas encore injectés
    
    try {
      var params = new URLSearchParams(location.search);
      if (params.get('q') && search) search.value = params.get('q');
      if (params.get('statut')) {
        params.get('statut').split(',').forEach(function (v) {
          var c = document.querySelector('.chip[data-filter-statut="' + v + '"]');
          if (c) c.setAttribute('aria-pressed', 'true');
        });
      }
      selects.forEach(function (s) {
        var v = params.get(s.getAttribute('data-filter'));
        if (v) s.value = v;
      });
    } catch (e) {}
    
    urlApplied = true;
    applyFilters();
  }

  /* --- Délégation Globale des Événements --- */
  
  // Écoute des champs texte
  document.addEventListener('input', function(e) {
    if (e.target && e.target.matches && e.target.matches('[data-filter="q"]')) applyFilters();
  });

  // Écoute des listes déroulantes
  document.addEventListener('change', function(e) {
    if (e.target && e.target.matches && e.target.matches('select[data-filter]')) applyFilters();
  });

  // Écoute des boutons (Thème, Menu, Chips, Reset)
  document.addEventListener('click', function(e) {
    // 1. Bouton Thème
    var themeBtn = e.target.closest('[data-action="theme"]');
    if (themeBtn) {
      var light = root.getAttribute('data-theme') === 'light';
      if (light) { root.removeAttribute('data-theme'); writeTheme('dark'); }
      else { root.setAttribute('data-theme', 'light'); writeTheme('light'); }
      themeBtn.setAttribute('aria-pressed', String(!light));
      return;
    }

    // 2. Bouton Menu Mobile
    var menuBtn = e.target.closest('[data-action="menu"]');
    if (menuBtn) {
      var nav = document.getElementById('nav');
      if (nav) {
        var open = nav.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', String(open));
      }
      return;
    }

    // 3. Boutons Filtres (Chips)
    var chip = e.target.closest('.chip[data-filter-statut]');
    if (chip) {
      var pressed = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', String(!pressed));
      applyFilters();
      return;
    }
    
    // 4. Bouton Réinitialiser
    var reset = e.target.closest('[data-action="reset"]');
    if (reset) {
      var search = document.querySelector('[data-filter="q"]');
      if (search) search.value = '';
      document.querySelectorAll('select[data-filter]').forEach(function(s) { s.value = ''; });
      document.querySelectorAll('.chip[data-filter-statut]').forEach(function(c) { c.setAttribute('aria-pressed', 'false'); });
      applyFilters();
    }
  });

  /* --- Surveillance continue des injections JSON --- */
  var observer = new MutationObserver(function() {
    applyUrlParams(); // Remplit l'URL dès que les filtres apparaissent
    applyFilters();   // Tri dès que les cartes JSON apparaissent
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Exécution manuelle au lancement au cas où le DOM est déjà prêt
  applyUrlParams();
  applyFilters();

})();
