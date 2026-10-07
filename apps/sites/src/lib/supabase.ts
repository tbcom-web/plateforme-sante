// Charge un site praticien depuis Supabase au moment du build et l'assemble en SiteConfig.
// Nécessite SUPABASE_URL et SUPABASE_SECRET_KEY (jamais exposés au navigateur : le site est statique).
import {
  formaterTelephone,
  avecVille,
  adresseUtilisable,
  ligneSansProvisoire,
  retirerTextesProvisoires,
  telephoneUtilisable,
  nomAffiche,
  soinsParDefaut,
  REPLIS,
  type Specialite,
  lieuEnClair,
  lienRdvPrecis,
  mentionOrdre,
  numeroOrdreAffichable,
  rppsAffichable,
  modeleIntegre,
  modeleDuSite,
  ordonnerSoins,
  packVisuel,
  fusionnerPack,
  fusionnerSpecialites,
  jeuPhotosAutorise,
  jeuPhotosDepuisLigne,
  nettoyerPhotosJeu,
  persoDuJeuPhotos,
  poidsAssets,
  avecSujets,
  surchargesDepuisLignes,
  sujetsDeSpecialite,
  validerChoixLogo,
  marquesLogo,
  assainirMarque,
  type MarqueImportee,
  validerPersonnalisation,
  type PersonnalisationPack,
  validerManifeste,
  normaliserDraft,
  phraseJoursDomicile,
  PAYS,
  type Faq,
  type PraticienPublic,
  type SiteConfig,
  type SiteDraft,
  type Soin,
} from '@plateforme/core';
import { defautsProfession } from './defaults';
import { rendusPortrait } from '@plateforme/core/portrait';

const env = (nom: string) => (import.meta.env[nom] as string | undefined) ?? process.env[nom];

async function lire<T>(chemin: string): Promise<T> {
  const url = env('SUPABASE_URL');
  const cle = env('SUPABASE_SECRET_KEY');
  if (!url || !cle) throw new Error('SUPABASE_URL et SUPABASE_SECRET_KEY sont requis pour construire un site depuis Supabase.');
  const r = await fetch(`${url}/rest/v1/${chemin}`, { headers: { apikey: cle } });
  if (!r.ok) throw new Error(`Supabase ${r.status} sur ${chemin} : ${await r.text()}`);
  return r.json() as Promise<T>;
}

type LigneSite = {
  id: string;
  slug: string | null;
  profession_slug: string;
  domaine: string | null;
  test: boolean;
  /** Brouillon (aperçu de l'éditeur visuel) */
  config: unknown;
  /** Version publiée, figée au moment de « Publier » (null : site publié avant la migration 0017) */
  config_publiee?: unknown;
  /** Date à laquelle la version publiée a été figée */
  publiee_le?: string | null;
  /** Options payantes activées par l'admin (ex. { edition: true }) */
  options?: { edition?: boolean } | null;
  /** Dernière modification de la fiche (dateModified, lastmod) */
  updated_at?: string;
};
type LigneArticle = { slug: string; titre: string; resume: string; corps: string; theme: string; date_publication: string; image?: string; image_alt?: string };
type LigneProfession = { slug: string; libelle: string; specialite_schema: string; ordre: string };
type LigneJeuPhotos = { id: string; nom: string; specialite: string; photos: unknown; source: string; site_id: string | null; actif: boolean };
type LigneSoin = { slug: string; titre_court: string; titre: string; resume: string; corps: string; faq: Faq[]; icone?: string | null };

const identifiants = (d: SiteDraft, p: SiteDraft['praticiens'][number], ordre: string): string[] => {
  // N° INAMI absent ou mal formé : mention omise (jamais bloquant, voir controles.ts).
  if (d.pays === 'BE') return /^\d-\d{5}-\d{2}-\d{3}$/.test(p.inami.trim()) ? [`N° INAMI : ${p.inami.trim()}`, 'Agréé·e INAMI'] : [];
  if (d.pays === 'CH') {
    return [p.membreSsp && 'Membre de la Société Suisse des Podologues (SSP)', ligneSansProvisoire(p.rcc) && `N° RCC : ${p.rcc.trim()}`].filter(Boolean) as string[];
  }
  // Numéros mal formés ou fictifs : jamais affichés (la saisie ne bloque plus la publication, voir controles.ts).
  const numero = numeroOrdreAffichable(p.numeroOrdre), rpps = rppsAffichable(p.rpps);
  return [numero && mentionOrdre(numero, ordre), rpps && `N° RPPS : ${rpps}`].filter(Boolean) as string[];
};

