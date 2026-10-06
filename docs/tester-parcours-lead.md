# Tester le parcours « en tant que lead »

But : vivre le parcours d’un praticien (page d’essai → site créé sans inscription → rendu contre e-mail → accès → aperçu privé → demande de mise en ligne) sans polluer les statistiques, puis tout effacer.

## 1. Prérequis Supabase (une fois)

À cocher dans le tableau de bord Supabase du projet :

- [ ] **Migrations exécutées** dans l’éditeur SQL, dans l’ordre : `0022_rattrapage_articles.sql`, `0023_essais_leads.sql`, `0024_prospects_entonnoir.sql`, `0025_essai_anonyme.sql` (fichiers dans `supabase/migrations/`, rejouables). **0025 avant d’activer les connexions anonymes.**
- [ ] **Authentication → Sign In / Providers → « Allow anonymous sign-ins »** activé. Sinon, le bouton de /essai bascule sur l’ancien parcours (mot de passe d’abord) : utile pour vérifier le repli, pas pour tester le nouveau parcours.
- [ ] **Authentication → Rate Limits** : limite des connexions anonymes (30 par heure et par IP par défaut). Pendant les tests, chaque fenêtre privée crée une connexion anonyme : rester sous la limite.
- [ ] **Authentication → Sign In / Providers → Email** : « Allow new users to sign up » activé.
- [ ] **Confirm email** : au choix.
  - désactivé : « Créer mon accès » crée l’accès tout de suite, enchaînement direct sur « Voir mon site » (le plus simple pour tester) ;
  - activé : écran « Vérifiez vos e-mails » ; le lien ramène sur le dernier écran de la création (mot de passe redemandé si Supabase ne l’a pas accepté avant la confirmation).
- [ ] **Modèle d’e-mail « Change email address »** (si la confirmation est activée) : voir `docs/onboarding-lead.md`, Configuration, point 6.
- [ ] **Authentication → URL Configuration → Redirect URLs** : `https://admin.webpodologue.fr/auth/callback` (et `http://localhost:3001/auth/callback` pour un test en local).
- [ ] **E-mails** : le serveur d’envoi par défaut de Supabase est limité à **quelques e-mails par heure** et réservé aux tests. Avant tout lancement, brancher un SMTP (Brevo ou Resend). Pendant les tests, désactiver « Confirm email » évite d’atteindre la limite.

Recommandé (anti-robots) : captcha Turnstile pour les connexions anonymes = variable Vercel `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + captcha Supabase (Attack Protection). **Ne pas activer la captcha Supabase** tant que `/connexion` n’a pas le widget (voir `docs/onboarding-lead.md`).

## 2. Choisir une adresse de test

Une adresse est considérée comme **test** si elle se termine par `@webpodologue.fr` ou contient `+test`. Exemple avec Gmail : `votre.nom+test1@gmail.com` (les messages arrivent dans votre boîte habituelle). Changer le numéro à chaque essai : `+test2`, `+test3`…

Les leads de test sont marqués **Test** dans `/admin/leads`, regroupés dans le filtre **Tests** et **exclus de l’entonnoir**. Attention : tant qu’aucune adresse n’est laissée (avant la porte du rendu), un site anonyme n’est pas reconnaissable comme test et compte dans « Sites commencés ».

⚠ Ne pas utiliser l’adresse de votre compte administrateur : la suppression d’un compte admin est refusée, et la conversion afficherait « Vous avez déjà un compte ».

## 3. Parcours pas à pas

Ouvrir une **fenêtre de navigation privée** (vous n’y êtes pas connecté en admin ; fermer la fenêtre efface la session anonyme).

1. `https://admin.webpodologue.fr/essai` → **Créer mon site gratuit** (aucun formulaire). Pour tester une provenance : `/essai?utm_source=test&utm_campaign=essai-paul`.
   - Écran « Préparation de votre site » (vérification anti-robot si Turnstile est configuré), puis la création s’ouvre.
   - Dans `/admin/leads` (fenêtre normale) : rien dans la liste, mais « 1 site commencé sans coordonnées (comptés seulement) » et l’entonnoir « Sites commencés » augmentent.
2. Création du site (`/creer`) : bandeau « Enregistré dans ce navigateur : créez votre accès à la fin pour retrouver votre site ». Choisir les sujets, le modèle, puis saisir le nom et le téléphone du cabinet (étape 4).
   - Le bouton **Voir le rendu** apparaît dans le bandeau dès que le modèle et un nom sont saisis.
   - Recharger la page (même fenêtre) : on reprend où on en était.
