// Site de TEST local (jamais publié, jamais lu dans Supabase) : la démo avec TOUS les soins du catalogue visuel
// (VISUELS_SOINS de packages/core/src/jeux.ts). Test de non-régression de « npm run verifier » : chaque soin connu doit
// se construire sur chaque modèle (légendes, dessins, schémas, pictos), même les fiches que la démo n'affiche pas.
//   SITE_ID=test-tous-soins MODELE=technique npx astro build --outDir <dossier>
// Les textes ajoutés sont des textes de test courts, sans valeur éditoriale. Ajouter ici tout nouveau soin du catalogue
// (le contrôle en fin de fichier échoue sinon).
import { VISUELS_SOINS, type SiteConfig, type Soin } from '@plateforme/core';
import demo from './demo-podologue-lyon';

const essai = (slug: string, titreCourt: string): Soin => ({
  slug,
  titre: `${titreCourt} à Lyon`,
  titreCourt,
  resume: `Texte de test : ${titreCourt.toLowerCase()} au cabinet.`,
  corps: `## ${titreCourt}\n\nTexte de test de la fiche, pour vérifier la construction de la page.\n\n## Déroulement\n\n1. **Échange** sur votre gêne.\n2. **Examen** des pieds.\n3. **Conseils** adaptés.`,
  faq: [{ q: `Question de test sur ${titreCourt.toLowerCase()} ?`, r: 'Réponse de test.' }],
});

const AJOUTS: Soin[] = [
  essai('posturologie', 'Posturologie'),
  essai('podologie-du-senior', 'Podologie du senior'),
  essai('verrues-plantaires', 'Verrues plantaires'),
  essai('ongle-incarne', 'Ongle incarné'),
  essai('douleur-talon', 'Douleur au talon'),
  essai('laser', 'Laser'),
  essai('k-taping', 'K-taping'),
  essai('orthonyxie', 'Orthonyxie'),
  essai('onychoplastie', 'Onychoplastie'),
  essai('orthoplastie', 'Orthoplastie'),
  essai('mycose-ongles', 'Mycose des ongles'),
  essai('soins-a-domicile', 'Soins à domicile'),
];

const connus = new Set(demo.soins.map((s) => s.slug));
const soins = [...demo.soins, ...AJOUTS.filter((s) => !connus.has(s.slug))];

// Contrôle limité à la construction de ce site de test : tous les fichiers de src/data/sites sont chargés à chaque
// construction (lib/site.ts), une publication ne doit jamais échouer à cause de ce fichier.
const manquants = Object.keys(VISUELS_SOINS).filter((slug) => !soins.some((s) => s.slug === slug));
if (process.env.SITE_ID === 'test-tous-soins' && manquants.length) throw new Error(`test-tous-soins : soins du catalogue absents du site de test : ${manquants.join(', ')}`);

const site: SiteConfig = {
  ...demo,
  id: 'test-tous-soins',
  domaine: 'test-tous-soins.pages.dev',
  demo: true,
  soins,
};

export default site;