const enListe = (mots: string[]) =>
  mots.length > 1 ? `${mots.slice(0, -1).join(', ')} et ${mots.at(-1)}` : mots[0] ?? '';

export async function chargerDepuisSupabase(siteId: string): Promise<SiteConfig> {
  const filtre = /^[0-9a-f-]{36}$/.test(siteId) ? `id=eq.${siteId}` : `slug=eq.${encodeURIComponent(siteId)}`;
  // Sans les colonnes de la version publiée si la base n'a pas encore reçu la mise à jour 0017.
  const [s] = await lire<LigneSite[]>(`sites?${filtre}&select=id,slug,profession_slug,domaine,test,config,config_publiee,publiee_le,options,updated_at`).catch(() =>
    lire<LigneSite[]>(`sites?${filtre}&select=id,slug,profession_slug,domaine,test,config,options,updated_at`),
  );
  if (!s) throw new Error(`Site introuvable dans Supabase : ${siteId}`);

  const [prof] = await lire<LigneProfession[]>(`professions?slug=eq.${s.profession_slug}`);
  const catalogue = await lire<LigneSoin[]>(`soins_catalogue?profession_slug=eq.${s.profession_slug}&order=position`);

  // Articles du flux publiés par ce site (tolérant si le flux n'est pas encore installé).
  const publies = await lire<{ article: LigneArticle | null }[]>(
    `site_articles?site_id=eq.${s.id}&statut=eq.publie&select=article:articles_flux(slug,titre,resume,corps,theme,date_publication,image,image_alt)`,
  ).catch(() => []);

  // Site public : version publiée (repli sur le brouillon si elle n'existe pas encore) ; aperçu (APERCU=1) : brouillon.
  const d = normaliserDraft(process.env.APERCU === '1' ? s.config : (s.config_publiee ?? s.config));

  // Modèle de présentation : fiche importée par l'admin (table « modeles »), sinon modèle intégré.
  const [ligneModele] = await lire<{ manifeste: unknown }[]>(`modeles?id=eq.${encodeURIComponent(d.theme.modele)}&actif=eq.true&select=manifeste`).catch(() => []);
  // Ordre des sections et registre posés par un univers du catalogue (catalogue-univers.ts), s'ils sont compatibles.
  const modele = modeleDuSite((ligneModele && validerManifeste(ligneModele.manifeste).modele) || modeleIntegre(d.theme.modele), d.theme);
  // Pack visuel de la spécialité, éventuellement personnalisé par l'admin (banque visuelle).
  const [persoBanque] = await lire<PersonnalisationPack[]>(`packs_visuels?id=eq.${encodeURIComponent(d.theme.specialite)}&select=photos,animation`).catch(() => []);
  // Jeu de photos affecté (tiré au hasard ou exclusif premium) : seulement s'il est actif et autorisé pour ce site
  // (jeu partagé de sa spécialité, ou jeu exclusif de ce site), photos revérifiées ; ses photos passent devant.
  const [ligneJeu] = /^[0-9a-f-]{36}$/.test(d.theme.jeuPhotos)
    ? await lire<LigneJeuPhotos[]>(`jeux_photos?id=eq.${d.theme.jeuPhotos}&select=id,nom,specialite,photos,source,site_id,actif`).catch(() => [])
    : [];
  const jeuLu = ligneJeu ? jeuPhotosDepuisLigne(ligneJeu) : null;
  const jeuPhotos = jeuLu && jeuPhotosAutorise(jeuLu, s.id, d.theme.specialite)
    ? { ...jeuLu, photos: nettoyerPhotosJeu(jeuLu.photos, `${env('SUPABASE_URL')!.replace(/\/$/, '')}/storage/v1/object/public/photos/`, jeuLu.siteId) }
    : null;
  // Notes des photos (/admin/retours, migration 0027) : galerie du jeu de la mieux à la moins bien notée, photos « retirées »
  // enlevées ; sans la migration, ordre du jeu inchangé.
  const notesAssets = jeuPhotos
    ? await lire<{ cle_asset: string; note: number | null; etiquettes: string[] | null; statut: string | null }[]>('rpc/assets_notes_apprentissage').catch(() => [])
    : [];
  // Sujets retirés / ajoutés par Paul (0028) : une photo retirée des sujets de la spécialité du site sort de la galerie
  const sujetsAssets = jeuPhotos
    ? await lire<{ cle_asset: string; sujet: string; action: string }[]>('rpc/assets_sujets_effectifs').catch(() => [])
    : [];
  const poidsPhotos = avecSujets(
    poidsAssets(notesAssets.map((l) => ({ cle: l.cle_asset, note: l.note, etiquettes: l.etiquettes, statut: l.statut }))),
    surchargesDepuisLignes((Array.isArray(sujetsAssets) ? sujetsAssets : []).map((l) => ({ cle: l.cle_asset, sujet: l.sujet, action: l.action }))),
  );
  const persoPack = persoDuJeuPhotos(jeuPhotos, persoBanque, poidsPhotos, sujetsDeSpecialite(d.theme.specialite));
  const pack = fusionnerPack(packVisuel(d.theme.specialite), persoPack);
  // Spécialité secondaire : complète les visuels de la principale (avec sa propre personnalisation admin).
  const [persoSecondaire] = d.theme.specialiteSecondaire
    ? await lire<PersonnalisationPack[]>(`packs_visuels?id=eq.${encodeURIComponent(d.theme.specialiteSecondaire)}&select=photos,animation`).catch(() => [])
    : [];
  // Logo : marque dessinée par la charte, ou marque importée par l'admin (active, renettoyée).
  const choixLogo = validerChoixLogo(d.theme.logo);
  let marqueImportee: MarqueImportee | undefined;
  if (d.theme.logo?.marque && !marquesLogo().some((m) => m.id === d.theme.logo.marque)) {
    const [l] = await lire<{ id: string; nom: string; sens: string; view_box: string; contenu: string }[]>(
      `marques_logo?id=eq.${encodeURIComponent(d.theme.logo.marque)}&actif=eq.true&select=id,nom,sens,view_box,contenu`,
    ).catch(() => []);
    if (l) marqueImportee = assainirMarque({ id: l.id, nom: l.nom, sens: l.sens, viewBox: l.view_box, contenu: l.contenu }) ?? undefined;
  }
  const logo = marqueImportee ? { marque: marqueImportee.id, disposition: choixLogo.disposition } : choixLogo;
  const visuelsSpecialite = d.theme.specialiteSecondaire ? fusionnerSpecialites(pack, fusionnerPack(packVisuel(d.theme.specialiteSecondaire), persoSecondaire)) : pack;
  // Plus rien ne bloque la publication (règle de Paul, 2026-10-05) : chaque information manquante a un repli sobre,
  // appliqué par assemblerSite. Les avertissements restent visibles à la saisie (controlerPublication, conseils).
  return assemblerSite({
    ligne: s,
    apercu: process.env.APERCU === '1',
    d,
    prof,
    catalogue,
    articles: publies.map((p) => p.article).filter((a): a is LigneArticle => Boolean(a)),
    modele,
    pack,
    visuelsSpecialite,
    persoPack: persoPack ?? null,
    persoSecondaire: persoSecondaire ?? null,
    logo,
    marqueImportee,
    creditAdobe: jeuPhotos?.source === 'adobe',
  });
}

