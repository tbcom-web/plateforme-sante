// Phrases du site accordées à la voix choisie (je / nous / 3e personne) et au nombre de praticiens.
import { site } from './site';

const enListe = (mots: string[]) =>
  mots.length > 1 ? `${mots.slice(0, -1).join(', ')} et ${mots.at(-1)}` : mots[0] ?? '';

export const praticiens = site.praticiens;
export const pluriel = praticiens.length > 1;
export const noms = enListe(praticiens.map((p) => `${p.prenom} ${p.nom}`));
export const lieu = site.lieux[0];
/** « Pédicure-podologue » → « Pédicures-podologues », « Podologue ES » → « Podologues ES ». */
export const metierAuPluriel = (titre: string) =>
  titre
    .split(' ')
    .map((mot, i) => (i === 0 ? mot.split('-').map((m) => `${m}s`).join('-') : mot))
    .join(' ');
export const titreMetierAffiche = pluriel ? metierAuPluriel(site.titreMetier) : site.titreMetier;
export const titreMetierPluriel = titreMetierAffiche.toLowerCase();
export const titreCabinet = `Cabinet de ${site.pays === 'FR' ? 'pédicurie-podologie' : 'podologie'} à ${site.cabinet.ville}`;

const lieuPhrase = lieu.nom ? `à la ${lieu.nom}` : `à ${site.cabinet.quartier || site.cabinet.ville}`;
const voisines = site.communes.filter((c) => c !== site.cabinet.ville && !site.cabinet.quartier.includes(c)).slice(0, 3);
const proximite = voisines.length ? `, à proximité de ${enListe(voisines)}` : '';

/** Phrase d'accueil de la page d'accueil. */
export const phraseAccueil = (() => {
  if (site.voix === 'je') return `Je vous accueille ${lieuPhrase}${proximite}.`;
  if (site.voix === 'nous') return `${noms}, ${titreMetierPluriel}, vous accueillent ${lieuPhrase}${proximite}.`;
  return `${noms}, ${titreMetierPluriel}, accueille${pluriel ? 'nt' : ''} ${pluriel ? 'leurs' : 'ses'} patients ${lieuPhrase}${proximite}.`;
})();

/** « Nos compétences » / « Mes compétences » / « Les compétences du cabinet ». */
export const titreCompetences = site.voix === 'je' ? 'Mes compétences' : site.voix === 'nous' ? 'Nos compétences' : 'Compétences du cabinet';

export const titrePraticiens = pluriel ? 'Les praticiens' : site.voix === 'je' ? 'Votre praticien' : 'Le praticien';

export const telLien = `tel:${site.cabinet.telephone.replace(/[^\d+]/g, '').replace(/^0(?=\d{9}$)/, site.pays === 'FR' ? '+33' : site.pays === 'BE' ? '+32' : '+41')}`;

export const adresseLieu = `${lieu.adresse}, ${lieu.codePostal} ${lieu.ville}`;
export const itineraire = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lieu.nom ? `${lieu.nom}, ` : ''}${adresseLieu}`)}`;

export const rdvEnLigne = site.rdvMode !== 'telephone';

/** Lien de prise de RDV : compteur /rdv si en ligne, sinon appel téléphonique. */
export const lienRdv = (source: string, praticien?: number) =>
  rdvEnLigne ? `/rdv?src=${encodeURIComponent(source)}${praticien !== undefined ? `&p=${praticien}` : ''}` : telLien;

export const libelleRdv = rdvEnLigne ? 'Prendre rendez-vous' : 'Appeler pour un rendez-vous';

/** Regroupe les jours consécutifs aux horaires identiques. */
export const horairesRegroupes = (horaires = lieu.horaires) =>
  horaires.reduce<{ jours: string[]; heures: string }[]>((acc, h) => {
    const dernier = acc.at(-1);
    if (dernier && dernier.heures === h.heures) dernier.jours.push(h.jour);
    else acc.push({ jours: [h.jour], heures: h.heures });
    return acc;
  }, []);

export const libelleJours = (jours: string[]) => (jours.length > 2 ? `${jours[0]} – ${jours.at(-1)}` : jours.join(', '));

export const TYPES_LIEU: Record<string, string> = {
  cabinet: 'Cabinet',
  maison_sante: 'Maison de santé',
  pole_sante: 'Pôle de santé',
  centre_medical: 'Centre médical',
};
