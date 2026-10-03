// Contrôles avant publication. Reprennent les défauts observés sur les sites webpodologue en production :
// placeholder « [NumOrdre] » publié, n° d'Ordre en double, RPPS affiché comme n° d'Ordre,
// lien Doctolib vers une autre ville, tuiles vides.
import type { SiteDraft } from './draft';
import { verifierTexte, type NiveauConformite } from './lexique';

export type ResultatControle = {
  /** Empêchent la publication */
  bloquants: string[];
  /** Conseils, n'empêchent pas la publication */
  conseils: string[];
};

const PLACEHOLDER = /\[[^\]]{2,30}\]|\bx{3,}\b|\blorem ipsum\b/i;
const sansAccents = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function controlerPublication(d: SiteDraft, niveau: NiveauConformite = 'standard'): ResultatControle {
  const bloquants: string[] = [];
  const conseils: string[] = [];

  // Cabinet
  if (!d.cabinet.ville) bloquants.push('Indiquer la ville du cabinet.');
  if (!d.cabinet.telephone.replace(/\D/g, '')) bloquants.push('Indiquer le téléphone du cabinet.');
  if (d.cabinet.communes.length === 0) conseils.push('Ajouter quelques communes voisines améliore le référencement local.');

  // Lieux
  d.lieux.forEach((l, i) => {
    const n = d.lieux.length > 1 ? ` (lieu ${i + 1})` : '';
    if (!l.adresse || !l.codePostal || !l.ville) bloquants.push(`Compléter l’adresse${n}.`);
    if (d.pays === 'FR' && l.codePostal && !/^\d{5}$/.test(l.codePostal)) bloquants.push(`Code postal invalide${n}.`);
    if (!l.horaires.some((h) => /\d/.test(h.heures))) conseils.push(`Renseigner les horaires${n}.`);
  });

  // Praticiens
  if (d.praticiens.length === 0) bloquants.push('Ajouter au moins un praticien.');
  const numeros = new Map<string, string>();
  d.praticiens.forEach((p, i) => {
    const qui = p.prenom || p.nom ? `${p.prenom} ${p.nom}`.trim() : `praticien ${i + 1}`;
    if (!p.prenom || !p.nom) bloquants.push(`Indiquer le nom et le prénom (${qui}).`);
    if (d.pays === 'FR') {
      const ordre = p.numeroOrdre.replace(/\s/g, '');
      if (!ordre) bloquants.push(`Indiquer le n° d’inscription au tableau de l’Ordre (${qui}).`);
      else if (/^\d{11}$/.test(ordre)) bloquants.push(`Le numéro saisi comme n° d’Ordre ressemble à un RPPS (11 chiffres) (${qui}).`);
      else if (!/^\d{9}$/.test(ordre)) bloquants.push(`Le n° d’inscription à l’Ordre doit compter 9 chiffres (${qui}).`);
      if (p.rpps && !/^\d{11}$/.test(p.rpps.replace(/\s/g, ''))) bloquants.push(`Le RPPS doit compter 11 chiffres (${qui}).`);
      if (ordre) {
        if (numeros.has(ordre)) bloquants.push(`Le même n° d’Ordre est saisi pour ${numeros.get(ordre)} et ${qui}.`);
        numeros.set(ordre, qui);
      }
    }
    if (d.pays === 'BE' && !/^\d-\d{5}-\d{2}-\d{3}$/.test(p.inami.trim())) {
      bloquants.push(`Indiquer le n° INAMI au format 5-XXXXX-XX-XXX (${qui}).`);
    }
    if (d.pays === 'CH' && !p.membreSsp && !p.rcc) conseils.push(`Indiquer l’appartenance à la SSP ou le n° RCC (${qui}).`);
    if (!p.diplome) conseils.push(`Ajouter le diplôme et l’école renforce la confiance (${qui}).`);
  });

  // Rendez-vous
  if (d.rdv.mode !== 'telephone') {
    const url = d.rdv.url || d.praticiens.find((p) => p.rdvUrl)?.rdvUrl || '';
    if (!/^https:\/\/\S+\.\S+/.test(url)) bloquants.push('Indiquer un lien de prise de rendez-vous valide (https://…).');
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
  if (d.soins.length === 0) bloquants.push('Choisir au moins une compétence.');

  // Photos
  if (!d.photos.accueil) conseils.push('Ajouter une photo du cabinet : un site avec de vraies photos inspire davantage confiance.');

  // Domicile
  if (d.domicile.actif && d.domicile.secteurs.length === 0) conseils.push('Préciser les secteurs des visites à domicile, sinon la mention sera générale.');

  // Textes libres : placeholders et lexique
  const textes: [string, string][] = [
    ['Nom du cabinet', d.cabinet.nom],
    ['Message important', d.message.texte],
    ['Conventionnement', d.conventionnement],
    ...d.praticiens.flatMap((p): [string, string][] => [[`Présentation de ${p.prenom || 'praticien'}`, p.bio]]),
  ];
  for (const [champ, texte] of textes) {
    if (!texte) continue;
    if (PLACEHOLDER.test(texte)) bloquants.push(`Texte provisoire à remplacer dans « ${champ} ».`);
    for (const a of verifierTexte(texte, niveau)) {
      const msg = `« ${a.extrait} » dans « ${champ} » : ${a.raison}${a.suggestion ? ` (préférer « ${a.suggestion} »)` : ''}.`;
      (a.bloquante ? bloquants : conseils).push(msg);
    }
  }

  return { bloquants: [...new Set(bloquants)], conseils: [...new Set(conseils)] };
}
