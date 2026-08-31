#!/usr/bin/env node
/**
 * Conclave Arizona — générateur statique.
 * Lit data/*.json et écrit des pages HTML autonomes à la racine du dépôt.
 * Aucune dépendance. Le site publié est du HTML/CSS/JS vanilla.
 *
 *   node tools/build.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const D = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));

const SITE = D('site.json');
const MES = D('mesures.json').mesures;
const MESMETA = D('mesures.json')._meta;
const ACT = D('acteurs.json').acteurs;
const ANG = D('angles-morts.json').angles;
const CHR = D('chronologie.json').evenements;
const SRC = D('sources.json').sources;

const srcById = Object.fromEntries(SRC.map((s) => [s.id, s]));
const mesById = Object.fromEntries(MES.map((m) => [m.id, m]));
const actById = Object.fromEntries(ACT.map((a) => [a.id, a]));
const angById = Object.fromEntries(ANG.map((a) => [a.id, a]));
const statutByKey = Object.fromEntries(SITE.statuts.map((s) => [s.cle, s]));

/* ------------------------------------------------------------------ utils */
const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const attr = esc;
const jsonld = (o) =>
  `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

function slugOf(id, strip) {
  let s = id;
  if (strip && s.startsWith(strip)) s = s.slice(strip.length);
  return s;
}
const mesureSlug = (id) => slugOf(id, 'mesure-');
const angleSlug = (id) => slugOf(id, 'angle-');

const mesureUrl = (id, depth) => rel(depth) + 'mesures/' + mesureSlug(id) + '/';
const acteurUrl = (id, depth) => rel(depth) + 'acteurs/' + (actById[id] ? actById[id].slug : id) + '/';
const angleUrl = (id, depth) => rel(depth) + 'angles-morts/' + angleSlug(id) + '/';
const rel = (depth) => (depth ? '../'.repeat(depth) : './');

function anyUrl(id, depth) {
  if (mesById[id]) return mesureUrl(id, depth);
  if (actById[id]) return acteurUrl(id, depth);
  if (angById[id]) return angleUrl(id, depth);
  return null;
}
function anyLabel(id) {
  if (mesById[id]) return mesById[id].titre;
  if (actById[id]) return actById[id].nom;
  if (angById[id]) return angById[id].titre;
  return id;
}

const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function dateFr(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MOIS[m - 1]} ${y}`;
}

/* ------------------------------------------------------------- composants */
function badge(statut) {
  const s = statutByKey[statut];
  return `<span class="badge st-${attr(statut)}">${esc(s ? s.label : statut)}</span>`;
}

function sourceList(ids, depth) {
  if (!ids || !ids.length) return '';
  const li = ids
    .map((id) => srcById[id])
    .filter(Boolean)
    .map(
      (s) =>
        `<li><span class="sid">${esc(s.id)}</span><a href="${attr(s.url)}" rel="noopener nofollow external">${esc(s.titre)}</a> — ${esc(s.auteur)}, ${esc(dateFr(s.date))}.${s.note ? ` <span class="note">${esc(s.note)}</span>` : ''}</li>`
    )
    .join('');
  return `<h2 id="sources">Sources</h2><ol class="src-list">${li}</ol>`;
}

function relations(ids, depth, titre) {
  const items = (ids || [])
    .map((id) => ({ id, url: anyUrl(id, depth), label: anyLabel(id) }))
    .filter((x) => x.url);
  if (!items.length) return '';
  return `<h2>${esc(titre)}</h2><div class="pill-row">${items
    .map((x) => `<a class="tag" href="${attr(x.url)}">${esc(x.label)}</a>`)
    .join('')}</div>`;
}

const NAV = [
  { href: '', label: 'Accueil' },
  { href: 'mesures/', label: 'Mesures' },
  { href: 'graphe/', label: 'Graphe' },
  { href: 'chronologie/', label: 'Chronologie' },
  { href: 'angles-morts/', label: 'Angles morts' },
  { href: 'acteurs/', label: 'Acteurs' },
  { href: 'methode/', label: 'Méthode' },
  { href: 'sources/', label: 'Sources' }
];

function head(o) {
  const canon = SITE.url.replace(/\/$/, '/') + (o.path || '');
  const title = o.title;
  const desc = o.desc;
  return `<!doctype html>
<html lang="fr" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${attr(desc)}">
<link rel="canonical" href="${attr(canon)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta name="author" content="${attr(SITE.editeur)}">
<meta name="theme-color" content="#0c110e" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f6f8f5" media="(prefers-color-scheme: light)">
<meta property="og:type" content="${o.ogtype || 'website'}">
<meta property="og:site_name" content="${attr(SITE.nom)}">
<meta property="og:locale" content="fr_BE">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:url" content="${attr(canon)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(title)}">
<meta name="twitter:description" content="${attr(desc)}">
<meta name="dcterms.modified" content="${attr(SITE.arrete)}">
<meta name="dcterms.language" content="fr-BE">
<meta name="dcterms.coverage" content="Belgique — pouvoir fédéral">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230c110e'/%3E%3Ccircle cx='12' cy='16' r='5' fill='%239fe8a8'/%3E%3Ccircle cx='21' cy='16' r='5' fill='%23c3b3f5' fill-opacity='.85'/%3E%3C/svg%3E">
<link rel="stylesheet" href="${attr(rel(o.depth))}assets/css/style.css">
<link rel="alternate" type="application/json" href="${attr(rel(o.depth))}data/mesures.json" title="Base des mesures (JSON)">
${o.ld ? o.ld.map(jsonld).join('\n') : ''}
</head>
<body>
<a class="skip" href="#main">Aller au contenu</a>
${header(o)}
<main id="main">`;
}

function header(o) {
  const base = rel(o.depth);
  const items = NAV.map((n) => {
    const cur = o.nav === n.href;
    return `<li><a href="${attr(base + n.href)}"${cur ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`;
  }).join('');
  return `<header class="site-head">
<div class="wrap head-row">
<a class="brand" href="${attr(base)}"><span class="dot" aria-hidden="true"></span><span>${esc(SITE.nom)}</span></a>
<button class="icon-btn" data-action="theme" type="button" aria-pressed="false" aria-label="Basculer le thème clair ou sombre" title="Thème clair / sombre"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="5.2"/><path d="M8 2.8v10.4" stroke-width="0"/><path d="M8 2.8a5.2 5.2 0 0 1 0 10.4z" fill="currentColor" stroke="none"/></svg></button>
<button class="icon-btn menu" data-action="menu" type="button" aria-expanded="false" aria-controls="nav" aria-label="Ouvrir le menu"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/></svg></button>
</div>
<nav id="nav" class="nav wrap" aria-label="Navigation principale"><ul>${items}</ul></nav>
</header>`;
}

