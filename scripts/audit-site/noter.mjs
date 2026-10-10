// AUDIT DE SITE — notation. Transforme les mesures de collecter.mjs en constats (ok / à améliorer / problème) regroupés en
// 7 thèmes, chacun noté sur 100, et une note globale pondérée. Chaque constat porte une phrase en langage simple (« phrase »)
// utilisée pour les points marquants de la première page : ton factuel, sans dénigrer le prestataire actuel.
import { ROBOTS_IA } from './collecter.mjs';

export const THEMES = [
  { id: 'vitesse', nom: 'Vitesse', poids: 20, intro: 'Le temps que met la page à s’afficher, mesuré par Google sur un téléphone moyen en 4G.' },
  { id: 'mobile', nom: 'Affichage sur téléphone', poids: 15, intro: 'La majorité des patients cherchent leur praticien sur leur téléphone.' },
  { id: 'accessibilite', nom: 'Lisibilité et accessibilité', poids: 15, intro: 'Contrastes, textes alternatifs, structure : critères du référentiel WCAG 2.1 (niveau AA).' },
  { id: 'google', nom: 'Référencement Google', poids: 15, intro: 'Ce que Google lit pour comprendre qui vous êtes, ce que vous faites et où.' },
  { id: 'ia', nom: 'Visibilité dans ChatGPT et les IA', poids: 15, intro: 'De plus en plus de patients demandent « un podologue près de chez moi » à ChatGPT, Gemini ou Perplexity.' },
  { id: 'confiance', nom: 'Conformité et confiance', poids: 10, intro: 'Obligations légales (LCEN, RGPD) et recommandations de l’Ordre des pédicures-podologues.' },
  { id: 'contact', nom: 'Contact et prise de rendez-vous', poids: 10, intro: 'Ce dont un patient a besoin pour vous joindre en moins de dix secondes.' },
];

const OK = 'ok', MOY = 'attention', KO = 'echec', NM = 'non-mesure';
const VAL = { [OK]: 1, [MOY]: 0.5, [KO]: 0 };
const sec = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
const mo = (o) => (o >= 1e6 ? `${(o / 1e6).toFixed(1).replace('.', ',')} Mo` : `${Math.round(o / 1e3)} Ko`);