3. **Voir le rendu** → fenêtre : adresse de test, téléphone du cabinet (pré-rempli), case « J’accepte d’être recontacté(e) » (obligatoire), conseils (facultatif) → **Voir le rendu**.
   - Le rendu s’affiche en plein écran (téléphone / ordinateur). Aucune construction n’est lancée (rien dans GitHub Actions).
   - Dans `/admin/leads` : le lead apparaît, état « Rendu vu, accès non créé, étape N/6 », badge **Test**, filtre **Rendu vu, sans accès**.
4. **Garder mon site** (ou terminer les 6 étapes puis « Vérifier mon site ») → « Créez votre accès pour voir et garder votre site » : adresse (pré-remplie), mot de passe, case des conditions → **Créer mon accès**.
   - Confirmation désactivée : l’écran passe directement à « Votre version d’essai ».
   - Confirmation activée : « Vérifiez vos e-mails », ouvrir le lien, retour sur le dernier écran.
   - Dans `/admin/leads` : état « Accès créé », CGU (version + date) visibles dans la fiche, fin d’essai à +3 mois à partir de maintenant.
5. **Voir mon site** → aperçu privé `https://apercu.<slug>.pages.dev` (lancement d’une construction GitHub et d’un projet Cloudflare). État « Aperçu privé généré ».
6. Tableau de bord : **Demander la mise en ligne** → la demande apparaît dans « À faire aujourd’hui ».
7. (Facultatif) Fiche du lead → **Valider et mettre en ligne** : ⚠ publie réellement le site de test en production sur Cloudflare. À éviter, sauf pour tester la mise en ligne elle-même.

Cas à vérifier aussi :

- **Garde anonyme** : avant l’étape 4, aller sur `/mon-site` et cliquer sur « Publier » : refus « Créez votre accès… ». Dans la fiche admin du lead, le bouton « Valider et mettre en ligne » n’apparaît pas.
- **Adresse déjà utilisée** : à l’étape 4, saisir l’adresse d’un compte existant → « Vous avez déjà un compte : connectez-vous », avec l’explication sur le brouillon.
- **Autre appareil** : ouvrir `/essai/commencer` dans une autre fenêtre privée : un nouveau site vide commence (limite connue : le brouillon anonyme ne se retrouve que dans le navigateur d’origine).
- **Abandon** : s’arrêter après le rendu. Les relances « A vu le rendu, pas d’accès créé depuis 1 j / 3 j » apparaissent le lendemain avec un message à copier (lien `/essai/commencer`, « sur l’appareil où vous l’avez commencé »). Aucun e-mail n’est envoyé automatiquement.

## 4. Effacer un lead de test

1. `/admin/leads` → filtre **Tests** → fiche → **Supprimer ce lead de test**. Supprime le prospect, l’essai, ses notes et le site, **y compris le brouillon d’un compte anonyme** lié à cette adresse (fonction SQL `supprimer_lead_test`, refusée pour un vrai lead et pour un compte admin).
2. Le **compte de connexion** n’est pas supprimé par l’application (il faudrait la clé service_role, qui n’est jamais mise dans Vercel) : Supabase → **Authentication → Users** → rechercher l’adresse de test (ou filtrer les utilisateurs **anonymes** pour un accès jamais créé) → menu « … » → **Delete user**.
3. Sites commencés sans adresse (jamais capturés) : non supprimables depuis /admin/leads ; nettoyage par `nettoyer_anonymes` et la requête SQL de `docs/onboarding-lead.md` (point 7), ou suppression des utilisateurs anonymes dans Authentication → Users.
4. Si « Voir mon site » a été utilisé : Cloudflare → Workers & Pages → supprimer le projet `<slug>` de test.

## 5. Ce qui est mesuré

En tête de `/admin/leads`, sur 7 et 30 jours, leads de test exclus : visites de la page d’essai → sites commencés (sessions anonymes comprises) → rendu demandé (coordonnées laissées) → accès créé → aperçu privé généré → mise en ligne demandée → validé et mis en ligne. Les visites sont un compteur par jour côté serveur (ni cookie, ni identifiant, ni service tiers ; robots ignorés). Vos propres visites et sites de test anonymes comptent tant qu’aucune adresse de test n’est laissée.