function foot(depth) {
  const base = rel(depth);
  return `</main>
<footer class="site-foot">
<div class="wrap foot-grid">
  <div>
    <h2>À propos</h2>
    <p>Tracker indépendant du conclave budgétaire fédéral belge de l'automne 2026 et du budget 2027. Informations arrêtées au <time datetime="${attr(SITE.arrete)}">${esc(dateFr(SITE.arrete))}</time>.</p>
    <p class="note">Chaque affirmation porte un statut. Les montants proviennent de périmètres différents et ne sont pas additionnables sans contrôle.</p>
    <a class="usba" href="${attr(SITE.lien_usba)}" rel="noopener">↗ USBA — dl.ouaisfi.eu</a>
  </div>
  <div>
    <h2>Parcourir</h2>
    <ul>
      <li><a href="${attr(base)}mesures/">Base des mesures</a></li>
      <li><a href="${attr(base)}graphe/">Graphe de connaissance</a></li>
      <li><a href="${attr(base)}chronologie/">Chronologie</a></li>
      <li><a href="${attr(base)}angles-morts/">Douze angles morts</a></li>
      <li><a href="${attr(base)}acteurs/">Acteurs</a></li>
    </ul>
  </div>
  <div>
    <h2>Références</h2>
    <ul>
      <li><a href="${attr(base)}methode/">Méthode et statuts</a></li>
      <li><a href="${attr(base)}sources/">Bibliographie</a></li>
      <li><a href="${attr(base)}data/mesures.json">Données brutes (JSON)</a></li>
      <li><a href="${attr(SITE.repo)}" rel="noopener">Code source</a></li>
    </ul>
  </div>
</div>
<div class="wrap sign">
  <p>Publication indépendante et anonyme. Recherche, structuration et développement&nbsp;: <strong>Claude</strong> (Anthropic), à la demande de l'éditeur.<br>
  Textes sous licence CC&nbsp;BY&nbsp;4.0, code sous licence MIT. Ce site n'émane d'aucun parti, administration ou institution.</p>
</div>
</footer>
<script src="${attr(base)}assets/js/app.js" defer></script>
</body>
</html>`;
}

function write(rel_, html) {
  const p = path.join(ROOT, rel_);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html, 'utf8');
  pages.push(rel_);
}
const pages = [];

/* --------------------------------------------------------------- JSON-LD */
const ORG = {
  '@type': 'Organization',
  name: SITE.nom,
  url: SITE.url,
  description: SITE.baseline
};
function breadcrumb(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem', position: i + 1, name: t.name, item: t.url
    }))
  };
}

