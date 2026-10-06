// Phrases du site accordées à la voix choisie (je / nous / 3e personne) et au nombre de praticiens.
import { site } from './site';
import { lieuEnClair, lieuCourt, lienRdvPrecis, REPLIS, aVille, telephoneUtilisable, modeContact, horairesRenseignes, regrouperHoraires, lignesHoraires, mentionsHoraires, libelleJours as libelleJoursCore, type Horaire } from '@plateforme/core';

const enListe = (mots: string[]) =>
  mots.length > 1 ? `${mots.slice(0, -1).join(', ')} et ${mots.at(-1)}` : mots[0] ?? '';

export const praticiens = site.praticiens;
export const pluriel = praticiens.length > 1;
/** Noms des praticiens présentés ; sans praticien nommé : le nom du cabinet (replis.ts, jamais de nom vide). */
export const noms = enListe(praticiens.map((p) => `${p.prenom} ${p.nom}`.trim())) || site.cabinet.nom;
export const lieu = site.lieux[0];
/** « Pédicure-podologue » → « Pédicures-podologues », « Podologue ES » → « Podologues ES ». */
export const metierAuPluriel = (titre: string) =>
  titre
    .split(' ')
    .map((mot, i) => (i === 0 ? mot.split('-').map((m) => `${m}s`).join('-') : mot))
    .join(' ');
export const titreMetierAffiche = pluriel ? metierAuPluriel(site.titreMetier) : site.titreMetier;
export const titreMetierPluriel = titreMetierAffiche.toLowerCase();
/** « à Lyon » ; vide sans ville (jamais de « à » orphelin dans les titres). */
export const aLaVille = aVille(site.cabinet.ville);
/** « … à Lyon » à accoler à un titre (espace compris) ; vide sans ville. */
export const suffixeVille = aLaVille ? ` ${aLaVille}` : '';
export const titreCabinet = `Cabinet de ${site.pays === 'FR' ? 'pédicurie-podologie' : 'podologie'}${suffixeVille}`;

/** Lieu d'exercice en clair : le quartier complète la ville, il ne la remplace jamais (« dans le quartier Claret, à Toulon »). */
export const lieuExercice = lieuEnClair(site.cabinet.quartier, site.cabinet.ville);
/** Version courte des sur-titres et bandeaux : « Toulon, quartier Claret », sinon la ville seule. */
export const localisation = lieuCourt(site.cabinet.quartier, site.cabinet.ville);
const lieuPhrase = lieu.nom ? `à la ${lieu.nom}` : lieuExercice;
const voisines = site.communes.filter((c) => c !== site.cabinet.ville && !site.cabinet.quartier.includes(c)).slice(0, 3);
const proximite = voisines.length ? `${lieuPhrase ? ',' : ''} à proximité de ${enListe(voisines)}` : '';
const ou = `${lieuPhrase ? ` ${lieuPhrase}` : ''}${proximite}`;

/** Phrase d'accueil de la page d'accueil (sans praticien nommé : au nom du cabinet, sans ville : sans « à »). */
export const phraseAccueil = (() => {
  if (!praticiens.length) return `${REPLIS.equipe} accueille les patients${ou}.`;
  if (site.voix === 'je') return `Je vous accueille${ou || ' au cabinet'}.`;
  if (site.voix === 'nous') return `${noms}, ${titreMetierPluriel}, vous accueillent${ou}.`;
  return `${noms}, ${titreMetierPluriel}, accueille${pluriel ? 'nt' : ''} ${pluriel ? 'leurs' : 'ses'} patients${ou}.`;
})();

/** « Nos compétences » / « Mes compétences » / « Les compétences du cabinet ». */
export const titreCompetences = site.voix === 'je' ? 'Mes compétences' : site.voix === 'nous' ? 'Nos compétences' : 'Compétences du cabinet';

export const titrePraticiens = pluriel ? 'Les praticiens' : site.voix === 'je' ? 'Votre praticien' : 'Le praticien';

/** Téléphone publiable (sinon : pas de bouton « Appeler », pas de lien « tel: » vide). */
export const aTelephone = telephoneUtilisable(site.cabinet.telephone);
export const telLien = aTelephone ? `tel:${site.cabinet.telephone.replace(/[^\d+]/g, '').replace(/^0(?=\d{9}$)/, site.pays === 'FR' ? '+33' : site.pays === 'BE' ? '+32' : '+41')}` : '';

