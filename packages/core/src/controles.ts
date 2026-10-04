// Contrôles avant publication. Reprennent les défauts observés sur les sites webpodologue en production :
// placeholder « [NumOrdre] » publié, n° d'Ordre en double, RPPS affiché comme n° d'Ordre,
// lien Doctolib vers une autre ville, tuiles vides.
import type { SiteDraft } from './draft';
import { verifierTexte, type NiveauConformite } from './lexique';
import { EQUIPEMENTS } from './equipements';

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
  // Numéros visiblement fictifs (exemples, suites, chiffres répétés) : jamais publiés.
  const fictif = (n: string) => /^(\d)\1+$/.test(n.slice(1)) || '0123456789012'.includes(n) || '9876543210'.includes(n);
  // Clé de Luhn (dernier chiffre du RPPS)
  const luhn = (n: string) => [...n].reverse().reduce((t, c, k) => { let x = Number(c) * (k % 2 ? 2 : 1); if (x > 9) x -= 9; return t + x; }, 0) % 10 === 0;
  d.praticiens.forEach((p, i) => {
    const qui = p.prenom || p.nom ? `${p.prenom} ${p.nom}`.trim() : `praticien ${i + 1}`;
    if (!p.prenom || !p.nom) bloquants.push(`Indiquer le nom et le prénom (${qui}).`);
    if (d.pays === 'FR') {
      const ordre = p.numeroOrdre.replace(/\s/g, '');
      if (!ordre) bloquants.push(`Indiquer le n° d’inscription au tableau de l’Ordre (${qui}).`);
      else if (/^\d{11}$/.test(ordre)) bloquants.push(`Le numéro saisi comme n° d’Ordre ressemble à un RPPS (11 chiffres) (${qui}).`);
      else if (!/^\d{9}$/.test(ordre)) bloquants.push(`Le n° d’inscription à l’Ordre doit compter 9 chiffres (${qui}).`);
      else if (fictif(ordre)) bloquants.push(`Le n° d’Ordre semble fictif : saisir le vrai numéro (${qui}).`);
      const rpps = p.rpps.replace(/\s/g, '');
      if (rpps && !/^\d{11}$/.test(rpps)) bloquants.push(`Le RPPS doit compter 11 chiffres (${qui}).`);
      else if (rpps && fictif(rpps)) bloquants.push(`Le RPPS semble fictif : saisir le vrai numéro (${qui}).`);
      else if (rpps && !luhn(rpps)) conseils.push(`Vérifier le RPPS sur l’annuaire santé : sa clé de contrôle ne correspond pas (${qui}).`);
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
    // Lien vers la page d'accueil de la plateforme (doctolib.fr seul) : le patient ne trouverait pas le praticien.
    else if (/^https:\/\/[^/]+\/?$/.test(url.trim())) bloquants.push('Le lien de rendez-vous doit mener à la page du praticien, pas à l’accueil de la plateforme.');
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
    if (PLACEHOLDER.test(texte)) bloquants.push(`Texte provisoire à remplacer dans « ${champ} ».`);
    for (const a of verifierTexte(texte, niveau)) {
      const msg = `« ${a.extrait} » dans « ${champ} » : ${a.raison}${a.suggestion ? ` (préférer « ${a.suggestion} »)` : ''}.`;
      (a.bloquante ? bloquants : conseils).push(msg);
    }
  }

  return { bloquants: [...new Set(bloquants)], conseils: [...new Set(conseils)] };
}