/* ================================================================ ACCUEIL */
function buildIndex() {
  const stats = {};
  MES.forEach((m) => (stats[m.statut] = (stats[m.statut] || 0) + 1));

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE.nom,
      alternateName: 'Conclave budgétaire fédéral belge 2027',
      url: SITE.url,
      inLanguage: 'fr-BE',
      description: SITE.description,
      publisher: ORG,
      about: [
        { '@type': 'Thing', name: 'Budget fédéral belge 2027' },
        { '@type': 'Thing', name: 'Conclave budgétaire' },
        { '@type': 'Thing', name: 'Procédure pour déficit excessif' },
        { '@type': 'Thing', name: 'Coalition Arizona' }
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'Base des mesures du conclave budgétaire fédéral belge 2027',
      description: MESMETA.avertissement,
      url: SITE.url + 'mesures/',
      license: 'https://creativecommons.org/licenses/by/4.0/',
      creator: ORG,
      temporalCoverage: '2024-07-01/2035-12-31',
      spatialCoverage: { '@type': 'Country', name: 'Belgique' },
      dateModified: SITE.arrete,
      keywords: ['budget fédéral', 'Belgique', 'conclave budgétaire', 'déficit', 'Arizona', 'budget 2027'],
      distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: SITE.url + 'data/mesures.json' }]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Le conclave budgétaire fédéral a-t-il déjà eu lieu ?', acceptedAnswer: { '@type': 'Answer', text: "Non. Au 31 août 2026, aucune mesure du conclave d'automne 2026 n'est arrêtée. Le conclave est annoncé pour la fin septembre, avec une échéance politique rapportée au 13 octobre et un dépôt légal du budget au plus tard le 15 octobre." } },
        { '@type': 'Question', name: 'Que représentent les 10 milliards d\u2019euros ?', acceptedAnswer: { '@type': 'Answer', text: "C'est une cible politique complémentaire adoptée le 10 juillet 2026 à l'horizon 2029. Ce n'est pas une coupe unique en 2027, et sa composition n'est pas décidée." } },
        { '@type': 'Question', name: 'Quelle est la différence entre 7,7 et 10 milliards ?', acceptedAnswer: { '@type': 'Answer', text: "7,7 milliards est l'écart cumulé calculé par BOSA entre la croissance projetée des dépenses nettes de l'Entité I et sa norme, en 2029. 10 milliards est la cible politique, plus élevée parce que le gouvernement veut limiter l'effet boule de neige des intérêts vers 2031." } }
      ]
    },
    breadcrumb([{ name: 'Accueil', url: SITE.url }])
  ];

  let h = head({
    title: SITE.titre,
    desc: SITE.description,
    path: '',
    depth: 0,
    nav: '',
    ld
  });

  h += `<div class="wrap">
<section class="hero">
  <p class="eyebrow">Suivi en cours — arrêté au ${esc(dateFr(SITE.arrete))}</p>
  <h1>Le conclave budgétaire fédéral belge n'a pas encore eu lieu</h1>
  <p class="lede">${esc(SITE.baseline)} Ce site sépare ce qui est déjà décidé, ce qui est seulement proposé, et ce qui circule sans source vérifiable. Chaque affirmation porte un statut ; chaque montant indique son périmètre.</p>

  <div class="countdown" data-countdown="${attr(SITE.conclave_date)}">
    <div class="cd-item"><div class="cd-num" data-cd="j">–</div><div class="cd-lab">jours</div></div>
    <div class="cd-item"><div class="cd-num" data-cd="h">–</div><div class="cd-lab">heures</div></div>
    <div class="cd-item"><div class="cd-num" data-cd="m">–</div><div class="cd-lab">minutes</div></div>
    <div class="cd-item"><div class="cd-num" data-cd="s">–</div><div class="cd-lab">secondes</div></div>
    <p class="cd-note">avant l'ouverture annoncée du conclave, le <time datetime="${attr(SITE.conclave_date)}">${esc(dateFr(SITE.conclave_date))}</time>. Date rapportée par la presse : aucune source officielle ne publie de date exacte. Échéance politique annoncée : ${esc(dateFr(SITE.echeance_politique))}. Dépôt légal à la Chambre : ${esc(dateFr(SITE.depot_legal))}.</p>
  </div>
</section>

<section aria-labelledby="chiffres">
  <h2 id="chiffres">Quatre chiffres, quatre périmètres</h2>
  <p class="sec-sub">Ils circulent ensemble et sont additionnés à tort. Ils ne mesurent pas la même chose.</p>
  <div class="kpis">
    ${SITE.chiffres_cles.map((k) => `<a class="kpi" href="${attr(mesureUrl(k.lien, 0))}"><div class="kpi-val">${esc(k.valeur)}</div><div class="kpi-lab">${esc(k.label)}</div></a>`).join('')}
  </div>
  <div class="table-wrap">
    <table>
      <caption class="note" style="text-align:left;padding:.6rem .85rem">Ce que chaque montant ne signifie pas.</caption>
      <thead><tr><th scope="col">Chiffre</th><th scope="col">Nature exacte</th><th scope="col">Piège</th></tr></thead>
      <tbody>${SITE.montants_a_ne_pas_confondre.map((m) => `<tr><td><strong>${esc(m.chiffre)}</strong></td><td>${esc(m.nature)}</td><td>${esc(m.piege)}</td></tr>`).join('')}</tbody>
    </table>
  </div>
</section>

<section aria-labelledby="statuts">
  <h2 id="statuts">Cinq statuts, ${MES.length} entrées</h2>
  <p class="sec-sub">La question n'est pas « combien ». Elle est « qui a décidé quoi, quand, avec quel rendement net et sous quelle marge d'erreur ».</p>
  <div class="grid two">
  ${SITE.statuts.map((s) => `<a class="card" href="${attr('mesures/?statut=' + s.cle)}">
    <div class="card-meta">${badge(s.cle)}<span class="count">${stats[s.cle] || 0} entrées</span></div>
    <p>${esc(s.definition)}</p></a>`).join('')}
  </div>
</section>

<section aria-labelledby="attention">
  <h2 id="attention">Ce que ce site corrige</h2>
  <div class="callout warn">
    <p class="callout-lbl">Compression du temps</p>
    <p>Une partie des documents de départ raconte l'automne 2026 comme déjà accompli : grèves nationales, arbitrage final du conclave, rapport administratif de septembre. Au ${esc(dateFr(SITE.arrete))}, rien de tout cela n'a eu lieu.</p>
  </div>
  <div class="callout warn">
    <p class="callout-lbl">Confusion d'accords</p>
    <p>La plupart des mesures présentées comme issues du conclave d'automne 2026 proviennent en réalité de l'accord du 24 novembre 2025 sur le budget 2026, ou de l'accord intermédiaire du 18 juillet 2026. Les compter comme un nouvel effort revient à les compter deux fois.</p>
  </div>
  <div class="callout ok">
    <p class="callout-lbl">Ce qui reste vrai</p>
    <p>La trajectoire se dégrade réellement : à politique inchangée, un déficit public de 5,1 à 5,5 % du PIB en 2027, une dette proche de 112 %, et des charges d'intérêts de l'Entité I passant de 12,5 Md€ en 2026 à 18,6 Md€ en 2029.</p>
  </div>
</section>

<section aria-labelledby="entrees">
  <h2 id="entrees">Entrer dans le dossier</h2>
  <div class="grid two">
    <a class="card" href="mesures/"><h3>Base des mesures</h3><p>${MES.length} fiches avec statut, montant, périmètre, autorité compétente, calendrier et sources. Filtrable par statut, niveau de pouvoir et thème.</p></a>
    <a class="card" href="graphe/"><h3>Graphe de connaissance</h3><p>Mesures, acteurs, institutions, thèmes et angles morts reliés entre eux. Navigation libre, à la manière d'un vault Obsidian.</p></a>
    <a class="card" href="chronologie/"><h3>Chronologie</h3><p>De l'ouverture de la procédure pour déficit excessif en juillet 2024 à l'horizon OTAN 2035, avec la ligne de partage entre le passé et le reste.</p></a>
    <a class="card" href="angles-morts/"><h3>Douze angles morts</h3><p>Défense après 2 %, répartition interfédérale, vieillissement, spending reviews, effets distributifs, refinancement, dépenses fiscales, fossiles, investissement, passifs contingents, gouvernance.</p></a>
    <a class="card" href="acteurs/"><h3>Acteurs et lignes de force</h3><p>Les cinq partis de la coalition, leurs vetos croisés, les institutions de contrôle et le front commun syndical.</p></a>
    <a class="card" href="methode/"><h3>Méthode et cadre de chiffrage</h3><p>Les cinq statuts, les règles anti-double comptage, la fiche mesure standard, les trois scénarios et les questions à poser le jour de l'accord.</p></a>
  </div>
</section>

<section aria-labelledby="scenarios">
  <h2 id="scenarios">Trois scénarios de négociation</h2>
  <p class="sec-sub">Ce ne sont pas des probabilités chiffrées. Le scénario central le plus plausible est un mélange de A et B, avec quelques éléments de C : la coalition comporte des vetos idéologiques croisés et la base contient déjà des mesures non réparties.</p>
  <div class="grid three">
  ${SITE.scenarios.map((s) => `<article class="card"><div class="card-meta"><span class="badge st-option">Scénario ${esc(s.id)}</span></div><h3>${esc(s.titre)}</h3><p>${esc(s.composition)}</p><p><strong style="color:var(--txt)">Risque dominant.</strong> ${esc(s.risque)}</p><p class="note"><strong>Signaux à surveiller :</strong> ${esc(s.signaux)}</p></article>`).join('')}
  </div>
</section>
</div>`;

  h += foot(0);
  write('index.html', h);
}

