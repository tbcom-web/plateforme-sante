// Charge un site praticien depuis Supabase au moment du build et l'assemble en SiteConfig.
// Nécessite SUPABASE_URL et SUPABASE_SECRET_KEY (jamais exposés au navigateur : le site est statique).
import {
  controlerPublication,
  formaterTelephone,
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
  validerChoixLogo,
  marquesLogo,
  assainirMarque,
  type MarqueImportee,
  validerPersonnalisation,
  type PersonnalisationPack,
  validerManifeste,
  normaliserDraft,
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
  if (d.pays === 'BE') return [p.inami && `N° INAMI : ${p.inami}`, 'Agréé·e INAMI'].filter(Boolean) as string[];
  if (d.pays === 'CH') {
    return [p.membreSsp && 'Membre de la Société Suisse des Podologues (SSP)', p.rcc && `N° RCC : ${p.rcc}`].filter(Boolean) as string[];
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
  const persoPack = persoDuJeuPhotos(jeuPhotos, persoBanque);
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
  // Même contrôle que le back-office : un site incomplet n'est jamais publié (sauf site de test).
  const { bloquants } = controlerPublication(d);
  // L'aperçu de l'éditeur visuel (APERCU=1) montre aussi un brouillon incomplet ; il n'est jamais indexé.
  if (bloquants.length && !s.test && process.env.APERCU !== '1') {
    throw new Error(['Publication refusée :', ...bloquants.map((b) => `- ${b}`)].join('\n'));
  }
  const lieu = d.lieux[0];
  const ville = d.cabinet.ville || lieu.ville;
  const perso = (t: string) => t.replaceAll('{ville}', ville);
  const defauts = defautsProfession(s.profession_slug);
  const titreMetier = PAYS.find((p) => p.value === d.pays)?.titre ?? prof.libelle;
  const libelle = (slug: string) => catalogue.find((c) => c.slug === slug)?.titre_court ?? slug;

  // Soins cochés, dans l'ordre du catalogue ; ceux mis en avant par l'univers passent devant (theme.soinsEnAvant).
  const soins: Soin[] = ordonnerSoins(catalogue
    .filter((c) => d.soins.includes(c.slug))
    .map((c) => ({
      slug: c.slug,
      titre: perso(c.titre),
      titreCourt: c.titre_court,
      resume: perso(c.resume),
      corps: perso(c.corps),
      faq: c.faq.map((f) => ({ q: perso(f.q), r: perso(f.r) })),
      icone: c.icone ?? undefined,
    })), d.theme.soinsEnAvant);

  const praticiens: PraticienPublic[] = d.praticiens.map((p) => ({
    prenom: p.prenom,
    nom: p.nom,
    statut: p.statut,
    titre: titreMetier,
    identifiants: identifiants(d, p, prof.ordre),
    diplome: [p.diplome, p.ecole].filter(Boolean).join(' — '),
    formations: p.formations,
    orientations: p.orientations.map(libelle),
    sports: p.sports,
    rdvUrl: p.rdvUrl || d.rdv.url,
    presence: p.presence,
    bio: p.bio,
    photo: p.photo,
    // Rendus du studio portrait (srcset), seulement s'ils correspondent à la photo enregistrée
    ...(rendusPortrait(p) ? { portrait: rendusPortrait(p)! } : {}),
  }));

  const p1 = praticiens[0];
  const pluriel = praticiens.length > 1;
  const noms = enListe(praticiens.map((p) => `${p.prenom} ${p.nom}`));
  // Le quartier complète la ville, il ne la remplace jamais (« dans le quartier Claret, à Toulon »).
  const quartier = d.cabinet.quartier.trim();
  const lieuExercice = lieuEnClair(quartier, ville);
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const messageActif = d.message.texte && (!d.message.jusquAu || d.message.jusquAu >= aujourdhui);
  const listeSoins = soins.slice(0, 3).map((x) => x.titreCourt.toLowerCase());

  return {
    id: s.id,
    domaine: s.domaine ?? `${s.slug ?? s.id}.pages.dev`,
    demo: s.test || process.env.APERCU === '1',
    majLe: (process.env.APERCU === '1' ? s.updated_at : (s.publiee_le ?? s.updated_at))?.slice(0, 10),
    profession: { slug: prof.slug, libelle: titreMetier, specialiteSchema: prof.specialite_schema },

    // Champs historiques (premier praticien / premier lieu), utilisés par le schema.org.
    praticien: {
      prenom: p1.prenom,
      nom: p1.nom,
      titre: titreMetier,
      rpps: rppsAffichable(d.praticiens[0].rpps) || numeroOrdreAffichable(d.praticiens[0].numeroOrdre) || d.praticiens[0].inami,
      ordre: p1.identifiants[0] ?? '',
      conventionnement: d.conventionnement,
      parcours:
        p1.bio ||
        `${noms}, ${titreMetier.toLowerCase()}${pluriel ? 's' : ''}, accueille${pluriel ? 'nt' : ''} les patients ${lieuExercice}.`,
      formations: p1.formations,
      langues: ['Français'],
    },
    cabinet: {
      nom: d.cabinet.nom || lieu.nom || `Cabinet de ${noms}`,
      adresse: lieu.adresse,
      codePostal: lieu.codePostal,
      ville,
      quartier,
      telephone: formaterTelephone(d.cabinet.telephone),
      email: d.cabinet.email || undefined,
      acces: [d.acces.parking, d.acces.transports, ...d.acces.autres].filter(Boolean),
      pmr: d.acces.pmr,
      horaires: lieu.horaires,
      tarifs: [],
    },
    rdv: { url: d.rdv.url, plateforme: d.rdv.outil },
    theme: { couleur: d.theme.couleur, ...(d.theme.gamme ? { gamme: d.theme.gamme } : {}), logo, ...(d.theme.logoPerso?.url ? { logoPerso: d.theme.logoPerso } : {}), modeVisuel: d.theme.modeVisuel, mise_en_page: 'sobre', style_images: 'minimal' },
    accroche: {
      titre: defauts.accrocheTitre,
      texte: `${titreMetier} ${lieuExercice} : ${listeSoins.length ? enListe(listeSoins) : 'soins du pied'}.`,
    },
    soins,
    faqGenerale: defauts.faq({ pmr: d.acces.pmr, plateforme: d.rdv.outil, enLigne: d.rdv.mode !== 'telephone' && lienRdvPrecis(d.rdv.url || d.praticiens.find((p) => p.rdvUrl)?.rdvUrl) }),
    articles: publies
      .map((p) => p.article)
      .filter((a): a is LigneArticle => Boolean(a))
      .map((a) => ({ slug: a.slug, titre: perso(a.titre), resume: perso(a.resume), corps: perso(a.corps), theme: a.theme, date: a.date_publication, image: a.image || undefined, imageAlt: a.image_alt || undefined })),
    tracking: {},
    mentions: {
      editeur: `${noms}, ${titreMetier.toLowerCase()}${pluriel ? 's' : ''}`,
      hebergeur: 'Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis',
      // Licence Adobe Stock : mention de la source, sans nom de fichier.
      ...(jeuPhotos?.source === 'adobe' ? { creditPhotos: 'Photos : Adobe Stock' } : {}),
    },

    pays: d.pays,
    voix: d.voix,
    modele,
    titreMetier,
    praticiens,
    lieux: d.lieux.map(({ id: _id, ...l }) => l),
    accesDetail: d.acces,
    rdvMode: d.rdv.mode,
    paiements: d.paiements,
    equipements: d.equipements,
    equipementsAutres: d.equipementsAutres,
    domicile: d.domicile,
    message: messageActif ? d.message.texte : '',
    communes: d.cabinet.communes,
    photos: d.photos,
    // Textes de l'éditeur visuel, revalidés (option « édition » requise pour les zones guidées).
    marqueImportee,
    textes: validerPersonnalisation(d.perso.textes, Boolean(s.options?.edition)).textes,
    visuels: {
      specialite: pack.value,
      animation: d.theme.animation ? pack.animation : null,
      photos: visuelsSpecialite.photos,
      // Jeu visuel (jeux.ts) : secondaire et personnalisations de l'admin, recombinées au build.
      ...(d.theme.specialiteSecondaire ? { specialiteSecondaire: d.theme.specialiteSecondaire } : {}),
      perso: persoPack ?? null,
      persoSecondaire: persoSecondaire ?? null,
    },
  };
}