/** Données lues (Supabase ou fichier local de test) nécessaires pour assembler un site, sans accès réseau. */
export type EntreeAssemblage = {
  ligne: Pick<LigneSite, 'id' | 'slug' | 'domaine' | 'test' | 'options' | 'updated_at' | 'publiee_le'>;
  /** Aperçu de l'éditeur (brouillon, jamais indexé) */
  apercu: boolean;
  d: SiteDraft;
  prof: LigneProfession;
  catalogue: LigneSoin[];
  articles: LigneArticle[];
  modele: SiteConfig['modele'];
  pack: Specialite;
  visuelsSpecialite: Specialite;
  persoPack: PersonnalisationPack | null;
  persoSecondaire: PersonnalisationPack | null;
  logo: SiteConfig['theme']['logo'];
  marqueImportee?: MarqueImportee;
  creditAdobe?: boolean;
};
export type { LigneSoin, LigneProfession, LigneArticle };

/**
 * Assemble la SiteConfig d'un site depuis son brouillon, avec les REPLIS des informations manquantes (replis.ts) :
 * - ville absente : titres sans « à {ville} » ; adresse incomplète : « Adresse communiquée à la prise de rendez-vous »
 *   (adresse, code postal et ville du lieu vidés : pas de plan, pas d'itinéraire, pas d'adresse postale inventée) ;
 * - téléphone absent : vide (pas de bouton « Appeler ») ; lien de RDV absent ou vers l'accueil d'une plateforme : vidé ;
 * - praticien sans nom : non présenté ; aucun praticien nommé : présentation au nom du cabinet ;
 * - nom du cabinet absent : « Cabinet de {noms} », sinon « Cabinet de pédicurie-podologie » ;
 * - aucune compétence : soins de l'univers / de la spécialité, sinon de la podologie générale ;
 * - horaires vides : « Sur rendez-vous » (textes.ts) ; textes provisoires (« [..] », xxx, lorem) : paragraphe retiré ;
 * - n° d'Ordre, RPPS ou INAMI absents ou mal formés : mention omise.
 */
