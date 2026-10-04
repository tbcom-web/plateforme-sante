# Référentiels d'illustration (repris d'ÉcranZen)

Le studio ÉcranZen (`C:\Users\pault\Desktop\TBCOM CLAUDE\ecranzen\studio`) a déjà validé avec Paul des règles d'anatomie,
de lecture et de méthode. Les sites praticiens les appliquent aussi.

| Fichier | Contenu | Qui l'applique |
|---|---|---|
| `anatomie-pied.md` | Anatomie sourcée du pied et de la cheville : os, arches, proportions chiffrées, ongle, peau, vues canoniques | illustrateur médical, graphiste |
| `pieges-illustration.md` | Pièges réellement rencontrés (lecture profane, anatomie, style) : check-list à cocher avant toute livraison | tous les agents qui dessinent ou relisent |

## Leçons adoptées pour les sites (2026-10-04)

**Méthode**
1. **Une seule géométrie, jamais redessinée à l'œil.** Pied, semelle, ongle, jambe sont décrits une fois dans le core
   (`packages/core/src/pied.ts`) ; chaque dessin les réutilise. Une forme corrigée l'est à la source. Quand une géométrie
   validée existe dans ÉcranZen (`studio/outils/lib/geometrie/`), on la reprend plutôt que d'en créer une nouvelle.
2. **Lecture profane avant anatomie.** Pour chaque dessin, écrire ce qu'un non-soignant y voit en 2 secondes, puis cocher
   `pieges-illustration.md`.
3. **Chaîne de contrôle** : graphiste → illustrateur médical (anatomie, lecture) → test « patient » sur l'image rendue →
   Paul. Au plus **2 allers-retours** par étape ; au-delà, la décision remonte à Paul.
4. **Un défaut vu deux fois = une règle** (ajoutée à `pieges-illustration.md`) **ou un contrôle automatique**
   (`npm run controle:charte`).
5. **Arbitrage visuel** : montrer 2 ou 3 variantes côte à côte, jamais une seule proposition avec « ça te va ? ».
6. **Les contrôleurs ne modifient pas la géométrie commune** pendant qu'un autre agent la travaille : ils proposent, le
   graphiste applique en une seule passe groupée.
7. Les références trouvées en ligne servent à comprendre, **jamais à copier ni décalquer** (droit d'auteur).

**Règles de dessin les plus utiles pour les sites**
- Toute couleur posée sur la peau se lit comme une maladie : la pression se montre sur la vitre du podoscope, le sol ou
  l'empreinte, pas sur la peau du pied.
- Pointillés sur la peau = ligne de découpe ; point sombre plein = bouton, plaie ou cible. La douleur = rond creux.
- Jambe : tibia ET fibula ; malléole médiale plus haute et plus en avant que la latérale.
- L'arche médiale d'un pied normal ne touche pas le sol ; avant-pied ≈ 35–40 % de la longueur, talon ≈ 60–65 % de
  l'avant-pied ; formule digitale égyptienne par défaut.
- Même simplifiés, une semelle (L/l ≈ 2,6), un pied ou une empreinte gardent leur vraie forme : jamais de forme « Paint ».
- Fond sombre + os clairs ou pied transparent = « radio, fracture » : os en contour fin, remplissage teinté.
- Pas de main qui touche le pied ; un détail se montre par un médaillon de zoom.
- Praticien représenté : personnage neutre en blouse, sans visage ni symbole médical.
