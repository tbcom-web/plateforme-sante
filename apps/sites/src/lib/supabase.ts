// Charge un site praticien depuis Supabase au moment du build et l'assemble en SiteConfig.
// Nécessite SUPABASE_URL et SUPABASE_SECRET_KEY (jamais exposés au navigateur : le site est statique).
import { formaterTelephone, type Faq, type SiteConfig, type SiteDraft, type Soin } from '@plateforme/core';
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
  config: SiteDraft;
};
type LigneProfession = { slug: string; libelle: string; specialite_schema: string; ordre: string };
type LigneSoin = { slug: string; titre_court: string; titre: string; resume: string; corps: string; faq: Faq[] };

export async function chargerDepuisSupabase(siteId: string): Promise<SiteConfig> {
  const filtre = /^[0-9a-f-]{36}$/.test(siteId) ? `id=eq.${siteId}` : `slug=eq.${encodeURIComponent(siteId)}`;
  const [s] = await lire<LigneSite[]>(`sites?${filtre}&select=id,slug,profession_slug,domaine,test,config`);
  if (!s) throw new Error(`Site introuvable dans Supabase : ${siteId}`);

  const [prof] = await lire<LigneProfession[]>(`professions?slug=eq.${s.profession_slug}`);
  const catalogue = await lire<LigneSoin[]>(`soins_catalogue?profession_slug=eq.${s.profession_slug}&order=position`);

  const d = s.config;
  const ville = d.cabinet.ville;
  const perso = (t: string) => t.replaceAll('{ville}', ville);
  const defauts = defautsProfession(s.profession_slug);

  const soins: Soin[] = catalogue
    .filter((c) => d.soins.includes(c.slug))
    .map((c) => ({
      slug: c.slug,
      titre: perso(c.titre),
      titreCourt: c.titre_court,
      resume: perso(c.resume),
      corps: perso(c.corps),
      faq: c.faq.map((f) => ({ q: perso(f.q), r: perso(f.r) })),
    }));

  const lieu = d.cabinet.quartier || ville;
  const listeSoins = soins.slice(0, 3).map((x) => x.titreCourt.toLowerCase());
  const titre = d.praticien.titre || prof.libelle;
  const nom = `${d.praticien.prenom} ${d.praticien.nom}`;

  return {
    id: s.id,
    domaine: s.domaine ?? `${s.slug ?? s.id}.pages.dev`,
    demo: s.test,
    profession: { slug: prof.slug, libelle: prof.libelle, specialiteSchema: prof.specialite_schema },
    praticien: {
      prenom: d.praticien.prenom,
      nom: d.praticien.nom,
      titre,
      rpps: d.praticien.rpps,
      ordre: `Inscription au tableau de l’${prof.ordre}`,
      conventionnement: '',
      parcours: `${nom}, ${titre.toLowerCase()}, vous accueille au cabinet à ${lieu}.`,
      formations: [],
      langues: ['Français'],
    },
    cabinet: {
      nom: d.cabinet.nom || `Cabinet de ${nom}`,
      adresse: d.cabinet.adresse,
      codePostal: d.cabinet.codePostal,
      ville,
      quartier: lieu,
      telephone: formaterTelephone(d.cabinet.telephone),
      acces: [],
      pmr: d.cabinet.pmr,
      horaires: d.cabinet.horaires,
      tarifs: [],
    },
    rdv: d.rdv,
    theme: d.theme,
    accroche: {
      titre: defauts.accrocheTitre,
      texte: `${prof.libelle} à ${lieu}, je vous accueille pour ${
        listeSoins.length > 1 ? `${listeSoins.slice(0, -1).join(', ')} et ${listeSoins.at(-1)}` : listeSoins[0] ?? 'vos soins'
      }.`,
    },
    soins,
    faqGenerale: defauts.faq({ pmr: d.cabinet.pmr, plateforme: d.rdv.plateforme }),
    articles: [],
    tracking: {},
    mentions: {
      editeur: `${nom}, ${titre.toLowerCase()}`,
      hebergeur: 'Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, États-Unis',
    },
  };
}