/* ============================================================== MESURES */
function buildMesures() {
  const themes = SITE.themes;
  const niveaux = SITE.niveaux;
  const usedThemes = new Set();
  MES.forEach((m) => (m.themes || []).forEach((t) => usedThemes.add(t)));

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Mesures et montants du conclave budgétaire fédéral belge 2027',
      numberOfItems: MES.length,
      itemListOrder: 'https://schema.org/ItemListUnordered',
      itemListElement: MES.map((m, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: m.titre,
        url: SITE.url + 'mesures/' + mesureSlug(m.id) + '/'
      }))
    },
    breadcrumb([
      { name: 'Accueil', url: SITE.url },
      { name: 'Mesures', url: SITE.url + 'mesures/' }
    ])
  ];

  let h = head({
    title: 'Base des mesures — Conclave Arizona',
    desc: `${MES.length} fiches sur le budget fédéral belge 2027 : mesures décidées, options en discussion, montants inscrits dans la base et affirmations non vérifiées. Statut, périmètre, autorité et sources pour chacune.`,
    path: 'mesures/',
    depth: 1,
    nav: 'mesures/',
    ld
  });

  h += `<div class="wrap">
<p class="crumbs"><a href="../">Accueil</a> › Mesures</p>
<section aria-labelledby="t">
<h2 id="t">Base des mesures</h2>
<p class="sec-sub">${esc(MESMETA.avertissement)} Chaque fiche indique ce qu'il faut vérifier avant d'utiliser le chiffre.</p>

<div class="filters">
  <label class="visually-hidden" for="q">Rechercher une mesure</label>
  <input id="q" type="search" data-filter="q" placeholder="Rechercher une mesure, un montant, un acteur…" autocomplete="off">
  <details>
    <summary>Filtrer par statut, niveau de pouvoir et thème</summary>
    <div class="fbody">
      <div class="chips" role="group" aria-label="Filtrer par statut">
        ${SITE.statuts.map((s) => `<button type="button" class="chip" data-filter-statut="${attr(s.cle)}" aria-pressed="false">${esc(s.label)}</button>`).join('')}
      </div>
      <div class="filter-row">
        <select data-filter="niveau" aria-label="Filtrer par niveau de pouvoir">
          <option value="">Tous les niveaux de pouvoir</option>
          ${Object.entries(niveaux).map(([k, v]) => `<option value="${attr(k)}">${esc(v)}</option>`).join('')}
        </select>
        <select data-filter="themes" aria-label="Filtrer par thème">
          <option value="">Tous les thèmes</option>
          ${Object.entries(themes).filter(([k]) => usedThemes.has(k)).map(([k, v]) => `<option value="${attr(k)}">${esc(v)}</option>`).join('')}
        </select>
      </div>
    </div>
  </details>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:.6rem">
    <span class="count" data-count>${MES.length} entrées</span>
    <button type="button" class="chip" data-action="reset">Réinitialiser</button>
  </div>
</div>

<div class="grid two" data-filterable>
${MES.map((m) => {
    const search = [m.titre, m.resume, m.verifier, m.montant && m.montant.texte, m.autorite, (m.porteurs || []).map((p) => (actById[p] ? actById[p].nom : p)).join(' ')].filter(Boolean).join(' ');
    return `<a class="card" data-item data-statut="${attr(m.statut)}" data-niveau="${attr(m.niveau)}" data-themes="${attr((m.themes || []).join(' '))}" data-search="${attr(search)}" href="${attr(mesureSlug(m.id))}/">
  <div class="card-meta">${badge(m.statut)}<span class="tag">${esc(niveaux[m.niveau] || m.niveau)}</span></div>
  <h3>${esc(m.titre)}</h3>
  ${m.montant && m.montant.texte ? `<p class="card-amount">${esc(m.montant.texte)}</p>` : ''}
  <p>${esc(m.resume.length > 190 ? m.resume.slice(0, 188) + '…' : m.resume)}</p>
</a>`;
  }).join('\n')}
</div>
<p class="empty" data-empty hidden>Aucune mesure ne correspond à ces filtres.</p>
</section>
</div>`;
  h += foot(1);
  write('mesures/index.html', h);

  /* Fiches individuelles */
  MES.forEach((m) => {
    const slug = mesureSlug(m.id);
    const porteurs = (m.porteurs || []).map((p) => actById[p]).filter(Boolean);
    const ldm = [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: m.titre,
        description: m.resume.slice(0, 300),
        inLanguage: 'fr-BE',
        datePublished: SITE.arrete,
        dateModified: SITE.arrete,
        author: ORG,
        publisher: ORG,
        isPartOf: { '@type': 'WebSite', name: SITE.nom, url: SITE.url },
        mainEntityOfPage: SITE.url + 'mesures/' + slug + '/',
        about: (m.themes || []).map((t) => ({ '@type': 'Thing', name: SITE.themes[t] || t })),
        mentions: porteurs.map((p) => ({ '@type': p.type === 'institution' ? 'Organization' : 'Thing', name: p.nom })),
        citation: (m.sources || []).map((s) => srcById[s]).filter(Boolean).map((s) => ({
          '@type': 'CreativeWork', name: s.titre, url: s.url, datePublished: s.date,
          author: { '@type': 'Organization', name: s.auteur }
        }))
      },
      breadcrumb([
        { name: 'Accueil', url: SITE.url },
        { name: 'Mesures', url: SITE.url + 'mesures/' },
        { name: m.titre, url: SITE.url + 'mesures/' + slug + '/' }
      ])
    ];

    let p = head({
      title: `${m.titre} — Conclave Arizona`,
      desc: `${statutByKey[m.statut].label}. ${m.resume.slice(0, 200)}`,
      path: 'mesures/' + slug + '/',
      depth: 2,
      nav: 'mesures/',
      ogtype: 'article',
      ld: ldm
    });

    p += `<div class="wrap">
<p class="crumbs"><a href="../../">Accueil</a> › <a href="../">Mesures</a> › ${esc(m.titre)}</p>
<article class="fiche-head" itemscope itemtype="https://schema.org/Article">
<div class="card-meta" style="margin-bottom:.7rem">${badge(m.statut)}<span class="tag">${esc(SITE.niveaux[m.niveau] || m.niveau)}</span>${(m.themes || []).map((t) => `<span class="tag">${esc(SITE.themes[t] || t)}</span>`).join('')}</div>
<h1 itemprop="headline">${esc(m.titre)}</h1>
<p class="lede" itemprop="description">${esc(m.resume)}</p>

<dl class="kv">
  <div><dt>Statut</dt><dd>${badge(m.statut)} <span class="note">${esc(statutByKey[m.statut].definition)}</span></dd></div>
  ${m.montant && m.montant.texte ? `<div><dt>Montant</dt><dd><strong>${esc(m.montant.texte)}</strong>${m.montant.nature ? `<br><span class="note">${esc(m.montant.nature)}</span>` : ''}</dd></div>` : ''}
  <div><dt>Niveau de pouvoir</dt><dd>${esc(SITE.niveaux[m.niveau] || m.niveau)}</dd></div>
  <div><dt>Autorité</dt><dd>${esc(m.autorite)}</dd></div>
  <div><dt>Calendrier</dt><dd>${esc(m.calendrier)}</dd></div>
  ${porteurs.length ? `<div><dt>Porté par</dt><dd>${porteurs.map((x) => `<a href="${attr(acteurUrl(x.id, 2))}">${esc(x.nom)}</a>`).join(', ')}</dd></div>` : ''}
</dl>

<div class="callout${m.statut === 'non-verifie' ? ' warn' : ''}">
  <p class="callout-lbl">À vérifier avant d'utiliser ce chiffre</p>
  <p>${esc(m.verifier)}</p>
</div>

${relations(m.liens, 2, 'Relations')}
${sourceList(m.sources, 2)}
<hr>
<p class="note">Fiche arrêtée au ${esc(dateFr(SITE.arrete))}. Elle sera requalifiée si le conclave la transforme en décision. Voir la <a href="../../methode/">méthode</a> pour la définition des statuts.</p>
</article>
</div>`;
    p += foot(2);
    write('mesures/' + slug + '/index.html', p);
  });
}

