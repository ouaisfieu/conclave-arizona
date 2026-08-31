# Conclave Arizona

Tracker indépendant du **conclave budgétaire fédéral belge de l'automne 2026** et du **budget 2027**.

> Le conclave n'a pas encore eu lieu. Ce site sépare ce qui est déjà décidé, ce qui est seulement
> proposé, et ce qui circule sans source vérifiable. Chaque affirmation porte un statut ; chaque
> montant indique son périmètre.

**Informations arrêtées au 31 août 2026.**

## Ce que contient le site

| Section | Contenu |
| --- | --- |
| `/mesures/` | 70 fiches — statut, montant, périmètre, autorité, calendrier, sources, et ce qu'il faut vérifier |
| `/graphe/` | Graphe de connaissance navigable (145 nœuds), à la manière d'un vault Obsidian |
| `/chronologie/` | 44 étapes, de l'ouverture de la procédure pour déficit excessif (juillet 2024) à l'horizon OTAN 2035 |
| `/angles-morts/` | Les douze angles morts du dossier |
| `/acteurs/` | 41 acteurs : partis, ministres, institutions de contrôle, syndicats |
| `/methode/` | Les cinq statuts, les règles anti-double comptage, la fiche mesure standard |
| `/sources/` | 60 références classées par nature |

## Les cinq statuts

| Statut | Signification |
| --- | --- |
| **En vigueur / dans la base** | Droit existant ou décision déjà intégrée aux estimations à politique inchangée |
| **Décidé, exécution en cours** | Base légale ou accord existant, rendement effectif encore incertain |
| **Engagement politique** | Objectif annoncé sans ventilation suffisante |
| **Option chiffrée** | Simulation ou proposition — aucune décision |
| **Non vérifié / anachronique** | Source primaire absente, référence circulaire, ou événement postérieur à la date d'arrêté |

## Architecture technique

Site **statique pur** : HTML, CSS et JavaScript vanilla, zéro dépendance à l'exécution.
Le contenu vit dans `data/*.json` ; `tools/build.js` en dérive les pages HTML.

```
data/            # source de vérité (JSON)
  site.json          paramètres, statuts, scénarios, méthode
  mesures.json       les 70 fiches
  acteurs.json       partis, ministres, institutions, syndicats
  angles-morts.json  les 12 angles morts
  chronologie.json   la frise
  sources.json       la bibliographie
tools/
  build.js       générateur statique
  check.js       vérificateur (liens internes, JSON-LD, métadonnées uniques)
assets/
  css/style.css  feuille de style unique
  js/app.js      thème, menu, compte à rebours, filtres
  js/graph.js    simulation de forces sur canvas
```

### Régénérer le site

```bash
node tools/build.js     # écrit les pages HTML, sitemap.xml, robots.txt, feed.xml
node tools/check.js     # vérifie liens, JSON-LD, titres et descriptions uniques
python3 -m http.server 8000   # prévisualiser sur http://localhost:8000
```

Aucun `npm install` : le générateur n'utilise que la bibliothèque standard de Node (≥ 18).

### Mettre à jour après le conclave

1. Éditer `data/mesures.json` : faire passer les options retenues de `option` à `decide`,
   compléter `montant`, `calendrier`, `autorite` et `sources`.
2. Ajouter les événements dans `data/chronologie.json` et passer leur `statut` à `passe`.
3. Ajouter les nouvelles références dans `data/sources.json`.
4. Mettre à jour `arrete` dans `data/site.json`.
5. `node tools/build.js && node tools/check.js`, puis commit.

Le déploiement GitHub Pages régénère automatiquement le site à chaque push sur `main`.

## SEO et web sémantique

- Une page par entité, avec titre, description et URL canonique uniques (vérifié par `check.js`)
- JSON-LD : `WebSite`, `Dataset`, `Article`, `Organization`, `Person`, `ItemList`, `Event`,
  `DefinedTermSet`, `FAQPage`, `BreadcrumbList`
- `sitemap.xml`, `robots.txt`, flux Atom `feed.xml`
- HTML sémantique, landmarks ARIA, `<time datetime>`, listes de définitions pour les fiches
- Données brutes exposées en JSON et déclarées en `<link rel="alternate">`

## Design

Mode sombre par défaut, vert tendre (`#9fe8a8`) et lilas (`#c3b3f5`). Mode clair disponible
via le bouton d'en-tête, préférence mémorisée localement. Mobile first, sans requête réseau
externe : aucune police, aucun script et aucune image tierce.

## Licence

Textes et données : [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.fr).
Code : MIT (voir `LICENSE`).

Publication indépendante et anonyme. Recherche, structuration et développement : **Claude** (Anthropic),
à la demande de l'éditeur. Ce site n'émane d'aucun parti, administration ou institution.
