// Site de TEST local (jamais publié, jamais lu dans Supabase) : brouillon quasi vide assemblé comme un site publié, pour
// vérifier les replis des informations manquantes (packages/core/src/replis.ts, assemblerSite dans lib/supabase.ts).
//   SITE_ID=test-brouillon-minimal MODELE=tableau npx astro build --outDir <dossier>
// BROUILLON=vide (défaut) : brouillon totalement vide ; BROUILLON=nom : seulement le nom du cabinet ;
// BROUILLON=provisoire : textes provisoires « [..] », lien vers l'accueil de la plateforme, code postal invalide, e-mail seul.
// MODELE=<modèle intégré> (proximite par défaut : gabarit classique ; tableau, village, revue : nouveaux gabarits).
import { draftVide, modeleDuSite, modeleIntegre, packVisuel, validerChoixLogo, type SiteConfig } from '@plateforme/core';
import { assemblerSite, type LigneSoin } from '../../lib/supabase';
import demo from './demo-podologue-lyon';

const d = draftVide();
const cas = process.env.BROUILLON ?? 'vide';
if (cas === 'nom') d.cabinet.nom = 'Cabinet des Tilleuls';
if (cas === 'provisoire') {
  d.cabinet = { ...d.cabinet, nom: 'Cabinet [Nom]', ville: 'Lyon', telephone: '04 78', email: 'contact@exemple.fr' };
  d.lieux[0] = { ...d.lieux[0], adresse: '12 rue des Tilleuls', codePostal: '6900', ville: 'Lyon', horaires: d.lieux[0].horaires.map((h) => ({ ...h, heures: '' })) };
  d.praticiens[0] = { ...d.praticiens[0], prenom: 'Camille', nom: '', bio: 'xxx' };
  d.praticiens.push({ ...d.praticiens[0], id: 'p2', prenom: '', nom: 'Bernard', bio: 'Je vous reçois au cabinet.\n\nN° d’Ordre : [NumOrdre]' });
  d.rdv = { mode: 'les_deux', outil: 'Doctolib', url: 'https://www.doctolib.fr/' };
  d.message = { texte: 'Lorem ipsum dolor sit amet', jusquAu: '' };
}
d.theme.modele = process.env.MODELE ?? 'proximite';

// Catalogue de soins : celui de la démo (mêmes textes que le catalogue de la profession, sans accès à Supabase).
const catalogue: LigneSoin[] = demo.soins.map((s) => ({
  slug: s.slug, titre_court: s.titreCourt, titre: s.titre.replace(/ à Lyon( 6e)?$/, ' à {ville}'), resume: s.resume, corps: s.corps, faq: s.faq, icone: s.icone ?? null,
}));
const pack = packVisuel(d.theme.specialite);

const site: SiteConfig = assemblerSite({
  ligne: { id: 'test-brouillon-minimal', slug: 'test-brouillon-minimal', domaine: 'test-brouillon-minimal.pages.dev', test: false, options: null, updated_at: '2026-10-05', publiee_le: '2026-10-05' },
  apercu: false,
  d,
  prof: { slug: 'podologue', libelle: 'Pédicure-podologue', specialite_schema: 'Podiatric', ordre: 'Ordre des pédicures-podologues' },
  catalogue,
  articles: [],
  modele: modeleDuSite(modeleIntegre(d.theme.modele), d.theme),
  pack,
  visuelsSpecialite: pack,
  persoPack: null,
  persoSecondaire: null,
  logo: validerChoixLogo(d.theme.logo),
});

export default site;
