// Charge un site praticien depuis Supabase au moment du build et l'assemble en SiteConfig.
// Nécessite SUPABASE_URL et SUPABASE_SECRET_KEY (jamais exposés au navigateur : le site est statique).
import {
  formaterTelephone,
  mentionOrdre,
  normaliserDraft,
  PAYS,
  type Faq,
  type PraticienPublic,
  type SiteConfig,
  type SiteDraft,
  type Soin,
} from '@plateforme/core';
import { defautsProfession } from './defaults';

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
  config: unknown;
};
type LigneProfession = { slug: string; libelle: string; specialite_schema: string; ordre: string };
type LigneSoin = { slug: string; titre_court: string; titre: string; resume: string; corps: string; faq: Faq[]; icone?: string | null };

const identifiants = (d: SiteDraft, p: SiteDraft['praticiens'][number], ordre: string): string[] => {
  if (d.pays === 'BE') return [p.inami && `N° INAMI : ${p.inami}`, 'Agréé·e INAMI'].filter(Boolean) as string[];
  if (d.pays === 'CH') {
    return [p.membreSsp && 'Membre de la Société Suisse des Podologues (SSP)', p.rcc && `N° RCC : ${p.rcc}`].filter(Boolean) as string[];
  }
  return [p.numeroOrdre && mentionOrdre(p.numeroOrdre, ordre), p.rpps && `N° RPPS : ${p.rpps}`].filter(Boolean) as string[];
};

const enListe = (mots: string[]) =>
  mots.length > 1 ? `${mots.slice(0, -1).join(', ')} et ${mots.at(-1)}` : mots[0] ?? '';

export async function chargerDepuisSupabase(siteId: string): Promise<SiteConfig> {
  const filtre = /^[0-9a-f-]{36}$/.test(siteId) ? `id=eq.${siteId}` : `slug=eq.${encodeURIComponent(siteId)}`;
  const [s] = await lire<LigneSite[]>(`sites?${filtre}&select=id,slug,profession_slug,domaine,test,config`);
  if (!s) throw new Error(`Site introuvable dans Supabase : ${siteId}`);

  const [prof] = await lire<LigneProfession[]>(`professions?slug=eq.${s.profession_slug}`);
  const catalogue = await lire<LigneSoin[]>(`soins_catalogue?profession_slug=eq.${s.profession_slug}&order=position`);

  const d = normaliserDraft(s.config);
  const lieu = d.lieux[0];
  const ville = d.cabinet.ville || lieu.ville;
  const perso = (t: string) => t.replaceAll('{ville}', ville);
  const defauts = defautsProfession(s.profession_slug);
  const titreMetier = PAYS.find((p) => p.value === d.pays)?.titre ?? prof.libelle;
  const libelle = (slug: string) => catalogue.find((c) => c.slug === slug)?.titre_court ?? slug;

  const soins: Soin[] = catalogue
    .filter((c) => d.soins.includes(c.slug))
    .map((c) => ({
      slug: c.slug,
      titre: perso(c.titre),
      titreCourt: c.titre_court,
      resume: perso(c.resume),
      corps: perso(c.corps),
      faq: c.faq.map((f) => ({ q: perso(f.q), r: perso(f.r) })),
      icone: c.icone ?? undefined,
    }));

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
  }));

  const p1 = praticiens[0];
  const pluriel = praticiens.length > 1;
  const noms = enListe(praticiens.map((p) => `${p.prenom} ${p.nom}`));
  const quartier = d.cabinet.quartier || ville;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const messageActif = d.message.texte && (!d.message.jusquAu || d.message.jusquAu >= aujourdhui);
  const listeSoins = soins.slice(0, 3).map((x) => x.titreCourt.toLowerCase());

  return {
    id: s.id,
    domaine: s.domaine ?? `${s.slug ?? s.id}.pages.dev`,
    demo: s.test,
    profession: { slug: prof.slug, libelle: titreMetier, specialiteSchema: prof.specialite_schema },

    // Champs historiques (premier praticien / premier lieu), utilisés par le schema.org.
    praticien: {
      prenom: p1.prenom,
      nom: p1.nom,
      titre: titreMetier,
      rpps: d.praticiens[0].rpps || d.praticiens[0].numeroOrdre || d.praticiens[0].inami,
      ordre: p1.identifiants[0] ?? '',
      conventionnement: d.conventionnement,
      parcours:
        p1.bio ||
        `${noms}, ${titreMetier.toLowerCase()}${pluriel ? 's' : ''}, accueille${pluriel ? 'nt' : ''} les patients à ${quartier}.`,
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
    theme: { couleur: d.theme.couleur, mise_en_page: 'sobre', style_images: 'minimal' },
    accroche: {
      titre: defauts.accrocheTitre,
      texte: `${titreMetier} à ${quartier} : ${listeSoins.length ? enListe(listeSoins) : 'soins du pied'}.`,
    },
    soins,
    faqGenerale: defauts.faq({ pmr: d.acces.pmr, plateforme: d.rdv.mode === 'telephone' ? 'téléphone' : d.rdv.outil }),
    articles: [],
    tracking: {},
    mentions: {
      editeur: `${noms}, ${titreMetier.toLowerCase()}${pluriel ? 's' : ''}`,
      hebergeur: 'Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis',
    },

    pays: d.pays,
    voix: d.voix,
    modele: d.theme.modele,
    titreMetier,
    praticiens,
    lieux: d.lieux.map(({ id: _id, ...l }) => l),
    accesDetail: d.acces,
    rdvMode: d.rdv.mode,
    paiements: d.paiements,
    domicile: d.domicile,
    message: messageActif ? d.message.texte : '',
    communes: d.cabinet.communes,
  };
}
