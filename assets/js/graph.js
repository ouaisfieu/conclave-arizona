/* Conclave Arizona — graphe de connaissance.
   Simulation de forces sur canvas, sans dépendance externe. */
(function () {
  'use strict';

  var canvas = document.getElementById('graph');
  if (!canvas || !window.__GRAPH__) return;

  var DATA = window.__GRAPH__;
  var ctx = canvas.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  var COLORS = {
    mesure: '#9fe8a8',
    acteur: '#c3b3f5',
    institution: '#8fb4ff',
    theme: '#ffd28f',
    angle: '#ff9f9f'
  };
  var LABELS = {
    mesure: 'Mesures',
    acteur: 'Acteurs',
    institution: 'Institutions',
    theme: 'Thèmes',
    angle: 'Angles morts'
  };

  /* ---------- Préparation des données ---------- */
  var nodes = DATA.nodes.map(function (n, i) {
    var a = (i / DATA.nodes.length) * Math.PI * 2;
    var r = 120 + (i % 9) * 26;
    return {
      id: n.id, label: n.label, type: n.type, url: n.url,
      statut: n.statut || null, desc: n.desc || '',
      deg: 0, x: Math.cos(a) * r, y: Math.sin(a) * r, vx: 0, vy: 0, r: 5
    };
  });
  var index = {};
  nodes.forEach(function (n) { index[n.id] = n; });

  var links = [];
  DATA.links.forEach(function (l) {
    var s = index[l.s], t = index[l.t];
    if (!s || !t || s === t) return;
    links.push({ s: s, t: t });
    s.deg++; t.deg++;
  });
  nodes.forEach(function (n) { n.r = 4.5 + Math.min(Math.sqrt(n.deg) * 2.4, 11); });
  var degSorted = nodes.slice().sort(function (a, b) { return b.deg - a.deg; });
  var labelSeuil = degSorted.length > 16 ? degSorted[15].deg : 0;

  var adj = {};
  links.forEach(function (l) {
    (adj[l.s.id] = adj[l.s.id] || []).push(l.t.id);
    (adj[l.t.id] = adj[l.t.id] || []).push(l.s.id);
  });

  /* ---------- Vue ---------- */
  var view = { x: 0, y: 0, k: 1 };
  var W = 0, H = 0;
  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', function () { resize(); draw(); });

  var hidden = new Set();
  var selected = null, hovered = null, dragging = null, panning = false;
  var last = { x: 0, y: 0 };
  var alpha = 1;

  function visible(n) { return !hidden.has(n.type); }

  /* ---------- Simulation ---------- */
  function step() {
    if (alpha < 0.005) return;
    alpha *= 0.985;
    var act = nodes.filter(visible);
    var n, m, i, j, dx, dy, d, f;

    /* Répulsion (O(n²) : le graphe reste sous ~250 nœuds) */
    for (i = 0; i < act.length; i++) {
      n = act[i];
      for (j = i + 1; j < act.length; j++) {
        m = act[j];
        dx = m.x - n.x; dy = m.y - n.y;
        d = dx * dx + dy * dy;
        if (d < 1) { d = 1; dx = (Math.random() - 0.5); dy = (Math.random() - 0.5); }
        if (d > 160000) continue;
        f = (1050 * alpha) / d;
        dx *= f; dy *= f;
        n.vx -= dx; n.vy -= dy;
        m.vx += dx; m.vy += dy;
      }
    }
    /* Ressorts */
    links.forEach(function (l) {
      if (!visible(l.s) || !visible(l.t)) return;
      var ddx = l.t.x - l.s.x, ddy = l.t.y - l.s.y;
      var dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
      var force = ((dist - 70) / dist) * 0.06 * alpha;
      ddx *= force; ddy *= force;
      l.s.vx += ddx; l.s.vy += ddy;
      l.t.vx -= ddx; l.t.vy -= ddy;
    });
    /* Gravité et amortissement */
    act.forEach(function (nd) {
      if (nd === dragging) return;
      var rr = Math.sqrt(nd.x * nd.x + nd.y * nd.y) || 1;
      var g = 0.0009 + (rr > 300 ? (rr - 300) * 0.00004 : 0);
      nd.vx -= nd.x * g * alpha;
      nd.vy -= nd.y * g * alpha;
      nd.vx *= 0.86; nd.vy *= 0.86;
      nd.x += nd.vx; nd.y += nd.vy;
    });
  }

  /* ---------- Rendu ---------- */
  function css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }
  function toScreen(n) {
    return { x: n.x * view.k + view.x + W / 2, y: n.y * view.k + view.y + H / 2 };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var focus = selected || hovered;
    var near = focus ? new Set([focus.id].concat(adj[focus.id] || [])) : null;

    ctx.lineWidth = 1;
    links.forEach(function (l) {
      if (!visible(l.s) || !visible(l.t)) return;
      var a = toScreen(l.s), b = toScreen(l.t);
      var on = !near || (near.has(l.s.id) && near.has(l.t.id));
      ctx.strokeStyle = on ? 'rgba(159,232,168,.42)' : 'rgba(140,160,150,.09)';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });

    nodes.forEach(function (n) {
      if (!visible(n)) return;
      var p = toScreen(n);
      var on = !near || near.has(n.id);
      var r = n.r * Math.max(view.k, 0.55);
      ctx.globalAlpha = on ? 1 : 0.18;
      ctx.fillStyle = COLORS[n.type] || '#9fe8a8';
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      if (n === selected) {
        ctx.strokeStyle = css('--lilas') || '#c3b3f5';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      }
      if ((n.deg >= labelSeuil || view.k > 1.35 || n === focus || (near && near.has(n.id))) && on) {
        ctx.font = '500 ' + Math.max(10, 11 * Math.min(view.k, 1.4)) + 'px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        var t = n.label.length > 32 ? n.label.slice(0, 30) + '…' : n.label;
        /* halo pour rester lisible au-dessus des arêtes */
        ctx.lineWidth = 3.2;
        ctx.strokeStyle = css('--bg-2') || '#111813';
        ctx.lineJoin = 'round';
        ctx.strokeText(t, p.x, p.y + r + 12);
        ctx.lineWidth = 1;
        ctx.fillStyle = css('--txt-2') || '#b3c4b9';
        ctx.fillText(t, p.x, p.y + r + 12);
      }
      ctx.globalAlpha = 1;
    });
  }

  /* Cadrage automatique : ajuste le zoom pour que tout le graphe tienne à l'écran */
  function fit(pad) {
    var act = nodes.filter(visible);
    if (!act.length) return;
    var xs = act.map(function (n) { return n.x; }).sort(function (a, b) { return a - b; });
    var ys = act.map(function (n) { return n.y; }).sort(function (a, b) { return a - b; });
    var q = function (arr, p) { return arr[Math.max(0, Math.min(arr.length - 1, Math.round(p * (arr.length - 1))))]; };
    var minX = q(xs, 0.02), maxX = q(xs, 0.98), minY = q(ys, 0.02), maxY = q(ys, 0.98);
    var gw = Math.max(maxX - minX, 1), gh = Math.max(maxY - minY, 1);
    var m = pad || 70;
    var k = Math.min((W - m * 2) / gw, (H - m * 2) / gh);
    view.k = Math.min(1.7, Math.max(0.28, k));
    view.x = -((minX + maxX) / 2) * view.k;
    view.y = -((minY + maxY) / 2) * view.k;
  }

  /* Pré-calcul : on déroule la simulation avant le premier rendu, puis on cadre. */
  var settled = false, frames = 0;
  function presolve(n) {
    var a = alpha;
    for (var i = 0; i < n; i++) step();
    alpha = Math.min(a, 0.05);
    fit();
    settled = true;
  }
  presolve(320);

  function loop() {
    step(); draw();
    frames++;
    if (!settled && (frames > 200 || alpha < 0.03)) { settled = true; fit(); }
    requestAnimationFrame(loop);
  }
  loop();

  /* ---------- Interaction ---------- */
  function pick(ev) {
    var rect = canvas.getBoundingClientRect();
    var mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
    var best = null, bd = 1e9;
    nodes.forEach(function (n) {
      if (!visible(n)) return;
      var p = toScreen(n);
      var d = (p.x - mx) * (p.x - mx) + (p.y - my) * (p.y - my);
      var rr = Math.max(n.r * view.k + 8, 12);
      if (d < rr * rr && d < bd) { bd = d; best = n; }
    });
    return { node: best, mx: mx, my: my };
  }

  canvas.addEventListener('pointerdown', function (ev) {
    canvas.setPointerCapture(ev.pointerId);
    var hit = pick(ev);
    last.x = ev.clientX; last.y = ev.clientY;
    if (hit.node) { dragging = hit.node; select(hit.node); }
    else { panning = true; select(null); }
  });
  canvas.addEventListener('pointermove', function (ev) {
    if (dragging) {
      var rect = canvas.getBoundingClientRect();
      dragging.x = (ev.clientX - rect.left - W / 2 - view.x) / view.k;
      dragging.y = (ev.clientY - rect.top - H / 2 - view.y) / view.k;
      dragging.vx = dragging.vy = 0;
      alpha = Math.max(alpha, 0.35);
      return;
    }
    if (panning) {
      view.x += ev.clientX - last.x;
      view.y += ev.clientY - last.y;
      last.x = ev.clientX; last.y = ev.clientY;
      return;
    }
    var h = pick(ev).node;
    if (h !== hovered) { hovered = h; canvas.style.cursor = h ? 'pointer' : 'grab'; }
  });
  function release() { dragging = null; panning = false; }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', function () { hovered = null; release(); });

  canvas.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    var f = Math.exp(-ev.deltaY * 0.0016);
    var k = Math.min(3.2, Math.max(0.32, view.k * f));
    var rect = canvas.getBoundingClientRect();
    var mx = ev.clientX - rect.left - W / 2, my = ev.clientY - rect.top - H / 2;
    view.x = mx - (mx - view.x) * (k / view.k);
    view.y = my - (my - view.y) * (k / view.k);
    view.k = k;
  }, { passive: false });

  /* ---------- Panneau ---------- */
  var panel = document.getElementById('graph-panel');
  function select(n) {
    selected = n;
    if (!panel) return;
    if (!n) { panel.hidden = true; return; }
    var voisins = (adj[n.id] || []).map(function (id) { return index[id]; }).filter(Boolean);
    var html = '<button class="icon-btn close" data-action="close-panel" aria-label="Fermer">&times;</button>';
    html += '<p class="note" style="margin:0 0 .2rem">' + (LABELS[n.type] || n.type) + '</p>';
    html += '<h3>' + esc(n.label) + '</h3>';
    if (n.statut) html += '<p class="pill-row"><span class="badge st-' + n.statut + '">' + esc(statutLabel(n.statut)) + '</span></p>';
    if (n.desc) html += '<p style="color:var(--txt-2);margin:.4rem 0">' + esc(n.desc) + '</p>';
    if (n.url) html += '<p style="margin:.6rem 0 .4rem"><a href="' + n.url + '">Ouvrir la fiche &rarr;</a></p>';
    if (voisins.length) {
      html += '<h4 style="margin:.8rem 0 .35rem;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--txt-3)">' +
        voisins.length + ' relation' + (voisins.length > 1 ? 's' : '') + '</h4><div class="pill-row">';
      voisins.slice(0, 24).forEach(function (v) {
        html += '<button class="tag" data-goto="' + esc(v.id) + '">' + esc(v.label) + '</button>';
      });
      html += '</div>';
    }
    panel.innerHTML = html;
    panel.hidden = false;
  }
  function statutLabel(s) {
    return { base: 'Dans la base', decide: 'Décidé', engagement: 'Engagement', option: 'Option', 'non-verifie': 'Non vérifié' }[s] || s;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  if (panel) {
    panel.addEventListener('click', function (ev) {
      var g = ev.target.closest('[data-goto]');
      if (g) { var n = index[g.getAttribute('data-goto')]; if (n) { select(n); centre(n); } return; }
      if (ev.target.closest('[data-action="close-panel"]')) select(null);
    });
  }
  function centre(n) {
    view.k = Math.max(view.k, 1);
    view.x = -n.x * view.k; view.y = -n.y * view.k;
  }

  /* ---------- Barre de contrôle ---------- */
  document.querySelectorAll('.chip[data-graph-type]').forEach(function (c) {
    c.addEventListener('click', function () {
      var t = c.getAttribute('data-graph-type');
      if (hidden.has(t)) { hidden.delete(t); c.setAttribute('aria-pressed', 'true'); }
      else { hidden.add(t); c.setAttribute('aria-pressed', 'false'); }
      alpha = 0.7; settled = false; frames = 0;
    });
  });
  var reset = document.querySelector('[data-action="graph-reset"]');
  if (reset) reset.addEventListener('click', function () {
    select(null); fit();
  });
  var find = document.querySelector('[data-action="graph-search"]');
  if (find) find.addEventListener('input', function () {
    var q = find.value.toLowerCase().trim();
    if (!q) { select(null); return; }
    var hit = nodes.filter(visible).find(function (n) { return n.label.toLowerCase().indexOf(q) !== -1; });
    if (hit) { select(hit); centre(hit); }
  });
})();
