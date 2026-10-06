// Contrôles avant publication. Reprennent les défauts observés sur les sites webpodologue en production :
// placeholder « [NumOrdre] » publié, n° d'Ordre en double, RPPS affiché comme n° d'Ordre,
// lien Doctolib vers une autre ville, tuiles vides.
//
// Règle de Paul (2026-10-05) : plus RIEN n'empêche de créer ni de publier un site. Chaque information manquante est un
// avertissement (conseil, affiché en ambre à la saisie) qui dit ce que le site affichera à la place ; le site publié
// affiche un repli sobre (replis.ts, appliqué au chargement des données dans apps/sites/src/lib/supabase.ts).
import type { SiteDraft } from './draft';
import { verifierTexte, type NiveauConformite } from './lexique';
import { EQUIPEMENTS } from './equipements';
import { REPLIS, TEXTE_PROVISOIRE, adresseUtilisable, telephoneUtilisable } from './replis';
import { lienRdvPrecis } from './format';
import { avertissementsHoraires, avertissementsNoteHoraires, horairesRenseignes } from './horaires';

export type ResultatControle = {
  /**
   * Empêcheraient la publication. Toujours VIDE aujourd'hui : chaque manque a un repli sur le site. Le champ est gardé
   * pour un cas réellement impossible techniquement (aucun n'est connu) et pour la compatibilité des tests ; aucun écran
   * de l'admin ne le lit plus (audit du 2026-10-05).
   * @deprecated Toujours vide : utiliser `remplacements` (informations manquantes) et `conseils`.
   */
  bloquants: string[];
  /** Conseils, n'empêchent pas la publication (inclut les remplacements) */
  conseils: string[];
  /**
   * Informations manquantes remplacées par une mention de repli sur le site (sous-ensemble des conseils) : listées dans
   * la confirmation « Publier quand même » et dans les points « à compléter » du tableau de bord.
   */
  remplacements: string[];
};

const PLACEHOLDER = TEXTE_PROVISOIRE;
const sansAccents = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Numéros visiblement fictifs (exemples, suites, chiffres répétés) : jamais publiés.
export const numeroFictif = (n: string) => /^(\d)\1+$/.test(n.slice(1)) || '0123456789012'.includes(n) || '9876543210'.includes(n);
// Clé de Luhn (dernier chiffre du RPPS)
const luhn = (n: string) => [...n].reverse().reduce((t, c, k) => { let x = Number(c) * (k % 2 ? 2 : 1); if (x > 9) x -= 9; return t + x; }, 0) % 10 === 0;
/** N° d'Ordre affichable sur le site : 9 chiffres, non fictif ; sinon '' (la mention est omise). */
export const numeroOrdreAffichable = (n: string) => { const v = n.replace(/\s/g, ''); return /^\d{9}$/.test(v) && !numeroFictif(v) ? v : ''; };
/** RPPS affichable sur le site : 11 chiffres, non fictif ; sinon ''. */
export const rppsAffichable = (n: string) => { const v = n.replace(/\s/g, ''); return /^\d{11}$/.test(v) && !numeroFictif(v) ? v : ''; };