/** Adresse complète du lieu (le chargement vide une adresse incomplète : rien d'inventé, voir assemblerSite). */
export const aAdresse = Boolean(lieu.adresse && lieu.codePostal && lieu.ville);
/** Adresse sur une ligne ; sans adresse : « Adresse communiquée à la prise de rendez-vous ». */
export const adresseLieu = aAdresse ? `${lieu.adresse}, ${lieu.codePostal} ${lieu.ville}` : REPLIS.adresse;
/** Lien d'itinéraire ; vide sans adresse (pas de carte ni d'itinéraire). */
export const itineraire = aAdresse ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lieu.nom ? `${lieu.nom}, ` : ''}${adresseLieu}`)}` : '';
/** Horaires renseignés ; sinon les gabarits affichent « Sur rendez-vous ». */
export const horairesConnus = horairesRenseignes(lieu.horaires);
export const REPLI_HORAIRES = REPLIS.horaires;
/** Mentions sous les horaires du lieu : « Sur rendez-vous uniquement », note courte (« Fermé en août »). */
export const mentionsHorairesLieu = mentionsHoraires(lieu);
/** Sans horaires : « Sur rendez-vous » (ou « Sur rendez-vous uniquement » si le praticien l'a coché). */
export const repliHorairesLieu = lieu.surRendezVous ? 'Sur rendez-vous uniquement' : REPLIS.horaires;

/**
 * Lignes du tableau des horaires : jours consécutifs aux plages identiques réunis (« Lundi au mercredi »), plages en
 * liste, numéros des jours JavaScript (dimanche = 0, séparés par des espaces) pour repérer « aujourd'hui » côté navigateur.
 */
export const semaineDe = (horaires: Horaire[]) =>
  regrouperHoraires(horaires).map((g) => ({ jour: libelleJoursCore(g.jours), plages: g.ouvert ? g.texte.split(', ') : [], numero: g.numeros }));

/**
 * Réservation en ligne : seulement si le lien mène à une page précise de la plateforme. Un lien vers son
 * accueil (« https://www.doctolib.com ») ferait perdre le patient : les boutons passent alors sur « Appeler ».
 */
export const rdvEnLigne = site.rdvMode !== 'telephone' && lienRdvPrecis(site.rdv.url || site.praticiens.find((p) => p.rdvUrl)?.rdvUrl);

/** Mention discrète de la plateforme sur les boutons qui quittent le site (« via Doctolib »). */
export const viaPlateforme = rdvEnLigne && site.rdv.plateforme ? `via ${site.rdv.plateforme}` : '';

/** Prise de rendez-vous effective : en ligne, téléphone, e-mail, sinon au cabinet (replis.ts). */
export const contactRdv = modeContact({ rdvEnLigne, telephone: site.cabinet.telephone, email: site.cabinet.email });
/** Ni lien en ligne ni téléphone : e-mail du cabinet, sinon la rubrique « Prise de rendez-vous » des infos pratiques. */
export const lienContact = contactRdv === 'email' ? `mailto:${site.cabinet.email}` : '/acces#rdv';

/** Lien de prise de RDV : compteur /rdv si en ligne, sinon appel téléphonique, sinon contact. */
export const lienRdv = (source: string, praticien?: number) =>
  rdvEnLigne ? `/rdv?src=${encodeURIComponent(source)}${praticien !== undefined ? `&p=${praticien}` : ''}` : aTelephone ? telLien : lienContact;

export const libelleRdv = rdvEnLigne ? 'Prendre rendez-vous' : aTelephone ? 'Appeler pour un rendez-vous' : contactRdv === 'email' ? 'Écrire au cabinet' : REPLIS.rdvCabinet;
/** Libellé court du bouton principal hors ligne (« Appeler le cabinet », « Écrire au cabinet », « Prise de rendez-vous au cabinet »). */
export const libelleContact = aTelephone ? 'Appeler le cabinet' : contactRdv === 'email' ? 'Écrire au cabinet' : REPLIS.rdvCabinet;
/** Phrase « Rendez-vous » des bandeaux : en ligne, par téléphone, par e-mail ou au cabinet. */
export const phraseRdv = rdvEnLigne
  ? `En ligne sur ${site.rdv.plateforme}, 24h/24`
  : aTelephone ? `Par téléphone au ${site.cabinet.telephone}` : contactRdv === 'email' ? `Par e-mail : ${site.cabinet.email}` : REPLIS.rdvCabinet;

/** Horaires en lignes de texte (« Lundi au vendredi : 9h00–12h00, 14h00–19h00 », « Dimanche : fermé »), puis les mentions. */
export const lignesHorairesLieu = (l: { horaires: Horaire[]; surRendezVous?: boolean; noteHoraires?: string } = lieu) =>
  horairesRenseignes(l.horaires) ? [...lignesHoraires(l.horaires), ...mentionsHoraires(l)] : [l.surRendezVous ? 'Sur rendez-vous uniquement' : REPLIS.horaires, ...mentionsHoraires({ noteHoraires: l.noteHoraires })];

export const TYPES_LIEU: Record<string, string> = {
  cabinet: 'Cabinet',
  maison_sante: 'Maison de santé',
  pole_sante: 'Pôle de santé',
  centre_medical: 'Centre médical',
};