/* ============================================================== ACTEURS */
function buildActeurs() {
  const groupes = [
    { cle: 'parti', titre: 'Les cinq partis de la coalition Arizona', sub: 'Lignes publiques et vetos probables. Dans un conclave, les partis négocient simultanément les montants, le calendrier et les compensations.' },
    { cle: 'ministre', titre: 'Personnes autour de la table', sub: 'Ministres, vice-Premiers et présidents de parti dont les positions publiques sont documentées.' },
    { cle: 'institution', titre: 'Institutions et organes de contrôle', sub: 'Ceux qui produisent les chiffres et ceux qui les vérifient.' },
    { cle: 'syndicat', titre: 'Front commun syndical', sub: 'Le contre-récit et son plan alternatif.' },
    { cle: 'societe-civile', titre: 'Corps intermédiaires exposés', sub: 'Ceux qui reçoivent la charge déplacée.' },
    { cle: 'opposition', titre: 'Opposition parlementaire', sub: '' }
  ];

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Acteurs du conclave budgétaire fédéral belge 2027',
      numberOfItems: ACT.length,
      itemListElement: ACT.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.nom, url: SITE.url + 'acteurs/' + a.slug + '/' }))
    },
    breadcrumb([{ name: 'Accueil', url: SITE.url }, { name: 'Acteurs', url: SITE.url + 'acteurs/' }])
  ];

  let h = head({
    title: 'Acteurs et lignes de force — Conclave Arizona',
    desc: 'Les cinq partis de la coalition Arizona, leurs lignes rouges croisées, les ministres concernés, les institutions de contrôle et le front commun syndical face au budget fédéral belge 2027.',
    path: 'acteurs/', depth: 1, nav: 'acteurs/', ld
  });

  h += `<div class="wrap">
<p class="crumbs"><a href="../">Accueil</a> › Acteurs</p>
<section><h2>Acteurs et lignes de force</h2>
<p class="sec-sub">Les positions ci-dessous sont des lignes publiques, pas des engagements finaux.</p>`;

  groupes.forEach((g) => {
    const membres = ACT.filter((a) => a.type === g.cle);
    if (!membres.length) return;
    h += `<h2 style="margin-top:2rem">${esc(g.titre)}</h2>${g.sub ? `<p class="sec-sub">${esc(g.sub)}</p>` : ''}<div class="grid two">`;
    h += membres.map((a) => `<a class="card" href="${attr(a.slug)}/">
      <h3>${esc(a.nom)}</h3>
      ${a.fonction ? `<p class="note">${esc(a.fonction)}</p>` : ''}
      <p>${esc((a.ligne || a.role || '').slice(0, 190))}${(a.ligne || a.role || '').length > 190 ? '…' : ''}</p>
    </a>`).join('');
    h += `</div>`;
  });

  h += `</section></div>`;
  h += foot(1);
  write('acteurs/index.html', h);

  ACT.forEach((a) => {
    const mesuresLiees = MES.filter((m) => (m.porteurs || []).includes(a.id));
    const type = a.type === 'institution' || a.type === 'syndicat' || a.type === 'societe-civile' ? 'Organization' : a.type === 'ministre' ? 'Person' : 'Organization';
    const ldp = [
      {
        '@context': 'https://schema.org',
        '@type': type,
        name: a.nom,
        description: a.role,
        ...(a.fonction ? { jobTitle: a.fonction } : {}),
        ...(type === 'Person' && a.parti && actById[a.parti] ? { memberOf: { '@type': 'Organization', name: actById[a.parti].nom } } : {}),
        url: SITE.url + 'acteurs/' + a.slug + '/'
      },
      breadcrumb([
        { name: 'Accueil', url: SITE.url },
        { name: 'Acteurs', url: SITE.url + 'acteurs/' },
        { name: a.nom, url: SITE.url + 'acteurs/' + a.slug + '/' }
      ])
    ];

    let p = head({
      title: `${a.nom} — Conclave Arizona`,
      desc: `${a.fonction ? a.fonction + '. ' : ''}${(a.ligne || a.role).slice(0, 220)}`,
      path: 'acteurs/' + a.slug + '/', depth: 2, nav: 'acteurs/', ogtype: 'profile', ld: ldp
    });

    p += `<div class="wrap">
<p class="crumbs"><a href="../../">Accueil</a> › <a href="../">Acteurs</a> › ${esc(a.nom)}</p>
<article class="fiche-head">
<h1>${esc(a.nom)}</h1>
${a.fonction ? `<p class="lede">${esc(a.fonction)}</p>` : ''}
<dl class="kv">
  ${a.parti && actById[a.parti] ? `<div><dt>Parti</dt><dd><a href="${attr(acteurUrl(a.parti, 2))}">${esc(actById[a.parti].nom)}</a></dd></div>` : ''}
  <div><dt>Rôle dans le dossier</dt><dd>${esc(a.role)}</dd></div>
  ${a.ligne ? `<div><dt>Ligne publique</dt><dd>${esc(a.ligne)}</dd></div>` : ''}
  ${a.ligne_rouge ? `<div><dt>Ligne rouge / friction</dt><dd>${esc(a.ligne_rouge)}</dd></div>` : ''}
</dl>
${mesuresLiees.length ? `<h2>Mesures et positions rattachées</h2><div class="grid two">${mesuresLiees.map((m) => `<a class="card" href="${attr(mesureUrl(m.id, 2))}"><div class="card-meta">${badge(m.statut)}</div><h3>${esc(m.titre)}</h3></a>`).join('')}</div>` : ''}
${relations(a.liens, 2, 'Relations')}
${sourceList(a.sources, 2)}
</article>
</div>`;
    p += foot(2);
    write('acteurs/' + a.slug + '/index.html', p);
  });
}

