# Découvrabilité par les assistants IA (ChatGPT, Claude, Perplexity, Gemini…)

Objectif : un site praticien lisible, citable et utilisable par les moteurs de réponse et les agents IA, sans
toucher au SEO Google, à la performance mobile ni au ton déontologique. Tout est généré au build, à partir des
mêmes données que les pages HTML : identique quel que soit le modèle de présentation (`npm run controle:seo`
compare aussi llms-full.txt et les fichiers `.md`).

## Grille de critères (relevé d'octobre 2026)

Outils : AR = agent-ready.dev (spec Vercel Agent Readability + llmstxt.org), IAR = isitagentready.com
(Cloudflare), IX = IndexedAI, APF = Apify Agent Readiness Audit, FR = frase.io, SS = SiteSpeak,
LS = llmstxt.studio, AM = agentmarkup.dev, AX = ainative.studio, ARW = agentready.website.

| Critère | Outils | Mise en œuvre | Contrôle |
|---|---|---|---|
| robots.txt valide, pages ouvertes | tous | `pages/robots.txt.ts` | R1 |
| Robots IA nommés et autorisés (OAI-SearchBot, ChatGPT-User, Claude-*, Perplexity*, Bingbot…) | AR, APF, FR, LS, AM, AX, ARW | liste `ROBOTS_AGENTS` (core/agents.ts) | R2, R3 |
| Content Signals (`search`, `ai-input`, `ai-train`) | IAR (niveau 2), AM | `SIGNAUX_CONTENU` (core/agents.ts) | R4 |
| `Sitemap:` dans robots.txt, llms.txt non bloqué | LS, APF, AR | robots.txt | R5 |
| sitemap.xml complet avec `lastmod` | AR, IAR, LS… | `sitemap.xml.ts` (date de la fiche : `majLe`) | S1 |
| llms.txt au format llmstxt.org (H1, citation, H2, `- [titre](url): note`) | AR, LS, IX, APF… | `llms.txt.ts` | L1, L2 |
| llms-full.txt | AR, LS | `llms-full.txt.ts` | L3 |
| Version Markdown par page, en-tête YAML, section Sitemap | AR, AM, AX | `[...page].md.ts`, `lib/agents.ts` | M1, M2 |
| `<link rel="alternate" type="text/markdown">`, `rel="describedby"` vers llms.txt | AR, spec Vercel | `Gabarit.astro` | M3 |
| sitemap.md, AGENTS.md | AR | `sitemap.md.ts`, `AGENTS.md.ts` | M4 |
| En-têtes : type MIME, `noindex` + `Link: canonical` sur les .md, en-tête `Link` | AR, IAR, FR, ARW | `public/_headers` + `astro.config.mjs` (règles .md au build) | H1 |
| Négociation `Accept: text/markdown` | AR, IAR (niveau 3), FR, AX | `functions/_middleware.js` + `public/_routes.json` | H2 |
| JSON-LD valide et relié (`@id`) | tous | `lib/schema.ts` | J1 |
| Nœud de page (name, description, url, dateModified) + BreadcrumbList | AR, LS | `Gabarit.astro` | J2 |
| Cabinet : MedicalClinic/MedicalBusiness, adresse, géo, horaires, `Podiatric`, `areaServed`, soins, `ReserveAction` | APF, LS, ARW | `businessSchema` | J3 |
| Praticiens : Person + identifiants publics (RPPS, n° d'Ordre, INAMI) | LS | `personSchemas` | J4 |
| WebSite, MedicalWebPage, FAQPage | AR, LS | `schema.ts` | J5 |
| HTML lisible sans JS, `<main>`, H1 unique, `max-snippet:-1`, `max-image-preview:large` | AR, FR, LS, AX, ARW | `Gabarit.astro` | P1 |

Non retenu, faute d'objet pour un cabinet (pas d'API, pas de compte, pas de paiement) : serveur MCP et sa
« server card », A2A Agent Card, agents.json, ai-plugin.json, OpenAPI, API Catalog (RFC 9727), OAuth (RFC 8414
/ 9728), WebMCP, x402 / UCP / ACP. Les déclarer sans service réel serait trompeur. Ce sont les niveaux 4 et 5
d'isitagentready : le niveau 3 est le maximum honnête pour un site statique.

Hors score, connu : le ratio texte/HTML d'AR (minimum 10 %) n'est pas atteint, car les feuilles de style et les
dessins sont dans la page (choix de performance mobile). Les assistants lisent la version Markdown (environ
5 Ko pour l'accueil, contre 250 Ko de HTML).

## Fonctionnement

- **Robots** : tous les robots de recherche et d'assistants sont autorisés, sauf `/rdv` (compteur de clics).
  Les sites de démonstration ou de test (`demo`) restent fermés (`Disallow: /` et `noindex`).
- **Entraînement des IA** : `SIGNAUX_CONTENU['ai-train']` vaut `yes`. À `no`, robots.txt l'annonce et ferme
  GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot et Meta-ExternalAgent. La recherche et les
  réponses des assistants restent ouvertes.
- **Markdown** : `/index.md`, `/soins.md`, `/soins/x.md`, `/le-cabinet.md`, `/acces.md`, `/actualites.md`,
  `/actualites/x.md`. Ces fichiers ne sont jamais indexés (`X-Robots-Tag: noindex`) et sont rattachés à leur
  page HTML (`Link: <…>; rel="canonical"`) : pas de contenu dupliqué pour Google.
- **Négociation** : `functions/_middleware.js` ne reçoit que les pages listées dans `public/_routes.json`
  (jamais les images, polices ni styles). Avec `Accept: text/markdown`, il renvoie la version Markdown ;
  sinon, la page HTML inchangée. Il ajoute `Vary: Accept`. Il remet aussi les en-têtes communs de `_headers`
  (CSP, HSTS…), relus dans `en-tetes.json` produit au build, au cas où Cloudflare ne les appliquerait pas à
  une réponse de Function. Coût : une invocation de Function par page vue, soit 100 000 par jour et par
  compte en offre gratuite.
- **Date de mise à jour** : `majLe` (colonne `sites.updated_at`). Elle alimente `dateModified`, `lastmod` et
  `last_updated`.
- **Pas de faux service** : AGENTS.md décrit ce que l'agent peut faire : lire les pages, prendre
  rendez-vous sur la plateforme, appeler, obtenir l'itinéraire. Il indique aussi les limites : pas d'avis
  médical, 15 ou 112 en cas d'urgence, aucune réservation sans l'accord du patient.

## Vérifier

En local : `npm run controle:agents -w apps/sites`. Le script construit la démo comme un site en ligne dans un
dossier temporaire, vérifie la grille et affiche un score qui doit être de 100/100. Il accepte aussi un dossier
déjà construit : `node scripts/controle-agents.mjs <dist>`.

En ligne, après publication d'un site qui n'est pas en test :

- `curl -sI https://<domaine>/` : présence de `Link`, de `Vary: Accept` et de la CSP ;
- `curl -s -H "Accept: text/markdown" https://<domaine>/soins/<slug>` : doit renvoyer du Markdown ;
- `curl -sI https://<domaine>/index.md` : `text/markdown`, `noindex`, canonical ;
- https://isitagentready.com (niveau 3 attendu) ;
- https://agent-ready.dev ;
- https://llmstxt.studio/audit/<domaine> ;
- https://www.frase.io/tools/agent-readiness ;
- https://agentmarkup.dev/checker/ ;
- https://validator.schema.org et https://search.google.com/test/rich-results.
