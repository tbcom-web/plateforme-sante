// Site de TEST local (jamais publié) : personnalisations du praticien POUSSÉES AU MAXIMUM (personnalisations-site.ts) pour les
// contrôles de débordement et de rendu (controle:debordement, controle:webkit) : taille « Très grand », titres en MAJUSCULES,
// grands titres fins (Garamond), couleur libre trop claire (foncée automatiquement), couleur secondaire vive, photo par sujet,
// pages de soins réécrites (blocs ajoutés, supprimés, réordonnés ; blocs réglementaires toujours présents).
//   SITE_ID=test-perso-extreme-grand MODELE=tableau npx astro build --outDir <dossier>
import { ajusterCouleurPrincipale, ajusterCouleurSecondaire, modeleDuSite, pagesPersonnalisees, type ReglagesPerso, type SiteConfig } from '@plateforme/core';
import base from './test-tous-soins';

/** Applique au site assemblé les réglages du praticien (même ordre que lib/supabase.ts : couche en dernier) */
export function sitePersonnalise(id: string, r: ReglagesPerso, typo?: SiteConfig['theme']['typo']): SiteConfig {
  const couleur = r.couleurs?.principale ? ajusterCouleurPrincipale(r.couleurs.principale).couleur : base.theme.couleur;
  const theme = {
    ...base.theme, couleur, ...(r.couleurs?.gamme ? { gamme: r.couleurs.gamme } : {}),
    ...(r.taille ? { taille: r.taille } : {}), ...(r.couleurs?.secondaire ? { couleurSecondaire: ajusterCouleurSecondaire(r.couleurs.secondaire).couleur } : {}),
    ...(typo ? { typo } : {}), ...(r.images?.accueil ? { accueilPhoto: true as const } : {}),
  };
  return {
    ...base,
    id,
    domaine: `${id}.pages.dev`,
    demo: true,
    theme,
    modele: modeleDuSite(base.modele, { police: r.police, typo }),
    soins: pagesPersonnalisees(base.soins, r, 'podologue'),
    photos: {
      ...base.photos,
      ...(r.images?.accueil ? { accueil: r.images.accueil.url } : {}),
      sujets: Object.fromEntries(Object.entries(r.images ?? {}).filter(([e]) => e.startsWith('sujet:')).map(([e, x]) => [e.slice(6), x.url])),
    },
  };
}

const REGLAGES: ReglagesPerso = {
  police: 'luxe',
  taille: 'tres-grande',
  couleurs: { principale: '#ffe1ad', secondaire: '#f2df3a' },
  images: { accueil: { url: '/photos/cabinet-lumiere.webp', source: 'kit' }, 'sujet:sport': { url: '/photos/analyse-plateforme.webp', source: 'kit' } },
  pages: {
    'soin:semelles-orthopediques': [
      { id: 'p1', type: 'intertitre', texte: 'Semelles orthopédiques sur mesure pour la marche, la course et le travail debout', niveau: 2 },
      { id: 'p2', type: 'paragraphe', texte: 'Les semelles sont conçues au cabinet de pédicurie-podologie après un examen complet : marche, chaussures, douleurs. '.repeat(6).trim() },
      { id: 'p3', type: 'liste', texte: '', items: ['Examen de la marche et des appuis', 'Moulage ou empreinte du pied', 'Essai et ajustements au cabinet', 'Contrôle après quelques semaines de port'] },
      { id: 'p4', type: 'encadre', texte: 'Apportez vos chaussures habituelles et vos anciennes semelles au rendez-vous.' },
      { id: 'm0', ref: true },
      { id: 'p5', type: 'question', texte: 'Combien de temps faut-il pour s’habituer à des semelles orthopédiques ?', reponse: 'Quelques jours à quelques semaines, en augmentant progressivement la durée de port.' },
    ],
  },
};

const site = sitePersonnalise('test-perso-extreme-grand', REGLAGES, { echelle: 'spectaculaire', casse: 'majuscules', graisse: 'paire', interlettrage: 'large', accent: 'italique', alignement: 'centre', surtitre: 'pastille' });
export default site;