/* ========================================================== ANGLES MORTS */
function buildAngles() {
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'ItemList',
      name: 'Douze angles morts du dossier budgétaire belge 2027',
      numberOfItems: ANG.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: ANG.map((a) => ({ '@type': 'ListItem', position: a.num, name: a.titre, url: SITE.url + 'angles-morts/' + angleSlug(a.id) + '/' }))
    },
    breadcrumb([{ name: 'Accueil', url: SITE.url }, { name: 'Angles morts', url: SITE.url + 'angles-morts/' }])
  ];
  let h = head({
    title: 'Douze angles morts — Conclave Arizona',
    desc: "Défense après 2 %, répartition interfédérale, vieillissement, spending reviews, effets distributifs et de genre, activation, refinancement, dépenses fiscales, fossiles, investissement, passifs contingents et gouvernance : ce que le dossier budgétaire belge 2027 ne traite pas.",
    path: 'angles-morts/', depth: 1, nav: 'angles-morts/', ld
  });
  h += `<div class="wrap">
<p class="crumbs"><a href="../">Accueil</a> › Angles morts</p>
<section><h2>Douze angles morts</h2>
<p class="sec-sub">Le principal défaut du dossier n'est pas un chiffre manquant : c'est l'absence d'une architecture de décision capable de dire qui supporte l'effort, à quel niveau de pouvoir, à quelle date, avec quel rendement net et sous quelle marge d'erreur.</p>
<div class="grid two">
${ANG.map((a) => `<a class="card" href="${attr(angleSlug(a.id))}/">
  <div class="card-meta"><span class="badge st-engagement">Angle ${a.num}</span></div>
  <h3>${esc(a.titre)}</h3>
  <p>${esc(a.resume.slice(0, 200))}…</p></a>`).join('')}
</div></section></div>`;
  h += foot(1);
  write('angles-morts/index.html', h);

  ANG.forEach((a) => {
    const slug = angleSlug(a.id);
    const ldp = [
      {
        '@context': 'https://schema.org', '@type': 'Article',
        headline: a.titre, description: a.resume.slice(0, 300),
        inLanguage: 'fr-BE', datePublished: SITE.arrete, author: ORG, publisher: ORG,
        mainEntityOfPage: SITE.url + 'angles-morts/' + slug + '/',
        citation: (a.sources || []).map((s) => srcById[s]).filter(Boolean).map((s) => ({ '@type': 'CreativeWork', name: s.titre, url: s.url, datePublished: s.date }))
      },
      breadcrumb([
        { name: 'Accueil', url: SITE.url },
        { name: 'Angles morts', url: SITE.url + 'angles-morts/' },
        { name: a.titre, url: SITE.url + 'angles-morts/' + slug + '/' }
      ])
    ];
    let p = head({
      title: `${a.titre} — Angle mort ${a.num} — Conclave Arizona`,
      desc: a.resume.slice(0, 230),
      path: 'angles-morts/' + slug + '/', depth: 2, nav: 'angles-morts/', ogtype: 'article', ld: ldp
    });
    p += `<div class="wrap">
<p class="crumbs"><a href="../../">Accueil</a> › <a href="../">Angles morts</a> › ${esc(a.titre)}</p>
<article class="fiche-head">
<div class="card-meta" style="margin-bottom:.7rem"><span class="badge st-engagement">Angle mort ${a.num}</span>${(a.themes || []).map((t) => `<span class="tag">${esc(SITE.themes[t] || t)}</span>`).join('')}</div>
<h1>${esc(a.titre)}</h1>
<p class="lede">${esc(a.resume)}</p>
<h2>Pourquoi c'est un angle mort</h2>
<p>${esc(a.enjeu)}</p>
<div class="callout ok"><p class="callout-lbl">Recommandation</p><p>${esc(a.recommandation)}</p></div>
${relations(a.liens, 2, 'Mesures et acteurs concernés')}
${sourceList(a.sources, 2)}
</article></div>`;
    p += foot(2);
    write('angles-morts/' + slug + '/index.html', p);
  });
}

/* ========================================================== CHRONOLOGIE */
function buildChrono() {
  const sorted = CHR.slice().sort((a, b) => a.date.localeCompare(b.date));
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'ItemList',
      name: 'Chronologie du cycle budgétaire fédéral belge 2024-2035',
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      numberOfItems: sorted.length,
      itemListElement: sorted.map((e, i) => ({
        '@type': 'ListItem', position: i + 1,
        item: { '@type': 'Event', name: e.titre, startDate: e.date, description: e.texte, eventStatus: 'https://schema.org/EventScheduled', location: { '@type': 'Country', name: 'Belgique' } }
      }))
    },
    breadcrumb([{ name: 'Accueil', url: SITE.url }, { name: 'Chronologie', url: SITE.url + 'chronologie/' }])
  ];
  let h = head({
    title: 'Chronologie du cycle budgétaire — Conclave Arizona',
    desc: "De l'ouverture de la procédure pour déficit excessif en juillet 2024 à l'horizon OTAN 2035 : chaque étape du budget fédéral belge, avec la ligne de partage entre ce qui a eu lieu et ce qui reste à venir.",
    path: 'chronologie/', depth: 1, nav: 'chronologie/', ld
  });
  h += `<div class="wrap">
<p class="crumbs"><a href="../">Accueil</a> › Chronologie</p>
<section><h2>Chronologie</h2>
<p class="sec-sub">Le conclave est la phase politique d'une procédure administrative déjà entamée. Une décision de conclave n'est pas encore une loi : après l'accord viennent les documents budgétaires, les observations de la Cour des comptes, le vote, puis les lois-programmes et arrêtés d'exécution.</p>
<div class="timeline">
${sorted.map((e) => `<article class="tl-item ${attr(e.statut)}">
  <p class="tl-date"><time datetime="${attr(e.date)}">${esc(dateFr(e.date))}</time>${e.statut === 'probable' ? ' · <span style="color:var(--txt-3)">date rapportée, non officielle</span>' : ''}${e.statut === 'avenir' ? ' · <span style="color:var(--txt-3)">à venir</span>' : ''}</p>
  <h3>${esc(e.titre)}</h3>
  <p>${esc(e.texte)}</p>
  ${(e.sources || []).length ? `<p class="pill-row">${e.sources.map((s) => srcById[s] ? `<a class="tag" href="${attr(srcById[s].url)}" rel="noopener nofollow external" title="${attr(srcById[s].titre)}">${esc(s)}</a>` : '').join('')}</p>` : ''}
</article>`).join('')}
</div>
<div class="callout warn"><p class="callout-lbl">Le calendrier légal n'est pas une garantie</p><p>Le précédent 2025-2026 justifie la prudence : les documents budgétaires 2026 ont été déposés le 28 janvier 2026, bien après l'échéance statutaire du 15 octobre, et l'État a fonctionné avec des douzièmes provisoires. Le budget n'a été voté que le 19 mars 2026.</p></div>
</section></div>`;
  h += foot(1);
  write('chronologie/index.html', h);
}