const RE_TEL = /(?:\+33\s?|\b0)[1-9](?:[\s.\-]?\d{2}){4}\b/;
const RE_RDV = /doctolib|maiia|keldoc|rdvmedicaux|clicrdv|mondocteur|rendezvous|prise-de-rendez-vous|prendre[\s-]rendez[\s-]vous|rdv/i;
const RE_ADRESSE = /\b\d{1,4}(?:\s?(?:bis|ter))?,?\s+(?:rue|avenue|av\.|boulevard|bd|place|chemin|allée|allee|route|impasse|quai|cours|square|résidence|rés\.)\b/i;
const RE_CP = /\b(?:0[1-9]|[1-8]\d|9[0-5]|2[AB])\d{3}\b\s+([A-ZÉÈÀÂÎ][\p{L}'’\- ]{2,40})/u;
const RE_HORAIRES = /(lundi|mardi|mercredi|jeudi|vendredi|samedi)[\s\S]{0,60}?\d{1,2}\s?(?:h|:)\s?\d{0,2}/i;
const RE_TEMOIGNAGES = /t[ée]moignages?|avis\s+(?:de\s+nos|des)\s+patients|ils\s+nous\s+font\s+confiance|ce\s+que\s+disent\s+nos/i;
const TYPES_LOCAUX = /Physician|MedicalBusiness|MedicalClinic|MedicalOrganization|Podiatr|LocalBusiness|HealthAndBeautyBusiness|Dentist|Optician/i;

function aplatirJsonld(liste) {
  const out = [];
  const visiter = (n) => { if (Array.isArray(n)) return n.forEach(visiter); if (n && typeof n === 'object') { if (n['@type']) out.push(n); if (n['@graph']) visiter(n['@graph']); } };
  visiter(liste); return out;
}

/**
 * @param opts.preparation site préparé non publié (moteur webpodologue) : il est fermé aux moteurs (noindex, robots.txt
 * « Disallow: / ») jusqu'à la publication, qui l'ouvre automatiquement (apps/sites/src/pages/robots.txt.ts, Gabarit.astro).
 * On juge alors les réglages de publication, et on le dit dans le constat.
 */
export function noter(d, { preparation = false } = {}) {
  const m = d.mobile.mesures, b = d.bureau.mesures;
  const texte = `${m.texte}\n${d.brut.htmlDebut}`;
  const liens = m.liens;
  const constats = [];
  const ajout = (theme, statut, titre, detail, { poids = 1, phrase = null, valeur = null } = {}) => constats.push({ theme, statut, titre, detail, poids, phrase, valeur });

  // ---------------------------------------------------------------- Vitesse
  const pm = d.pagespeed.mobile, pb = d.pagespeed.bureau;
  let noteVitesse = null;
  if (pm && !pm.erreur) {
    noteVitesse = Math.round(0.7 * pm.scores.performance + 0.3 * (pb?.scores?.performance ?? pm.scores.performance));
    ajout('vitesse', pm.scores.performance >= 90 ? OK : pm.scores.performance >= 50 ? MOY : KO, 'Note PageSpeed sur mobile', `${pm.scores.performance}/100 (Google PageSpeed Insights).`, { valeur: pm.scores.performance, poids: 2,
      phrase: pm.scores.performance < 50 ? `Google attribue à votre site une note de vitesse de ${pm.scores.performance}/100 sur téléphone.` : null });
    if (pb && !pb.erreur) ajout('vitesse', pb.scores.performance >= 90 ? OK : pb.scores.performance >= 50 ? MOY : KO, 'Note PageSpeed sur ordinateur', `${pb.scores.performance}/100.`, { valeur: pb.scores.performance });
    ajout('vitesse', pm.lcp <= 2500 ? OK : pm.lcp <= 4000 ? MOY : KO, 'Affichage du contenu principal (LCP)', `${sec(pm.lcp)} sur mobile. Recommandation de Google : moins de 2,5 s.`, { poids: 2, valeur: pm.lcp,
      phrase: pm.lcp > 4000 ? `Sur un téléphone, il faut ${sec(pm.lcp)} avant que le contenu principal s’affiche (Google recommande moins de 2,5 s).` : null });
    ajout('vitesse', pm.cls <= 0.1 ? OK : pm.cls <= 0.25 ? MOY : KO, 'Stabilité de la page (CLS)', `${pm.cls.toFixed(2).replace('.', ',')} — au-delà de 0,1, des éléments bougent pendant le chargement.`, { valeur: pm.cls });
    ajout('vitesse', pm.tbt <= 200 ? OK : pm.tbt <= 600 ? MOY : KO, 'Réactivité (temps de blocage)', `${Math.round(pm.tbt)} ms. Recommandation : moins de 200 ms.`, { valeur: pm.tbt });
  } else {
    const lcp = d.mobile.mesures.lcp;
    if (lcp) {
      // barème proche de Lighthouse pour le LCP mobile : 2,5 s ≈ 90, 4 s ≈ 50, 8 s et plus ≈ 10
      const pts = [[0, 100], [2500, 90], [4000, 50], [8000, 10], [20000, 0]];
      const k = pts.findIndex(([x]) => lcp < x); const [x0, y0] = pts[Math.max(0, k - 1)], [x1, y1] = pts[k === -1 ? pts.length - 1 : k];
      noteVitesse = Math.round(k === -1 ? 0 : y0 + ((lcp - x0) / (x1 - x0)) * (y1 - y0));
      ajout('vitesse', lcp <= 2500 ? OK : lcp <= 4000 ? MOY : KO, 'Affichage du contenu principal (LCP)', `${sec(lcp)} sur téléphone en 4G simulée. Recommandation de Google : moins de 2,5 s.`, { poids: 2, valeur: lcp,
        phrase: lcp > 4000 ? `Sur un téléphone en 4G, il faut ${sec(lcp)} avant que le contenu principal s’affiche (Google recommande moins de 2,5 s).` : null });
    }
    const cls = d.mobile.mesures.cls;
    if (cls !== null) ajout('vitesse', cls <= 0.1 ? OK : cls <= 0.25 ? MOY : KO, 'Stabilité de la page (CLS)', `${cls.toFixed(2).replace('.', ',')} — au-delà de 0,1, des éléments bougent pendant le chargement.`);
    ajout('vitesse', d.mobile.dureeChargement <= 6000 ? OK : d.mobile.dureeChargement <= 12000 ? MOY : KO, 'Chargement complet', `${sec(d.mobile.dureeChargement)} sur téléphone en 4G simulée.`);
  }
  const poids = d.mobile.requetes.reduce((s, r) => s + r.taille, 0);
  ajout('vitesse', poids <= 1.5e6 ? OK : poids <= 3e6 ? MOY : KO, 'Poids de la page d’accueil', `${mo(poids)} téléchargés en ${d.mobile.requetes.length} fichiers.`, { valeur: poids,
    phrase: poids > 3e6 ? `La page d’accueil pèse ${mo(poids)} : c’est lourd pour un forfait mobile.` : null });
  const lourdes = d.mobile.requetes.filter((r) => r.type === 'image' && r.taille > 250e3);
  ajout('vitesse', lourdes.length === 0 ? OK : lourdes.length <= 2 ? MOY : KO, 'Images optimisées', lourdes.length ? `${lourdes.length} image(s) de plus de 250 Ko (la plus lourde : ${mo(Math.max(...lourdes.map((r) => r.taille)))}).` : 'Aucune image de plus de 250 Ko.');

  // ---------------------------------------------------------------- Mobile
  ajout('mobile', m.viewport && /width\s*=\s*device-width/i.test(m.viewport) ? OK : KO, 'Page adaptée aux écrans de téléphone', m.viewport ? 'Balise viewport présente.' : 'Pas de balise viewport : le téléphone affiche une version ordinateur réduite.', { poids: 3,
    phrase: !m.viewport ? 'Le site n’est pas conçu pour les téléphones : le patient doit zoomer pour lire.' : null });
  ajout('mobile', m.debordement <= 2 ? OK : KO, 'Pas de défilement horizontal', m.debordement <= 2 ? 'La page tient dans la largeur de l’écran.' : `La page dépasse de ${m.debordement} px : le patient peut la faire glisser de côté.`, { poids: 2,
    phrase: m.debordement > 2 ? 'Sur téléphone, la page déborde sur le côté et « glisse » sous le doigt.' : null });
  const partPetit = m.texteTotal ? m.textePetit / m.texteTotal : 0;
  ajout('mobile', partPetit <= 0.05 ? OK : partPetit <= 0.2 ? MOY : KO, 'Taille du texte', `${Math.round(partPetit * 100)} % du texte fait moins de 12 px sur téléphone.`, { poids: 2,
    phrase: partPetit > 0.2 ? `Sur téléphone, ${Math.round(partPetit * 100)} % du texte est écrit en très petit (moins de 12 px).` : null });
  ajout('mobile', m.nbPetitesCibles === 0 ? OK : m.nbPetitesCibles <= 4 ? MOY : KO, 'Boutons et liens faciles à toucher', m.nbPetitesCibles ? `${m.nbPetitesCibles} élément(s) cliquable(s) de moins de 24 px (ex. : ${m.petitesCibles.slice(0, 3).map((t) => `« ${t} »`).join(', ')}).` : 'Toutes les zones cliquables font au moins 24 px.');
  const telLien = liens.some((l) => l.href.startsWith('tel:'));
  ajout('mobile', telLien ? OK : KO, 'Appel en un geste', telLien ? 'Le numéro est cliquable : un toucher lance l’appel.' : 'Le numéro n’est pas cliquable : le patient doit le recopier.', { poids: 2,
    phrase: !telLien ? 'Sur téléphone, le numéro du cabinet n’est pas cliquable : le patient doit le recopier pour appeler.' : null });

  // ---------------------------------------------------------------- Accessibilité
  const axe = d.mobile.axe || [];
  const contraste = axe.find((v) => v.id === 'color-contrast');
  ajout('accessibilite', !contraste ? OK : contraste.noeuds <= 3 ? MOY : KO, 'Contraste des textes', contraste ? `${contraste.noeuds} texte(s) sous le contraste minimal de 4,5:1 (WCAG AA).` : 'Tous les textes testés respectent le contraste minimal.', { poids: 3,
    phrase: contraste && contraste.noeuds > 3 ? `${contraste.noeuds} textes ont un contraste insuffisant : difficiles à lire pour une personne âgée ou malvoyante.` : null });
  const altKo = axe.find((v) => v.id === 'image-alt');
  ajout('accessibilite', !altKo ? OK : altKo.noeuds <= 2 ? MOY : KO, 'Description des images', altKo ? `${altKo.noeuds} image(s) sans texte alternatif (lu par les lecteurs d’écran, et par Google).` : 'Les images ont un texte alternatif.', { poids: 2 });
  ajout('accessibilite', m.langue ? OK : KO, 'Langue de la page déclarée', m.langue ? `lang="${m.langue}"` : 'Langue non déclarée : les lecteurs d’écran prononcent mal le texte.');
  const nomsLiens = axe.find((v) => v.id === 'link-name' || v.id === 'button-name');
  ajout('accessibilite', !nomsLiens ? OK : MOY, 'Liens et boutons nommés', nomsLiens ? `${nomsLiens.noeuds} lien(s) ou bouton(s) sans intitulé (souvent des icônes).` : 'Tous les liens ont un intitulé.');
  const autres = axe.filter((v) => !['color-contrast', 'image-alt', 'link-name', 'button-name', 'html-has-lang'].includes(v.id));
  const graves = autres.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  ajout('accessibilite', graves.length === 0 ? (autres.length ? MOY : OK) : graves.reduce((n, v) => n + v.noeuds, 0) <= 2 ? MOY : KO, 'Autres critères WCAG', autres.length ? `${autres.length} autre(s) point(s) relevé(s) : ${autres.slice(0, 4).map((v) => v.aide).join(' ; ')}.` : 'Aucun autre point relevé par le test automatique.', { poids: 2 });

  // ---------------------------------------------------------------- Google
  const titre = m.titre || '';
  ajout('google', titre.length >= 25 && titre.length <= 65 ? OK : titre ? MOY : KO, 'Titre de la page', titre ? `« ${titre} » (${titre.length} caractères ; idéal : 30 à 65).` : 'Aucun titre.', { poids: 2 });
  const prof = /p[ée]dicure|podolog|kin[ée]|ost[ée]o|orthophon|sage[\s-]femme|infirmi|dentist|m[ée]decin|psycholog|di[ée]t[ée]ti/i;
  // ville : adresse du JSON-LD, sinon ville après un code postal, sinon un mot du titre présent dans le nom de domaine
  const sansAccent = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ'’\- ]/g, '');
  const localite = aplatirJsonld(m.jsonld).map((n) => n.address?.addressLocality || n.location?.address?.addressLocality).find(Boolean);
  const motTitreDomaine = titre.match(/\p{Lu}[\p{L}'’-]{3,}/gu)?.find((w) => sansAccent(d.hote).includes(sansAccent(w)) && !/podolog|cabinet|p[ée]dicure/i.test(w));
  const villeTrouvee = localite || (texte.match(RE_CP) || [])[1]?.trim().split(/\s{2,}|\n/)[0] || motTitreDomaine;
  const villeDansTitre = villeTrouvee && titre.toLowerCase().includes(villeTrouvee.toLowerCase().split(' ')[0]);
  ajout('google', prof.test(titre) && villeDansTitre ? OK : prof.test(titre) || villeDansTitre ? MOY : KO, 'Profession et ville dans le titre', `${prof.test(titre) ? 'Profession présente' : 'Profession absente'} ; ${villeDansTitre ? 'ville présente' : villeTrouvee ? `ville (${villeTrouvee}) absente` : 'ville absente'}. C’est ce que tapent les patients : « podologue + ville ».`, { poids: 3,
    phrase: !(prof.test(titre) && villeDansTitre) ? 'Le titre de la page ne contient pas « podologue + ville », la recherche que font les patients.' : null });
  ajout('google', m.description && m.description.length >= 70 && m.description.length <= 170 ? OK : m.description ? MOY : KO, 'Description pour Google', m.description ? `${m.description.length} caractères (idéal : 120 à 160).` : 'Absente : Google choisit lui-même un extrait, souvent peu parlant.');
  ajout('google', m.h1.length === 1 ? OK : m.h1.length > 1 ? MOY : KO, 'Titre principal (H1)', m.h1.length ? `${m.h1.length} titre(s) H1 : « ${m.h1[0].slice(0, 80)} ».` : 'Aucun titre H1.');
  const noindex = !preparation && (/noindex/i.test(m.robotsMeta || '') || /noindex/i.test(d.acces.entetes['x-robots-tag'] || ''));
  ajout('google', noindex ? KO : OK, 'Page indexable', preparation ? 'Fermée aux moteurs tant que le site n’est pas publié ; ouverte à Google dès la publication.' : noindex ? 'La page demande à Google de ne PAS l’indexer (noindex).' : 'Google est autorisé à indexer la page.', { poids: 3, phrase: noindex ? 'La page d’accueil demande à Google de ne pas l’afficher dans les résultats.' : null });
  ajout('google', d.sitemap ? OK : MOY, 'Plan du site (sitemap)', d.sitemap ? `${d.sitemap.urls} page(s) déclarée(s).` : 'Aucun sitemap.xml trouvé.');
  ajout('google', d.robots.present ? OK : MOY, 'Fichier robots.txt', d.robots.present ? 'Présent.' : 'Absent.', { poids: 0.5 });
  ajout('google', m.canonique ? OK : MOY, 'Adresse canonique', m.canonique ? 'Déclarée.' : 'Non déclarée (risque de doublons www / sans www).', { poids: 0.5 });
  ajout('google', d.liensInternes.casses.length === 0 ? OK : KO, 'Liens cassés', d.liensInternes.casses.length ? `${d.liensInternes.casses.length} lien(s) interne(s) mènent à une erreur.` : `Aucun lien cassé parmi ${Math.min(d.liensInternes.total, 20)} testés.`);
  ajout('google', m.og.titre && m.og.image ? OK : MOY, 'Aperçu au partage (réseaux, SMS)', m.og.image ? 'Image et titre de partage définis.' : 'Pas d’image de partage : le lien s’affiche sans visuel.', { poids: 0.5 });

  // ---------------------------------------------------------------- IA
  const jl = aplatirJsonld(m.jsonld);
  const local = jl.find((n) => TYPES_LOCAUX.test([].concat(n['@type']).join(' ')));
  ajout('ia', local ? OK : KO, 'Fiche d’identité structurée (schema.org)', local ? `Type ${[].concat(local['@type']).join(', ')} déclaré.` : jl.length ? `Données structurées présentes (${[...new Set(jl.map((n) => [].concat(n['@type']).join(',')))].slice(0, 3).join(', ')}) mais pas de fiche de cabinet médical.` : 'Aucune donnée structurée : les IA doivent deviner qui vous êtes.', { poids: 3,
    phrase: !local ? 'Le site ne fournit pas de « fiche d’identité » lisible par les IA (ChatGPT, Gemini…) : profession, adresse, horaires.' : null });
  if (local) {
    const champs = [['address', 'adresse'], ['telephone', 'téléphone'], ['openingHoursSpecification', 'horaires'], ['geo', 'coordonnées GPS']].map(([k, n]) => [n, !!(local[k] || (k === 'openingHoursSpecification' && local.openingHours))]);
    const manquants = champs.filter(([, v]) => !v).map(([n]) => n);
    ajout('ia', manquants.length === 0 ? OK : manquants.length <= 2 ? MOY : KO, 'Fiche complète', manquants.length ? `Manque : ${manquants.join(', ')}.` : 'Adresse, téléphone, horaires et coordonnées présents.', { poids: 2 });
  }
  if (preparation) {
    ajout('ia', OK, 'Accès autorisé aux IA qui citent leurs sources', 'Fermé tant que le site n’est pas publié ; à la publication, ChatGPT, Perplexity, Claude, Google et Bing sont autorisés à le lire et à le citer.', { poids: 3 });
  } else if (d.robots.present) {
    const citation = ROBOTS_IA.filter((r) => r.role === 'citation' && d.robots.bloques[r.ua]);
    const entrainement = ROBOTS_IA.filter((r) => r.role === 'entrainement' && d.robots.bloques[r.ua]);
    ajout('ia', citation.length === 0 ? OK : KO, 'Accès autorisé aux IA qui citent leurs sources', citation.length ? `Bloqués dans robots.txt : ${citation.map((r) => r.nom).join(', ')}.` : 'ChatGPT, Perplexity, Claude, Google et Bing peuvent lire et citer le site.', { poids: 3,
      phrase: citation.length ? `Le site interdit l’accès à ${citation.map((r) => r.nom).join(', ')} : ces outils ne peuvent pas le recommander.` : null });
    if (entrainement.length) ajout('ia', OK, 'Refus de l’entraînement des IA', `Refusé à : ${entrainement.map((r) => r.nom).join(', ')}. C’est un choix légitime, sans effet sur les citations.`, { poids: 0.5 });
  } else ajout('ia', OK, 'Accès autorisé aux IA qui citent leurs sources', 'Pas de robots.txt : aucun robot n’est bloqué.', { poids: 3 });
  if (!preparation) ajout('ia', d.robotChatgpt.statut >= 200 && d.robotChatgpt.statut < 400 ? OK : KO, 'Le serveur répond au robot de ChatGPT', d.robotChatgpt.statut >= 200 && d.robotChatgpt.statut < 400 ? `Réponse ${d.robotChatgpt.statut} au robot de recherche de ChatGPT.` : `Le serveur refuse le robot de recherche de ChatGPT (code ${d.robotChatgpt.statut}).`, { poids: 2 });
  const ratio = m.mots ? d.brut.mots / m.mots : 0;
  ajout('ia', ratio >= 0.6 ? OK : ratio >= 0.25 ? MOY : KO, 'Texte lisible sans JavaScript', `${Math.round(Math.min(ratio, 1) * 100)} % du texte est présent dans le code reçu (beaucoup de robots d’IA n’exécutent pas JavaScript).`, { poids: 2,
    phrase: ratio < 0.25 ? 'L’essentiel du texte n’apparaît qu’après exécution de JavaScript : la plupart des robots d’IA voient une page presque vide.' : null });
  ajout('ia', m.mots >= 300 ? OK : m.mots >= 120 ? MOY : KO, 'Contenu suffisant pour être cité', `${m.mots} mots sur la page d’accueil. Les IA citent les pages qui expliquent clairement les soins proposés.`, { poids: 2 });
  const faq = jl.some((n) => /FAQPage/.test([].concat(n['@type']).join(''))) || /questions?\s+fr[ée]quentes|\bFAQ\b/i.test(m.texte);
  ajout('ia', faq ? OK : MOY, 'Questions fréquentes', faq ? 'Présentes.' : 'Aucune : c’est le format que les IA reprennent le plus volontiers (« faut-il une ordonnance ? », « est-ce remboursé ? »).');
  ajout('ia', d.llms.present ? OK : MOY, 'Fichier llms.txt', d.llms.present ? 'Présent.' : 'Absent (nouveau standard, encore facultatif).', { poids: 0.5 });

  // ---------------------------------------------------------------- Confiance
  ajout('confiance', d.acces.https ? OK : KO, 'Connexion sécurisée (HTTPS)', d.acces.https ? 'Le site est servi en HTTPS.' : 'Site non sécurisé : le navigateur affiche « Non sécurisé ».', { poids: 3, phrase: !d.acces.https ? 'Le navigateur affiche « Non sécurisé » à côté de l’adresse du site.' : null });
  ajout('confiance', d.acces.https && (d.acces.httpVersHttps || d.acces.https) ? (d.acces.httpVersHttps ? OK : MOY) : KO, 'Redirection vers HTTPS', d.acces.httpVersHttps ? 'http:// redirige vers https://.' : 'L’adresse en http:// ne redirige pas vers la version sécurisée.', { poids: 0.5 });
  const mentionsOk = d.mentions && d.mentions.statut < 400;
  const hebergeur = mentionsOk && /h[ée]berg/i.test(d.mentions.texte);
  ajout('confiance', mentionsOk ? (hebergeur ? OK : MOY) : KO, 'Mentions légales', mentionsOk ? (hebergeur ? 'Page présente, hébergeur indiqué.' : 'Page présente, mais l’hébergeur n’est pas indiqué (obligatoire, LCEN art. 6).') : 'Aucun lien vers des mentions légales sur la page d’accueil (obligatoires, LCEN art. 6).', { poids: 2,
    phrase: !mentionsOk ? 'La page d’accueil ne donne accès à aucune page de mentions légales, pourtant obligatoires.' : null });
  const confDansMentions = mentionsOk && /donn[ée]es\s+personnelles|RGPD|confidentialit/i.test(d.mentions.texte);
  ajout('confiance', d.confidentialite || confDansMentions ? OK : MOY, 'Politique de confidentialité', d.confidentialite ? 'Présente.' : confDansMentions ? 'Intégrée aux mentions légales.' : 'Non trouvée (RGPD).');
  if (d.cookiesTraceurs.length || d.traceurs.length) {
    ajout('confiance', d.cookiesTraceurs.length ? KO : MOY, 'Cookies avant consentement', d.cookiesTraceurs.length ? `Des cookies de suivi (${d.cookiesTraceurs.slice(0, 4).join(', ')}) sont déposés dès l’arrivée, sans accord du visiteur (RGPD, recommandations CNIL).` : `Outils de suivi chargés (${d.traceurs.join(', ')}) : vérifier le recueil du consentement.`, { poids: 2,
      phrase: d.cookiesTraceurs.length ? 'Des cookies de suivi sont déposés sans l’accord du visiteur, ce que la CNIL sanctionne.' : null });
  } else ajout('confiance', OK, 'Cookies avant consentement', 'Aucun cookie de suivi déposé à l’arrivée.');
  const rpps = /RPPS[^\d]{0,25}\d{11}|\b10\d{9}\b/.test(texte + (d.mentions?.texte || ''));
  ajout('confiance', rpps ? OK : MOY, 'Numéro RPPS affiché', rpps ? 'Présent.' : 'Absent. Il permet au patient de vérifier l’inscription à l’Ordre.');
  const temoignages = RE_TEMOIGNAGES.test(m.texte) || d.mobile.requetes.some((r) => /trustindex|elfsight|widget.*review|reviews-widget/i.test(r.url));
  ajout('confiance', temoignages ? MOY : OK, 'Témoignages de patients', temoignages ? 'Le site affiche des témoignages ou avis : les recommandations de l’Ordre (2023) demandent de ne pas y recourir.' : 'Pas de témoignages affichés (conforme aux recommandations de l’Ordre).', { poids: 1.5 });
  const annees = [...texte.matchAll(/©\s*(?:\d{4}\s*[-–]\s*)?(20\d{2})/g)].map((x) => +x[1]);
  const annee = annees.length ? Math.max(...annees) : null;
  const anFraicheur = d.sitemap?.dernierLastmod ? +d.sitemap.dernierLastmod.slice(0, 4) : annee;
  const ecart = anFraicheur ? new Date().getFullYear() - anFraicheur : null;
  ajout('confiance', ecart === null ? MOY : ecart <= 1 ? OK : ecart <= 3 ? MOY : KO, 'Site tenu à jour', ecart === null ? 'Aucune date de mise à jour visible.' : `Dernière date visible : ${anFraicheur}.`, {
    phrase: ecart !== null && ecart > 3 ? `La dernière date visible sur le site est ${anFraicheur} : il donne l’impression de ne plus être tenu à jour.` : null });

  // ---------------------------------------------------------------- Contact
  ajout('contact', RE_TEL.test(m.texte) ? OK : KO, 'Téléphone visible', RE_TEL.test(m.texte) ? 'Un numéro est affiché.' : 'Aucun numéro de téléphone trouvé sur la page d’accueil.', { poids: 2 });
  const rdv = liens.some((l) => RE_RDV.test(l.href) || /rendez[\s-]vous|\brdv\b/i.test(l.texte)) || d.mobile.mesures.iframes.some((s) => RE_RDV.test(s));
  ajout('contact', rdv ? OK : KO, 'Prise de rendez-vous en ligne', rdv ? 'Lien ou module de prise de rendez-vous présent.' : 'Aucun lien de prise de rendez-vous en ligne.', { poids: 3,
    phrase: !rdv ? 'Le site ne propose pas de prendre rendez-vous en ligne.' : null });
  ajout('contact', RE_ADRESSE.test(m.texte) || RE_CP.test(m.texte) ? OK : KO, 'Adresse du cabinet', RE_ADRESSE.test(m.texte) || RE_CP.test(m.texte) ? 'Adresse affichée.' : 'Adresse introuvable sur la page d’accueil.', { poids: 2 });
  ajout('contact', RE_HORAIRES.test(m.texte) ? OK : MOY, 'Horaires d’ouverture', RE_HORAIRES.test(m.texte) ? 'Horaires affichés.' : 'Horaires non affichés sur la page d’accueil.');
  const plan = m.iframes.some((s) => /google\.[a-z.]+\/maps|openstreetmap|maps\.apple|mapbox/i.test(s)) || liens.some((l) => /google\.[a-z.]+\/maps|maps\.app\.goo|goo\.gl\/maps|openstreetmap|maps\.apple/i.test(l.href));
  ajout('contact', plan ? OK : MOY, 'Plan d’accès', plan ? 'Carte ou lien vers un itinéraire.' : 'Pas de carte ni de lien d’itinéraire.');

  // ---------------------------------------------------------------- Notes
  const themes = THEMES.map((t) => {
    const cs = constats.filter((c) => c.theme === t.id && c.statut !== NM && c.poids > 0);
    const calc = cs.length ? Math.round((100 * cs.reduce((s, c) => s + c.poids * VAL[c.statut], 0)) / cs.reduce((s, c) => s + c.poids, 0)) : null;
    const note = t.id === 'vitesse' && noteVitesse !== null ? Math.round(0.6 * noteVitesse + 0.4 * calc) : calc;
    return { ...t, note, constats: constats.filter((c) => c.theme === t.id) };
  });
  const notees = themes.filter((t) => t.note !== null);
  const globale = Math.round(notees.reduce((s, t) => s + t.poids * t.note, 0) / notees.reduce((s, t) => s + t.poids, 0));
  const marquants = constats.filter((c) => c.phrase && c.statut === KO).sort((a, b) => b.poids - a.poids).slice(0, 5).map((c) => c.phrase);
  const forts = constats.filter((c) => c.statut === OK && c.poids >= 2).slice(0, 4).map((c) => c.titre);
  return { globale, themes, marquants, forts, compte: { ok: constats.filter((c) => c.statut === OK).length, attention: constats.filter((c) => c.statut === MOY).length, echec: constats.filter((c) => c.statut === KO).length } };
}

export const mention = (n) => (n >= 85 ? 'Très bon' : n >= 70 ? 'Bon' : n >= 50 ? 'À améliorer' : 'Insuffisant');