export function controlerPublication(d: SiteDraft, niveau: NiveauConformite = 'standard'): ResultatControle {
  // Aucun bloquant : voir ResultatControle. Les remplacements sont aussi des conseils (repris à la fin).
  const bloquants: string[] = [];
  const conseils: string[] = [];
  const remplacements: string[] = [];
  const remplace = (m: string) => remplacements.push(m);

  // Rendez-vous effectif (même règle que le site : lien précis vers la page du praticien sur la plateforme)
  const lienRdv = d.rdv.url || d.praticiens.find((p) => p.rdvUrl)?.rdvUrl || '';
  const rdvEnLigne = d.rdv.mode !== 'telephone' && lienRdvPrecis(lienRdv);
  const telephone = telephoneUtilisable(d.cabinet.telephone);
  const email = /^\S+@\S+\.\S+$/.test(d.cabinet.email ?? '');

  // Cabinet
  if (!d.cabinet.ville.trim()) {
    if (d.lieux[0]?.ville.trim()) conseils.push(`Ville du cabinet non renseignée : le site reprendra la ville de l’adresse (${d.lieux[0].ville.trim()}).`);
    else remplace('Ville non renseignée : le site ne mentionnera aucune ville dans ses titres (« Cabinet de pédicurie-podologie » au lieu de « … à Lyon »).');
  }
  if (!telephone) {
    remplace(d.cabinet.telephone.replace(/\D/g, '')
      ? 'Téléphone incomplet : il ne sera pas affiché et le site n’aura pas de bouton « Appeler ».'
      : `Téléphone non renseigné : le site n’aura pas de bouton « Appeler »${rdvEnLigne ? ' ; le rendez-vous en ligne devient l’action principale' : email ? ' ; les patients seront invités à écrire au cabinet par e-mail' : ` ; le site indiquera « ${REPLIS.rdvCabinet} »`}.`);
  }
  if (!d.cabinet.nom.trim() && !d.lieux[0]?.nom.trim() && !d.praticiens.some((p) => p.nom.trim())) {
    remplace(`Nom du cabinet non renseigné : le site s’intitulera « ${REPLIS.nomCabinet} ».`);
  }
  if (d.cabinet.communes.length === 0) conseils.push('Ajouter quelques communes voisines améliore le référencement local.');

  // Lieux
  d.lieux.forEach((l, i) => {
    const n = d.lieux.length > 1 ? ` (lieu ${i + 1})` : '';
    const repli = `le site indiquera « ${REPLIS.adresse} », sans plan ni itinéraire`;
    if (!l.adresse.trim() || !l.codePostal.trim() || !l.ville.trim()) {
      const manque = [!l.adresse.trim() && 'rue', !l.codePostal.trim() && 'code postal', !l.ville.trim() && 'ville'].filter(Boolean).join(', ');
      remplace(`Adresse incomplète${n} (${manque}) : ${repli}.`);
    } else if (!adresseUtilisable(l, d.pays)) {
      remplace(`Code postal invalide${n} : ${repli}.`);
    }
    if (!horairesRenseignes(l.horaires)) remplace(`Horaires non renseignés${n} : le site indiquera « ${REPLIS.horaires} ».`);
    // Plages incohérentes et note des horaires : avertissements ambre, jamais bloquants (horaires.ts).
    conseils.push(...avertissementsHoraires(l.horaires, n.trim()), ...avertissementsNoteHoraires(l.noteHoraires ?? '').map((a) => (n ? a.replace('Note des horaires', `Note des horaires${n}`) : a)));
  });

  // Praticiens
  if (d.praticiens.length === 0 || !d.praticiens.some((p) => p.nom.trim())) {
    remplace(`Aucun praticien nommé : le site présentera le cabinet (« ${REPLIS.equipe} »), sans nom de praticien.`);
  }
  const numeros = new Map<string, string>();
  d.praticiens.forEach((p, i) => {
    const qui = p.prenom || p.nom ? `${p.prenom} ${p.nom}`.trim() : `praticien ${i + 1}`;
    if (!p.nom.trim() && p.prenom.trim()) remplace(`Nom de famille non renseigné (${qui}) : ce praticien ne sera pas présenté nommément sur le site.`);
    else if (p.nom.trim() && !p.prenom.trim()) conseils.push(`Prénom non renseigné (${qui}) : le site affichera seulement le nom.`);
    if (d.pays === 'FR') {
      // N° d'Ordre et RPPS : avertissements seulement, la création et la publication ne sont jamais bloquées (règle de
      // Paul, 2026-10-05). Un numéro manquant ou mal formé n'est simplement pas affiché sur le site (numeroOrdreAffichable).
      const ordre = p.numeroOrdre.replace(/\s/g, '');
      if (!ordre) conseils.push(`Indiquer le n° d’inscription au tableau de l’Ordre : la mention est attendue sur le site (${qui}).`);
      else if (/^\d{11}$/.test(ordre)) conseils.push(`Le numéro saisi comme n° d’Ordre ressemble à un RPPS (11 chiffres) : il ne sera pas affiché (${qui}).`);
      else if (!/^\d{9}$/.test(ordre)) conseils.push(`Le n° d’inscription à l’Ordre compte normalement 9 chiffres : il ne sera pas affiché (${qui}).`);
      else if (numeroFictif(ordre)) conseils.push(`Le n° d’Ordre semble fictif : il ne sera pas affiché (${qui}).`);
      const rpps = p.rpps.replace(/\s/g, '');
      if (rpps && !/^\d{11}$/.test(rpps)) conseils.push(`Le RPPS compte normalement 11 chiffres : il ne sera pas affiché (${qui}).`);
      else if (rpps && numeroFictif(rpps)) conseils.push(`Le RPPS semble fictif : il ne sera pas affiché (${qui}).`);
      else if (rpps && !luhn(rpps)) conseils.push(`Vérifier le RPPS sur l’annuaire santé : sa clé de contrôle ne correspond pas (${qui}).`);
      if (ordre) {
        if (numeros.has(ordre)) conseils.push(`Le même n° d’Ordre est saisi pour ${numeros.get(ordre)} et ${qui}.`);
        numeros.set(ordre, qui);
      }
    }
    if (d.pays === 'BE' && !/^\d-\d{5}-\d{2}-\d{3}$/.test(p.inami.trim())) {
      remplace(`N° INAMI ${p.inami.trim() ? 'mal formé (format 5-XXXXX-XX-XXX)' : 'non renseigné'} (${qui}) : la mention sera omise sur le site.`);
    }
    if (d.pays === 'CH' && !p.membreSsp && !p.rcc) conseils.push(`Indiquer l’appartenance à la SSP ou le n° RCC (${qui}).`);
    if (!p.diplome) conseils.push(`Ajouter le diplôme et l’école renforce la confiance (${qui}).`);
  });

  // Rendez-vous
  if (d.rdv.mode !== 'telephone') {
    const url = lienRdv;
    const vers = telephone ? 'au téléphone du cabinet' : email ? 'à l’e-mail du cabinet' : `à la rubrique contact (« ${REPLIS.rdvCabinet} »)`;
    if (!/^https:\/\/\S+\.\S+/.test(url)) remplace(`Lien de prise de rendez-vous ${url.trim() ? 'invalide (https://…)' : 'non renseigné'} : le bouton « Prendre rendez-vous » mènera ${vers}.`);
    // Lien vers la page d'accueil de la plateforme (doctolib.fr seul) : le patient ne trouverait pas le praticien.
    else if (!rdvEnLigne) remplace(`Le lien de rendez-vous mène à l’accueil de la plateforme, pas à la page du praticien : il ne sera pas utilisé, le bouton mènera ${vers}.`);
    // Lien Doctolib qui pointe vers une autre ville que le cabinet.
    const liens = [d.rdv.url, ...d.praticiens.map((p) => p.rdvUrl)].filter(Boolean);
    for (const lien of liens) {
      const m = /doctolib\.fr\/[^/]+\/([^/?#]+)/.exec(lien);
      const villes = d.lieux.map((l) => sansAccents(l.ville).replace(/\s+/g, '-'));
      if (m && villes.length && !villes.some((v) => v && m[1].includes(v.split('-')[0]))) {
        conseils.push(`Le lien Doctolib mentionne « ${m[1]} » : vérifier qu’il correspond bien au cabinet.`);
      }
    }
  }

  // Compétences
  if (d.soins.length === 0) {
    remplace('Aucune compétence choisie : le site présentera les soins courants de la spécialité choisie (bilan podologique, soins de pédicurie, semelles…).');
  }

  // Photos
  if (!d.photos.accueil) conseils.push('Ajouter une photo du cabinet : un site avec de vraies photos inspire davantage confiance.');

  // Domicile
  if (d.domicile.actif && d.domicile.secteurs.length === 0) conseils.push('Préciser les secteurs des visites à domicile, sinon la mention sera générale.');

  // Matériel et hygiène (non bloquant) : les patients regardent d'abord la stérilisation.
  const hygiene = EQUIPEMENTS.filter((e) => e.categorie === 'hygiene').map((e) => e.id);
  if (!(d.equipements ?? []).some((id) => hygiene.includes(id))) {
    conseils.push('Matériel et hygiène : cocher le matériel de stérilisation et d’hygiène réellement présent au cabinet (autoclave, sachets individuels, usage unique…).');
  }

  // Textes libres : placeholders et lexique
  const textes: [string, string][] = [
    ['Nom du cabinet', d.cabinet.nom],
    ['Message important', d.message.texte],
    ['Conventionnement', d.conventionnement],
    ['Autre matériel', d.equipementsAutres ?? ''],
    ...d.praticiens.flatMap((p): [string, string][] => [[`Présentation de ${p.prenom || 'praticien'}`, p.bio]]),
  ];
  for (const [champ, texte] of textes) {
    if (!texte) continue;
    if (PLACEHOLDER.test(texte)) remplace(`Texte provisoire dans « ${champ} » : le passage concerné ne sera pas publié.`);
    // Lexique : en niveau « strict », les alertes restent des avertissements (la publication n'est plus bloquée).
    for (const a of verifierTexte(texte, niveau)) {
      conseils.push(`« ${a.extrait} » dans « ${champ} » : ${a.raison}${a.suggestion ? ` (préférer « ${a.suggestion} »)` : ''}.`);
    }
  }

  const r = [...new Set(remplacements)];
  return { bloquants: [...new Set(bloquants)], conseils: [...new Set([...r, ...conseils])], remplacements: r };
}