/* =============================================================== GRAPHE */
function buildGraphe() {
  const nodes = [];
  const links = [];
  const seen = new Set();
  const add = (n) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };

  MES.forEach((m) => add({ id: m.id, label: m.titre, type: 'mesure', statut: m.statut, url: '../mesures/' + mesureSlug(m.id) + '/', desc: m.resume.slice(0, 180) }));
  ACT.forEach((a) => add({
    id: a.id, label: a.nom,
    type: (a.type === 'institution' || a.type === 'syndicat' || a.type === 'societe-civile') ? 'institution' : 'acteur',
    url: '../acteurs/' + a.slug + '/', desc: (a.ligne || a.role || '').slice(0, 180)
  }));
  ANG.forEach((a) => add({ id: a.id, label: a.titre, type: 'angle', url: '../angles-morts/' + angleSlug(a.id) + '/', desc: a.resume.slice(0, 180) }));
  Object.entries(SITE.themes).forEach(([k, v]) => add({ id: 'theme:' + k, label: v, type: 'theme', url: '../mesures/?themes=' + k, desc: 'Thème transversal.' }));

  const link = (s, t) => { if (seen.has(s) && seen.has(t) && s !== t) links.push({ s, t }); };
  MES.forEach((m) => {
    (m.porteurs || []).forEach((p) => link(m.id, p));
    (m.liens || []).forEach((l) => link(m.id, l));
    (m.themes || []).forEach((t) => link(m.id, 'theme:' + t));
  });
  ACT.forEach((a) => (a.liens || []).forEach((l) => link(a.id, l)));
  ANG.forEach((a) => {
    (a.liens || []).forEach((l) => link(a.id, l));
    (a.themes || []).forEach((t) => link(a.id, 'theme:' + t));
  });

  /* Déduplication des arêtes */
  const uniq = new Map();
  links.forEach((l) => {
    const k = [l.s, l.t].sort().join('|');
    if (!uniq.has(k)) uniq.set(k, l);
  });
  const payload = { nodes, links: Array.from(uniq.values()) };

  const ld = [breadcrumb([{ name: 'Accueil', url: SITE.url }, { name: 'Graphe', url: SITE.url + 'graphe/' }])];
  let h = head({
    title: 'Graphe de connaissance — Conclave Arizona',
    desc: `Graphe navigable reliant ${nodes.length} nœuds — mesures, acteurs, institutions, thèmes et angles morts — du dossier budgétaire fédéral belge 2027.`,
    path: 'graphe/', depth: 1, nav: 'graphe/', ld
  });
  h += `<div class="wrap">
<p class="crumbs"><a href="../">Accueil</a> › Graphe</p>
<section><h2>Graphe de connaissance</h2>
<p class="sec-sub">${nodes.length} nœuds, ${payload.links.length} relations. Faites glisser pour déplacer, molette ou pincement pour zoomer, touchez un nœud pour ouvrir sa fiche. La taille d'un nœud reflète son nombre de relations.</p>

<div class="graph-shell">
  <div class="graph-bar">
    <input type="search" data-action="graph-search" placeholder="Chercher un nœud…" aria-label="Chercher un nœud dans le graphe" style="flex:1 1 12rem;min-width:9rem;padding:.42rem .6rem;font:inherit;font-size:.85rem;background:var(--bg-2);color:var(--txt);border:1px solid var(--line);border-radius:9px">
    <button type="button" class="chip" data-graph-type="mesure" aria-pressed="true">Mesures</button>
    <button type="button" class="chip" data-graph-type="acteur" aria-pressed="true">Acteurs</button>
    <button type="button" class="chip" data-graph-type="institution" aria-pressed="true">Institutions</button>
    <button type="button" class="chip" data-graph-type="theme" aria-pressed="true">Thèmes</button>
    <button type="button" class="chip" data-graph-type="angle" aria-pressed="true">Angles morts</button>
    <button type="button" class="chip" data-action="graph-reset">Recentrer</button>
  </div>
  <canvas id="graph" role="img" aria-label="Graphe des relations entre mesures, acteurs, institutions, thèmes et angles morts du budget fédéral belge 2027"></canvas>
  <aside id="graph-panel" class="graph-panel" hidden aria-live="polite"></aside>
  <noscript><div style="padding:1.2rem"><p>Le graphe nécessite JavaScript. Sans lui, les mêmes relations restent lisibles depuis chaque fiche : la <a href="../mesures/">base des mesures</a>, les <a href="../acteurs/">acteurs</a> et les <a href="../angles-morts/">angles morts</a> listent tous leurs liens en bas de page.</p></div></noscript>
</div>
<p class="legend">
  <span><i style="background:#9fe8a8"></i> Mesures</span>
  <span><i style="background:#c3b3f5"></i> Partis et personnes</span>
  <span><i style="background:#8fb4ff"></i> Institutions et syndicats</span>
  <span><i style="background:#ffd28f"></i> Thèmes</span>
  <span><i style="background:#ff9f9f"></i> Angles morts</span>
</p>
<p class="note">Le graphe est une aide à la navigation, pas une preuve. Une relation signale que deux entrées se référencent dans le dossier ; elle ne dit rien de la validité d'un chiffre. La liste complète reste accessible dans la <a href="../mesures/">base des mesures</a>.</p>
</section>
</div>
<script>window.__GRAPH__=${JSON.stringify(payload).replace(/</g, '\\u003c')};</script>
<script src="../assets/js/graph.js" defer></script>`;
  h += foot(1);
  write('graphe/index.html', h);
}

/* =============================================================== MÉTHODE */
function buildMethode() {
  const ld = [
    {
      '@context': 'https://schema.org', '@type': 'DefinedTermSet',
      name: 'Statuts probatoires du dossier budgétaire',
      hasDefinedTerm: SITE.statuts.map((s) => ({ '@type': 'DefinedTerm', name: s.label, description: s.definition }))
    },
    breadcrumb([{ name: 'Accueil', url: SITE.url }, { name: 'Méthode', url: SITE.url + 'methode/' }])
  ];
  let h = head({
    title: 'Méthode, statuts et cadre de chiffrage — Conclave Arizona',
    desc: "Les cinq statuts probatoires, les huit règles anti-double comptage, la fiche mesure standard en douze champs et les questions à poser le jour de l'accord budgétaire.",
    path: 'methode/', depth: 1, nav: 'methode/', ld
  });
  h += `<div class="wrap">
<p class="crumbs"><a href="../">Accueil</a> › Méthode</p>

<section><h2>Méthode</h2>
<p class="sec-sub">Ce site ne prend pas position sur le dosage entre recettes et dépenses. Il porte sur la qualité du chiffrage, qui ne devrait pas être partisane : même un accord dur échoue s'il repose sur des rendements non exécutables, et même un accord socialement compensé échoue si les compensations ne sont ni financées ni utilisées.</p>

<h3>Périmètre et date d'arrêté</h3>
<p>Informations arrêtées au <time datetime="${attr(SITE.arrete)}">${esc(dateFr(SITE.arrete))}</time>. Périmètre principal : gouvernement fédéral, budget initial 2027 et trajectoire 2027-2029. Les Régions, Communautés et pouvoirs locaux sont traités lorsqu'ils modifient le cadrage fédéral, la trajectoire européenne ou les effets concrets des décisions.</p>
<p>Priorité aux documents du SPF BOSA et du Comité de monitoring, du Bureau fédéral du Plan, de la Banque nationale, de la Commission et du Conseil de l'Union européenne, de la Cour des comptes et de la Chambre. Les sources partisanes servent uniquement à qualifier les positions des partis. Les informations de presse sont classées comme propositions ou ballons d'essai tant qu'elles ne figurent pas dans un accord ou un document officiel.</p>
</section>

<section><h2>Les cinq statuts</h2>
<p class="sec-sub">Sans ces statuts, une option de 4,7 Md€ peut être lue comme une recette acquise, une hausse fiscale déjà décidée peut être recomptée comme nouvel effort, et un objectif 2029 peut être présenté comme un effet 2027.</p>
<div class="grid two">
${SITE.statuts.map((s) => `<article class="card"><div class="card-meta">${badge(s.cle)}</div><p>${esc(s.definition)}</p></article>`).join('')}
</div>
</section>

<section><h2>Huit règles anti-double comptage</h2>
<ol class="numbered">${SITE.regles_anti_double_comptage.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>
<div class="callout"><p class="callout-lbl">Réserve de prudence</p><p>Les mesures dépendant fortement du comportement, du contrôle, d'un accord interfédéral ou d'une mise en œuvre informatique ne devraient pas être comptées à 100 % dans le scénario central. Plutôt qu'un abattement arbitraire identique, le budget doit utiliser une fourchette documentée. Exemple de lecture : si 4 Md€ de rendement reposent sur des mesures incertaines et qu'un stress test retient un manque à gagner de 25 %, le risque budgétaire est de 1 Md€.</p></div>
</section>

<section><h2>La fiche mesure standard</h2>
<p class="sec-sub">Un accord de 10 milliards ne sera crédible que si chaque mesure dispose d'une fiche standardisée. C'est le format que ce site applique, dans la limite des informations publiques.</p>
<div class="table-wrap"><table>
<thead><tr><th scope="col">Champ</th><th scope="col">Contenu minimal</th></tr></thead>
<tbody>${SITE.fiche_mesure_champs.map((c) => `<tr><td><strong>${esc(c.champ)}</strong></td><td>${esc(c.contenu)}</td></tr>`).join('')}</tbody>
</table></div>
</section>

<section><h2>Questions à poser le jour de l'accord</h2>
<ol class="numbered">${SITE.questions_negociateurs.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
</section>

<section><h2>Limites assumées</h2>
<ul class="plain">
  <li>La date d'arrêté précède le conclave : les décisions postérieures devront être requalifiées et intégrées.</li>
  <li>Les montants en points de PIB convertis en euros sont des ordres de grandeur statiques, signalés comme tels.</li>
  <li>Ce site n'effectue pas de microsimulation indépendante : le paquet final et ses paramètres ne sont pas connus.</li>
  <li>Les passifs contingents ne sont pas totalisés, faute d'un état consolidé actuel et homogène.</li>
  <li>Certaines dates du conclave proviennent d'informations de presse attribuées au cabinet du Premier ministre, et non d'une publication officielle.</li>
</ul>
</section>
</div>`;
  h += foot(1);
  write('methode/index.html', h);
}

