# Annuaire Santé (RPPS) : ce qui existe vraiment, et comment le parcours client s'en sert

Recherche faite le 2026-10-08 sur les sites officiels (aucun compte créé, aucune clé obtenue). **[V]** = vérifié sur la page ou dans les données ; **[S]** = supposé, non vérifié.

## 1. L'API FHIR « Annuaire Santé en libre accès » (Agence du Numérique en Santé)

- **[V] Adresse** : `https://gateway.api.esante.gouv.fr/fhir/v2` ; ressources `Practitioner`, `PractitionerRole`, `Organization`, `HealthcareService`, `Device`, `/metadata`. GET et POST `/_search` seulement. Pas de bac à sable (la seule API est la production). 50 résultats par défaut, délai maximal 30 s. Source : [api-basics](https://raw.githubusercontent.com/ansforge/annuaire-sante-fhir-documentation/HEAD/docs/pages/guide/version-2/getting-started/api-basics.md).
- **[V] Authentification** : en-tête `ESANTE-API-KEY: <clé>` (même source).
- **[V] Clé** : compte gratuit sur le portail [portal.api.esante.gouv.fr](https://portal.api.esante.gouv.fr) → confirmer l'e-mail → créer une « application » → s'abonner à « API Annuaire Santé en libre accès » → clé dans l'onglet Abonnements. Source : [get-api-key](https://ansforge.github.io/annuaire-sante-fhir-documentation/pages/guide/version-2/getting-started/get-api-key.html).
- **[V] Débit** : 17 appels par seconde et par application (au-delà : HTTP 429). Les CGU recommandent de mettre en cache les réponses déjà obtenues. Source : [CGU](https://ansforge.github.io/annuaire-sante-fhir-documentation/pages/cgu.html).
- **[V] Réutilisation** (CGU §4.1) : libre si les données ne sont pas altérées, si la source « RPPS » et la date de dernière mise à jour sont citées, et si le RGPD est respecté ; pas de restriction commerciale dans les CGU. Les extractions data.gouv.fr sont sous **Licence Ouverte v2.0**.

### Ce que contiennent les ressources (IG Annuaire 1.1.0, profils `as-dp-*`)

Sources : [Practitioner](https://interop.esante.gouv.fr/ig/fhir/annuaire/StructureDefinition-as-dp-practitioner.html), [PractitionerRole](https://interop.esante.gouv.fr/ig/fhir/annuaire/StructureDefinition-as-dp-practitionerrole.html), [Organization](https://interop.esante.gouv.fr/ig/fhir/annuaire/StructureDefinition-as-dp-organization.html).

| Ressource | Champs utiles au site | Remarques |
| --- | --- | --- |
| `Practitioner` | `identifier` : RPPS (11 chiffres, système `https://rpps.esante.gouv.fr`) et IDNPS (`urn:oid:1.2.250.1.71.4.2.1`, « 8 » + RPPS) ; `name.family` / `name.given` = nom et prénom **d'exercice** ; `name.prefix` = civilité ; `qualification` : profession (TRE_G15), **diplômes** (type TRE_R14 « DE », « DU »… + code et libellé du diplôme), savoir-faire | **[V]** pas d'adresse (`address` 0..0) ; `telecom` = messagerie MSSanté seulement |
| `PractitionerRole` | mode d'exercice (TRE_R23 : `L` libéral, `S` salarié, `B` bénévole, `I` indirect), lien vers la structure | **[V]** pas d'adresse |
| `Organization` | raison sociale, **adresse** et **téléphone** de la structure d'exercice, SIRET, FINESS | **[V]** coordonnées des structures publiques depuis l'arrêté de 2015 |

Recherches documentées **[V]** : `Practitioner?identifier=<RPPS>`, `Practitioner?name:family=<NOM>&name:given=<PRENOM>`, `Practitioner?qualification-code=<système TRE_G15>|80`, `PractitionerRole?practitioner=<id>&_include=PractitionerRole:organization`, `Organization?address-city=…`. **[S]** Le chaînage `organization.address-city` sur PractitionerRole n'est pas documenté : la ville est filtrée côté serveur après lecture des structures.

### Codes profession (TRE_G15-ProfessionSante) utilisés par le parcours

Source **[V]** : [TRE_G15](https://mos.esante.gouv.fr/NOS/TRE_G15-ProfessionSante/FHIR/TRE-G15-ProfessionSante/). Registre : `packages/core/src/onboarding-professions.ts`.

| Code | Profession | Parcours client |
| --- | --- | --- |
| 80 | Pédicure-podologue | disponible |
| 70 | Masseur-kinésithérapeute | bientôt (liste d'attente) |
| 60 | Infirmier | bientôt |
| 91 | Orthophoniste | bientôt |
| 50 | Sage-femme | bientôt |
| — | Ostéopathe (répertoire ADELI, pas de code TRE_G15 retenu) | bientôt, choix manuel |

Attention **[V]** : le code **86** est « Technicien de laboratoire médical », pas le pédicure-podologue.

## 2. Extractions publiques (data.gouv.fr)

**[V]** Jeu « [Annuaire Santé — Extractions des données en libre accès des professionnels intervenant dans le système de Santé (RPPS)](https://www.data.gouv.fr/datasets/annuaire-sante-extractions-des-donnees-en-libre-acces-des-professionnels-intervenant-dans-le-systeme-de-sante-rpps) », ANS, **Licence Ouverte v2.0**, mise à jour **quotidienne**, fichiers texte séparés par `|` : `PS_LibreAcces_Personne_activite` (identité, profession, savoir-faire, mode d'exercice, raison sociale, adresse, téléphones, e-mail de la structure), `PS_LibreAcces_Dipl_AutExerc` (type, code et libellé des diplômes), `PS_LibreAcces_SavoirFaire`. Non utilisés par le parcours (l'API suffit, sans stockage) ; utiles plus tard pour des statistiques.

## 3. Les diplômes universitaires (DU) figurent-ils dans le RPPS ?

**Oui, parfois, mais rarement et jamais de façon exhaustive.**

- **[V]** La nomenclature TRE_R14-TypeDiplome contient « DU = Diplôme d'université (DU) ou inter-universitaire (DIU) » ([source](https://mos.esante.gouv.fr/NOS/TRE_R14-TypeDiplome/FHIR/TRE-R14-TypeDiplome/)).
- **[V]** Comptage dans l'extraction du 2026-10-08 (lignes de diplôme, sans aucun nom) : environ 14 290 lignes « Diplôme d'État français de Pédicure-Podologue » (DE12) et 907 diplômes de l'EEE (DE86), contre **environ 250 lignes de DU de podologie** : « DU Podologie appliquée aux activités physiques et sport » (DIP283, 87), « DU Podologie appliquée au sport » (DIP282, 82), DIP295 (30), « DU Podologie du sport » (DIP284, 29), etc.
- **[V]** **Aucun savoir-faire** n'est enregistré pour la profession 80 (seules les professions 10, 21, 40 et 60 en ont).
- **[S]** L'enregistrement d'un DU dépend sans doute de la déclaration du praticien à son Ordre : **l'absence d'un DU ne prouve rien**.

Conséquence dans le parcours : un DU n'est **proposé** que s'il est réellement sur la fiche, **jamais coché d'office**, affiché seulement si le praticien le coche ; il peut pré-cocher un **thème** (ex. « Sport » pour un DU de podologie du sport), que le praticien confirme ou retire. Sans DU, rien n'est inventé.

## 4. Cadre juridique et RGPD

- **[V]** Texte cité par les CGU : arrêté du 23 septembre 2022 modifié relatif au RPPS ; base légale de la diffusion : mission d'intérêt public (RGPD art. 6.1.e). **[S]** Il remplace l'arrêté du 6 février 2009 (abrogation non vérifiée sur Légifrance).
- **[V]** Le professionnel ne peut pas s'opposer à son inscription au RPPS ni à la publication de ses données (art. 10 de l'arrêté) ; la **rectification** se demande à l'autorité d'enregistrement (l'Ordre), pas à l'ANS (CGU §5.1).
- **[V]** Le réutilisateur devient **responsable de son propre traitement** (CGU §4) : information préalable, droits d'accès, rectification, effacement, limitation et **opposition à son traitement**.
- **[S]** Ce qui suit est une recommandation déduite des CGU, pas un avis juridique : relecture par un juriste ou un DPO conseillée.

Ce que fait le parcours :
1. **À la demande du praticien seulement** (n° RPPS ou nom + ville saisis par lui) : aucune prospection, aucun fichier constitué.
2. **Mention de source** sous les informations reprises : « Données issues du RPPS (Annuaire Santé, Agence du Numérique en Santé), fiche mise à jour le … ».
3. **Rien n'est gardé sans confirmation** : la fiche ne vit qu'en mémoire (cache serveur de 10 min, navigateur) ; seuls les champs confirmés ou corrigés par le praticien vont dans son brouillon.
4. **Note courte** « D'où viennent ces informations ? » : source, finalité (préparer son site), rien de publié sans son accord et la vérification de la conseillère, correction officielle auprès de l'Ordre, modification ou suppression à tout moment, lien vers la confidentialité.
5. **À faire par Paul** : ajouter un paragraphe « Préremplissage depuis l'Annuaire Santé » dans la politique de confidentialité de l'essai (`/essai/confidentialite`, `apps/admin/src/lib/juridique.tsx`) : source, finalité, durée (cache 10 min, rien d'autre), droit d'opposition au préremplissage (il suffit de ne pas l'utiliser), rectification auprès de l'Ordre.

## 5. Ce que Paul doit faire pour activer le préremplissage

1. Créer un compte sur [portal.api.esante.gouv.fr](https://portal.api.esante.gouv.fr) (gratuit), créer une application, s'abonner à « API Annuaire Santé en libre accès », copier la clé.
2. Vercel → projet admin → Settings → Environment Variables : `ANNUAIRE_SANTE_API_KEY` = la clé (Production et Preview), puis redéployer. **Ne jamais la committer.**
3. Sans clé : le parcours fonctionne, le champ RPPS est masqué et une phrase discrète indique que le préremplissage n'est pas disponible.
4. Variables facultatives : `ANNUAIRE_SANTE_URL` (autre adresse de l'API, par défaut la v2) ; `ANNUAIRE_SANTE_DEMO=1` **uniquement en local** (fiches fictives, tests et captures).

Code : appel serveur `apps/admin/src/lib/annuaire-sante.ts` (cache 10 min, garde de débit 8 recherches/min par visiteur et 120/min au total, délai 6 s, 3 appels au plus par recherche) ; normalisation pure et fiches de démonstration `packages/core/src/annuaire-sante.ts` (tests : `annuaire-sante.test.ts`, à partir des exemples documentés, sans réseau).
