# Références d'illustration

Dans la bibliothèque (/admin/illustrations), la vue agrandie d'une icône, d'une illustration ou d'un héros propose
« Chercher des références » : des images libres liées au sujet de l'élément, par lots de 5. Vous cochez celles qui vous
inspirent, vous dites ce qui vous inspire (composition, trait, anatomie, couleurs, cadrage, et quelques mots), et elles sont
enregistrées comme inspirations liées à l'élément.

**Référence d'inspiration uniquement : jamais copiée ni décalquée ; on crée notre propre illustration.**

## Fonctionnement

- **Requête** : traduite du sujet de l'élément par le dictionnaire métier (`packages/core/src/dictionnaire-metier.ts` :
  orthonyxie → « ingrown toenail brace », onychoplastie → « artificial toenail reconstruction », orthoplastie → « silicone toe
  orthosis »…), modifiable. Boutons « + diagram », « + illustration », « + icon », « + line drawing ».
- **Lots de 5** et « Relancer (5 autres) » : page suivante de la source, puis source suivante (Wikimedia, Openverse, Pexels,
  Pixabay), puis variantes de la requête quand une source s'épuise (plus précises ou plus larges, ex. « toenail orthonyxia »,
  « nail brace podiatry », « ingrown nail diagram »). La requête de chaque lot est affichée ; un clic la reprend pour la modifier.
- Une image déjà montrée (mémoire du navigateur, par élément) ou écartée (« Pas pertinent », en base) ne revient jamais pour cet
  élément. « Oublier les images déjà vues » remet à zéro les images vues (les écartées restent écartées).
- **Enregistrement** : la vignette est téléchargée côté serveur depuis la source, réduite à 400 px au plus (WebP, sans
  métadonnées) et rangée dans le stockage PRIVÉ « inspirations » ; on garde l'adresse d'origine, la page source, l'auteur et la
  licence quand la source les donne, vos étiquettes, votre texte, et les sujets / hashtags acceptés.
- **Classement suggéré** (ici, dans la vue agrandie et dans Photos à découvrir) : sujets et hashtags en pointillé, tirés du
  dictionnaire métier, des tags de la source et des visuels déjà classés. Un clic ajoute, × refuse, « Tout accepter » ;
  rien n'est appliqué tout seul. Acceptations et refus sont journalisés pour corriger le dictionnaire (section « Suggestions
  refusées fréquentes » de `retours/SYNTHESE.md`). Jamais le sujet « posture ».
- **Pour le graphiste** : l'export nocturne écrit `retours/references-illustrations.json` (par élément : page d'origine publique,
  licence, étiquettes, texte, classement) — jamais de vignette, d'adresse signée ni de donnée de compte (dépôt public).

## Sources

| Source | Clé | Limites appliquées (par instance) |
| --- | --- | --- |
| Wikimedia Commons | aucune (application identifiée par son User-Agent) | 30 / min, 1 000 / jour |
| Openverse | aucune (accès anonyme modéré) | 4 / min, 150 / jour |
| Pexels | `PEXELS_API_KEY` (déjà configurée) | 40 / heure |
| Pixabay | `PIXABAY_API_KEY` (déjà configurée) | 30 / min |
| Google Programmable Search | `GOOGLE_CSE_KEY` + `GOOGLE_CSE_ID` | 5 / min, 90 / jour (quota gratuit : 100 / jour) |

Toutes les recherches sont en cache 24 h : relancer la même requête ne consomme rien. Une source sans clé est affichée
« non configurée » et ignorée. Google n'est utilisé que si vous cochez « Inclure Google », ou en dernier recours quand les
autres sources n'ont plus rien de nouveau ; le quota restant estimé est affiché. Les pages de Google Images ne sont jamais lues.

## Configurer Google (facultatif)

1. Sur https://programmablesearchengine.google.com/ : « Ajouter » un moteur de recherche, « Rechercher sur l'ensemble du
   Web », activer « Recherche d'images ». Copier l'**ID du moteur de recherche** (`cx`).
2. Sur https://console.cloud.google.com/ : créer (ou choisir) un projet, activer « Custom Search API », puis « Identifiants »
   → « Créer des identifiants » → « Clé API ». Restreindre la clé à « Custom Search API ».
3. Dans Vercel (projet admin → Settings → Environment Variables, Production) : `GOOGLE_CSE_KEY` = la clé, `GOOGLE_CSE_ID` = l'ID
   du moteur. Redéployer.

Le quota gratuit est d'environ 100 requêtes par jour (au-delà, facturé : l'admin s'arrête à 90). Les résultats sont filtrés sur
les licences Creative Commons (`rights=cc_publicdomain|cc_attribute|cc_sharealike`), mais la licence réelle est à vérifier
sur la page d'origine. À vérifier au moment de la configuration : Google a annoncé fermer cette API aux nouveaux clients et
orienter vers Vertex AI Search ; si la création échoue, se passer de Google (les quatre autres sources suffisent).

## Fichiers

- `packages/core/src/dictionnaire-metier.ts` : dictionnaire FR ↔ EN, traduction, variantes de requête.
- `packages/core/src/references-illustrations.ts` : sources, limites, lecture des réponses, relance par lots, validation, export.
- `packages/core/src/classement-visuels.ts` : suggestions de classement, journal.
- `apps/admin/src/lib/references-illustrations.ts` (appels réseau, cache, vignette WebP), `apps/admin/src/app/admin/illustrations/actions-references.ts`,
  `apps/admin/src/components/ReferencesIllustration.tsx`, `apps/admin/src/components/SuggestionsClassement.tsx`.
- `supabase/migrations/0033_references_illustrations.sql` : colonnes de lien et d'origine de `inspirations`, `references_ecartees`,
  `classement_suggestions`.
