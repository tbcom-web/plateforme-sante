// Site de TEST local (jamais publié) : personnalisations à l'autre extrême (taille « Plus petit », titres condensés, gamme vitaminée,
// couleur secondaire sombre, image d'accueil choisie en style illustrations, page de soin réduite au minimum : blocs réglementaires
// seulement). Contrôles : minimum lisible sur téléphone, aucun débordement. SITE_ID=test-perso-extreme-petit
import { sitePersonnalise } from './test-perso-extreme-grand';

export default sitePersonnalise('test-perso-extreme-petit', {
  police: 'condensee',
  taille: 'petite',
  couleurs: { gamme: 'lavande', secondaire: '#1d2240' },
  images: { accueil: { url: '/photos/enfant-baskets.webp', source: 'televersee', focal: { x: 40, y: 60 } } },
  pages: { 'soin:bilan-podologique': [{ id: 'p1', type: 'paragraphe', texte: 'Bilan sur rendez-vous.' }] },
});