export function assemblerSite(e: EntreeAssemblage): SiteConfig {
  const { ligne: s, apercu, d, prof, catalogue, modele, pack, visuelsSpecialite, persoPack, persoSecondaire, logo, marqueImportee } = e;
  const lieuBrut = d.lieux[0];
  // Adresse publiable seulement si complète (rue, code postal valide, ville) : sinon rien d'inventé.
  const lieux = d.lieux.map(({ id: _id, ...l }) => {
    const complete = adresseUtilisable(l, d.pays);
    return {
      ...l,
      nom: ligneSansProvisoire(l.nom),
      adresse: complete ? l.adresse.trim() : '',
      complement: complete ? ligneSansProvisoire(l.complement) : '',
      codePostal: complete ? l.codePostal.trim() : '',
      ville: complete ? l.ville.trim() : '',
      // Horaires structurés (horaires.ts) : mentions sous le tableau, note sans texte provisoire.
      surRendezVous: Boolean(l.surRendezVous),
      noteHoraires: ligneSansProvisoire(l.noteHoraires ?? ''),
    };
  });
  const lieu = lieux[0];
  const ville = ligneSansProvisoire(d.cabinet.ville) || ligneSansProvisoire(lieuBrut?.ville ?? '');
  const perso = (t: string) => avecVille(t, ville);
  const defauts = defautsProfession(prof.slug);
  const titreMetier = PAYS.find((p) => p.value === d.pays)?.titre ?? prof.libelle;
  const libelle = (slug: string) => catalogue.find((c) => c.slug === slug)?.titre_court ?? slug;
  const telephone = telephoneUtilisable(d.cabinet.telephone) ? formaterTelephone(d.cabinet.telephone) : '';
  const email = /^\S+@\S+\.\S+$/.test(d.cabinet.email ?? '') ? d.cabinet.email.trim() : '';
  // Lien de rendez-vous : seulement s'il mène à une page précise (jamais l'accueil d'une plateforme).
  const rdvUrl = (u: string) => (lienRdvPrecis(u) ? u.trim() : '');
  const rdvCabinet = d.rdv.mode === 'telephone' ? '' : rdvUrl(d.rdv.url) || rdvUrl(d.praticiens.find((p) => rdvUrl(p.rdvUrl))?.rdvUrl ?? '');

  // Soins cochés (à défaut : ceux de l'univers ou de la spécialité), dans l'ordre du catalogue ; ceux mis en avant par
  // l'univers passent devant (theme.soinsEnAvant).
  const slugsSoins = d.soins.length ? d.soins : soinsParDefaut({ ...d.theme, priorites: d.priorites }, catalogue.map((c) => c.slug));
  const soins: Soin[] = ordonnerSoins(catalogue
    .filter((c) => slugsSoins.includes(c.slug))
    .map((c) => ({
      slug: c.slug,
      titre: perso(c.titre),
      titreCourt: c.titre_court,
      resume: perso(c.resume),
      corps: perso(c.corps),
      faq: c.faq.map((f) => ({ q: perso(f.q), r: perso(f.r) })),
      icone: c.icone ?? undefined,
    })), d.theme.soinsEnAvant);

  // Seuls les praticiens nommés sont présentés (le nom de famille suffit) ; sans aucun : présentation au nom du cabinet.
  const praticiensNommes = d.praticiens.filter((p) => nomAffiche(p));
  const praticiens: PraticienPublic[] = praticiensNommes.map((p) => ({
    prenom: ligneSansProvisoire(p.prenom),
    nom: ligneSansProvisoire(p.nom),
    statut: p.statut,
    titre: titreMetier,
    identifiants: identifiants(d, p, prof.ordre),
    diplome: [p.diplome, p.ecole].map(ligneSansProvisoire).filter(Boolean).join(' — '),
    formations: p.formations.map(ligneSansProvisoire).filter(Boolean),
    orientations: p.orientations.map(libelle),
    sports: p.sports,
    rdvUrl: d.rdv.mode === 'telephone' ? '' : rdvUrl(p.rdvUrl) || rdvCabinet,
    presence: ligneSansProvisoire(p.presence),
    bio: retirerTextesProvisoires(p.bio),
    photo: p.photo,
    // Rendus du studio portrait (srcset), seulement s'ils correspondent à la photo enregistrée
    ...(rendusPortrait(p) ? { portrait: rendusPortrait(p)! } : {}),
  }));

  const p1 = praticiens[0] as PraticienPublic | undefined;
  const d1 = praticiensNommes[0];
  const pluriel = praticiens.length > 1;
  const noms = enListe(praticiens.map((p) => `${p.prenom} ${p.nom}`.trim()));
  // Le quartier complète la ville, il ne la remplace jamais (« dans le quartier Claret, à Toulon »).
  const quartier = ligneSansProvisoire(d.cabinet.quartier);
  const lieuExercice = lieuEnClair(quartier, ville);
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const messageTexte = retirerTextesProvisoires(d.message.texte);
  const messageActif = messageTexte && (!d.message.jusquAu || d.message.jusquAu >= aujourdhui);
  const listeSoins = soins.slice(0, 3).map((x) => x.titreCourt.toLowerCase());
  const nomCabinet = ligneSansProvisoire(d.cabinet.nom) || lieu.nom || (noms ? `Cabinet de ${noms}` : REPLIS.nomCabinet);
  const metier = `${titreMetier.toLowerCase()}${pluriel ? 's' : ''}`;
  const enPhrase = (...morceaux: string[]) => morceaux.filter(Boolean).join(' ');

  return {
    id: s.id,
    // Nom d'hôte seul (canonical, sitemap, robots, llms) : une saisie « https://www.exemple.fr/ » est ramenée à « www.exemple.fr ».
    domaine: s.domaine?.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase() || `${s.slug ?? s.id}.pages.dev`,
    demo: s.test || apercu,
    majLe: (apercu ? s.updated_at : (s.publiee_le ?? s.updated_at))?.slice(0, 10),
    profession: { slug: prof.slug, libelle: titreMetier, specialiteSchema: prof.specialite_schema },

    // Champs historiques (premier praticien / premier lieu), utilisés par le schema.org. Sans praticien nommé : vides.
    praticien: {
      prenom: p1?.prenom ?? '',
      nom: p1?.nom ?? '',
      titre: titreMetier,
      rpps: d1 ? rppsAffichable(d1.rpps) || numeroOrdreAffichable(d1.numeroOrdre) || (d.pays === 'BE' && /^\d-\d{5}-\d{2}-\d{3}$/.test(d1.inami.trim()) ? d1.inami.trim() : '') : '',
      ordre: p1?.identifiants[0] ?? '',
      conventionnement: retirerTextesProvisoires(d.conventionnement),
      parcours:
        p1?.bio ||
        (noms
          ? `${enPhrase(`${noms}, ${metier}, accueille${pluriel ? 'nt' : ''} les patients`, lieuExercice)}.`
          : `${enPhrase(`${REPLIS.equipe} accueille les patients`, lieuExercice)}.`),
      formations: p1?.formations ?? [],
      langues: ['Français'],
    },
    cabinet: {
      nom: nomCabinet,
      adresse: lieu.adresse,
      codePostal: lieu.codePostal,
      ville,
      quartier,
      telephone,
      email: email || undefined,
      acces: [d.acces.parking, d.acces.transports, ...d.acces.autres].map(ligneSansProvisoire).filter(Boolean),
      pmr: d.acces.pmr,
      horaires: lieu.horaires,
      tarifs: [],
    },
    rdv: { url: rdvCabinet, plateforme: d.rdv.outil },
    theme: { couleur: d.theme.couleur, ...(d.theme.gamme ? { gamme: d.theme.gamme } : {}), logo, ...(d.theme.logoPerso?.url ? { logoPerso: d.theme.logoPerso } : {}), modeVisuel: d.theme.modeVisuel, ...(d.theme.styleIllustration ? { styleIllustration: d.theme.styleIllustration } : {}), mise_en_page: 'sobre', style_images: 'minimal' },
    accroche: {
      titre: defauts.accrocheTitre,
      texte: `${enPhrase(titreMetier, lieuExercice)} : ${listeSoins.length ? enListe(listeSoins) : 'soins du pied'}.`,
    },
    soins,
    faqGenerale: defauts.faq({ pmr: d.acces.pmr, plateforme: d.rdv.outil, enLigne: Boolean(rdvCabinet), telephone: Boolean(telephone), email }),
    articles: e.articles
      .map((a) => ({ slug: a.slug, titre: perso(a.titre), resume: perso(a.resume), corps: perso(a.corps), theme: a.theme, date: a.date_publication, image: a.image || undefined, imageAlt: a.image_alt || undefined })),
    tracking: {},
    mentions: {
      editeur: noms ? `${noms}, ${metier}` : nomCabinet,
      hebergeur: 'Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis',
      // Licence Adobe Stock : mention de la source, sans nom de fichier.
      ...(e.creditAdobe ? { creditPhotos: 'Photos : Adobe Stock' } : {}),
    },

    pays: d.pays,
    voix: d.voix,
    modele,
    titreMetier,
    praticiens,
    lieux,
    accesDetail: { ...d.acces, parking: ligneSansProvisoire(d.acces.parking), transports: ligneSansProvisoire(d.acces.transports), autres: d.acces.autres.map(ligneSansProvisoire).filter(Boolean) },
    // Sans lien de rendez-vous utilisable, le site ne propose pas la réservation en ligne.
    rdvMode: rdvCabinet ? d.rdv.mode : 'telephone',
    paiements: d.paiements,
    equipements: d.equipements,
    equipementsAutres: retirerTextesProvisoires(d.equipementsAutres),
    // Créneaux saisis, sinon les jours cochés dans l'éditeur d'horaires (« Le mardi et le jeudi »).
    domicile: { ...d.domicile, creneaux: ligneSansProvisoire(d.domicile.creneaux) || phraseJoursDomicile(d.domicile.jours) },
    message: messageActif ? messageTexte : '',
    communes: d.cabinet.communes.map(ligneSansProvisoire).filter(Boolean),
    // Hiérarchie du site (thèmes principaux et secondaires) : navigation et pages de thème (lib/navigation.ts)
    priorites: d.priorites,
    photos: d.photos,
    // Textes de l'éditeur visuel, revalidés (option « édition » requise pour les zones guidées).
    marqueImportee,
    textes: validerPersonnalisation(d.perso.textes, Boolean(s.options?.edition)).textes,
    visuels: {
      specialite: pack.value,
      // Animation choisie (proposition, structure Technique) prioritaire sur celle de la spécialité ; case décochée : aucune
      animation: d.theme.animation ? (d.theme.animationAccueil ?? pack.animation) : null,
      ...(d.theme.animation && d.theme.animationAccueil ? { animationAccueil: d.theme.animationAccueil } : {}),
      photos: visuelsSpecialite.photos,
      // Jeu visuel (jeux.ts) : secondaire et personnalisations de l'admin, recombinées au build.
      ...(d.theme.specialiteSecondaire ? { specialiteSecondaire: d.theme.specialiteSecondaire } : {}),
      perso: persoPack,
      persoSecondaire,
    },
  };
}