/* =============================================================== SOURCES */
function buildSources() {
  const types = { officiel: 'Sources officielles', institution: 'Institutions et organes de contrôle', presse: 'Presse', partisan: 'Sources partisanes', syndical: 'Sources syndicales', academique: 'Travaux académiques' };
  const ld = [breadcrumb([{ name: 'Accueil', url: SITE.url }, { name: 'Sources', url: SITE.url + 'sources/' }])];
  let h = head({
    title: 'Bibliographie — Conclave Arizona',
    desc: `${SRC.length} sources classées par nature : documents officiels, institutions de contrôle, presse et positions partisanes, pour le dossier budgétaire fédéral belge 2027.`,
    path: 'sources/', depth: 1, nav: 'sources/', ld
  });
  h += `<div class="wrap">
<p class="crumbs"><a href="../">Accueil</a> › Sources</p>
<section><h2>Bibliographie</h2>
<p class="sec-sub">${SRC.length} références. Les liens sortent vers les documents d'origine. Une source partisane qualifie une position ; elle n'établit pas un fait budgétaire.</p>
<div class="filters">
  <label class="visually-hidden" for="qs">Rechercher une source</label>
  <input id="qs" type="search" data-filter="q" placeholder="Rechercher une source, un auteur…" autocomplete="off">
  <div class="filter-row">
    <select data-filter="type" aria-label="Filtrer par nature de source">
      <option value="">Toutes les natures</option>
      ${Object.entries(types).map(([k, v]) => `<option value="${attr(k)}">${esc(v)}</option>`).join('')}
    </select>
    <button type="button" class="chip" data-action="reset">Réinitialiser</button>
  </div>
  <span class="count" data-count>${SRC.length} entrées</span>
</div>
<div class="grid two" data-filterable>
${SRC.map((s) => `<article class="card" data-item data-type="${attr(s.type)}" data-statut="" data-search="${attr(s.titre + ' ' + s.auteur + ' ' + (s.note || ''))}">
  <div class="card-meta"><span class="tag">${esc(s.id)}</span><span class="tag">${esc(types[s.type] || s.type)}</span><span class="count"><time datetime="${attr(s.date)}">${esc(dateFr(s.date))}</time></span></div>
  <h3><a href="${attr(s.url)}" rel="noopener nofollow external">${esc(s.titre)}</a></h3>
  <p>${esc(s.auteur)}</p>
  ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
</article>`).join('')}
</div>
<p class="empty" data-empty hidden>Aucune source ne correspond à ces filtres.</p>
</section></div>`;
  h += foot(1);
  write('sources/index.html', h);
}

/* ================================================================== 404 */
function build404() {
  let h = head({ title: 'Page introuvable — Conclave Arizona', desc: "Page introuvable sur le tracker du conclave budgétaire fédéral belge 2027. Reprenez la navigation par la base des mesures, le graphe de connaissance ou la chronologie du budget 2027." , path: '404.html', depth: 0, nav: '' });
  h += `<div class="wrap"><section class="hero">
<p class="eyebrow">Erreur 404</p>
<h1>Cette page n'existe pas</h1>
<p class="lede">Le dossier a peut-être été réorganisé. Reprenez par la <a href="./mesures/">base des mesures</a>, le <a href="./graphe/">graphe</a> ou la <a href="./chronologie/">chronologie</a>.</p>
</section></div>`;
  h += foot(0);
  write('404.html', h);
}

/* =========================================================== SITEMAP etc */
function buildMeta() {
  const urls = pages
    .filter((p) => p.endsWith('index.html'))
    .map((p) => SITE.url + p.replace(/index\.html$/, ''));
  const prio = (u) => (u === SITE.url ? '1.0' : u.split('/').length <= 5 ? '0.8' : '0.6');
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemap.org/schemas/sitemap/0.9">\n`.replace('www.sitemap.org', 'www.sitemaps.org') +
    urls.map((u) => `  <url><loc>${u}</loc><lastmod>${SITE.arrete}</lastmod><changefreq>weekly</changefreq><priority>${prio(u)}</priority></url>`).join('\n') +
    `\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml);

  fs.writeFileSync(
    path.join(ROOT, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}sitemap.xml\n`
  );
  fs.writeFileSync(path.join(ROOT, '.nojekyll'), '');

  const feedItems = CHR.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  const atom = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="fr">
  <title>${esc(SITE.nom)}</title>
  <subtitle>${esc(SITE.baseline)}</subtitle>
  <link href="${SITE.url}feed.xml" rel="self"/>
  <link href="${SITE.url}"/>
  <updated>${SITE.arrete}T00:00:00Z</updated>
  <id>${SITE.url}</id>
${feedItems.map((e) => `  <entry>
    <title>${esc(e.titre)}</title>
    <link href="${SITE.url}chronologie/#${esc(e.date)}"/>
    <id>${SITE.url}chronologie/${esc(e.date)}</id>
    <updated>${e.date}T00:00:00Z</updated>
    <summary>${esc(e.texte)}</summary>
  </entry>`).join('\n')}
</feed>
`;
  fs.writeFileSync(path.join(ROOT, 'feed.xml'), atom);
  console.log('sitemap.xml, robots.txt, feed.xml, .nojekyll écrits');
}

/* ================================================================= RUN */
buildIndex();
buildMesures();
buildActeurs();
buildAngles();
buildChrono();
buildGraphe();
buildMethode();
buildSources();
build404();
buildMeta();
console.log(pages.length + ' pages HTML générées.');
