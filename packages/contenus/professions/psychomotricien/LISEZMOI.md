# Pack de contenus « Psychomotricien »

**Statut : en préparation.** Non publiable avant relecture de Paul **et** d'un psychomotricien diplômé d'État
(`PACK_PSYCHOMOTRICIEN.aRelire`). Recherche réglementaire et sources : `docs/professions/psychomotricien.md`.

## Contrôle

```
npm run controle:packs -w @plateforme/contenus
```

Lexique bloquant du core (`verifierTexte`, niveau strict), mots interdits du métier (`INTERDITS_PSYCHOMOT` : guérir, diagnostic,
sans ordonnance, bien-être, spécialiste, chutes…), source obligatoire pour toute phrase réglementaire (prescription,
remboursement, Assurance maladie, PCO, MDPH, Code de la santé publique, RPPS), `controlerPratique`, scènes d'images passées
dans `motifsRefus` (prompts-images.ts) et dans les refus propres au pack. Les types sont vérifiés par `npm run verifier`
(tsconfig du paquet : `professions/**/*.ts`).

## Fichiers et branchements prévus

| Fichier | Contenu | À brancher dans |
| --- | --- | --- |
| `sources.ts` | Sources officielles (URL, date, extrait, `verifie`) | — |
| `pratique.ts` | `PRATIQUE_PSYCHOMOTRICIEN` (forme `PratiqueProfession`) : 9 thèmes (dont « santé mentale » différé), 7 médiations, 5 publics, 7 profils de référence ; `PARCOURS_PSYCHOMOTRICIEN` (code TRE_G15 96) | `PRATIQUES` (core/pratiques.ts) ; `PROFESSIONS_PARCOURS` (core/onboarding-professions.ts) |
| `textes.ts` | `PACK_SITE_PSYCHOMOT` (discipline, instance, diplôme, règles, accroche, univers, mots-clés de partage), mentions, questions d'onboarding, vocabulaire | `PSYCHOMOTRICIEN` de core/packs-professions.ts (remplace les « [à rédiger] » France) |
| `pages.ts` | 6 pages (accueil, la psychomotricité, bilan et suivi, pour qui, tarifs et prise en charge, cabinet et accès) + FAQ (9 questions) + texte de prise en charge validé | gabarits des sites (pack profession) |
| `fiches.ts` | 11 fiches « pour quels troubles » au format `soins_catalogue` (slug, titre court, titre, résumé, corps, FAQ) | `soinsDemo` du pack, puis table `soins_catalogue` (profession `psychomotricien`) |
| `visuels.ts` | Visuels priorisés (partagés / à créer), scènes de prompts { fr, en }, contraintes négatives et refus propres, pictos à dessiner, motif signature « Trajectoires de mouvement » | `prompts-images.ts`, `univers.ts` quand l'univers sera implémenté |
| `controle.ts` | `controlerPackPsychomot` | `scripts/controle-packs.mjs` |

## Champs du cabinet

`{ville}`, `{cabinet}`, `{praticien}`, `{titre_praticien}`, `{rpps}`, `{adresse}`, `{horaires}`, `{acces}`, `{duree_bilan}`, `{duree_seance}`,
`{tarif_bilan}`, `{tarif_seance}`, `{domicile}`, `{contrat_pco}`, `{territoire_pco}` : remplis par l'onboarding
(`ONBOARDING_PSYCHOMOT`). Sections conditionnelles : `si: 'contrat-pco'` (aucune mention de prise en charge PCO sans contrat
signé), `si: 'interventions-exterieures'`.

## Ajouter le pack d'une autre profession

Copier ce dossier sous `professions/<id>/`, garder les mêmes exports (`PACK_<ID>` avec `statut` et `profession`,
`controlerPack<Id>`) : le script de contrôle découvre chaque dossier qui contient un `index.ts`.
