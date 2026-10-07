// Catalogue de la bibliothèque partagée : éléments repris du studio ÉcranZen (C:\Users\pault\Desktop\TBCOM CLAUDE\ecranzen\studio),
// au FORMAT de son catalogue (studio/catalogue/schema.md : id, slug, niveau, titre, vue, professions, zones, sujets, statut, valide_par,
// version…) pour garder simple la future fusion des deux bibliothèques. Chaque entrée garde l'ID ÉcranZen d'origine.
//
// Statut : celui du catalogue ÉcranZen au 2026-10-04 (assets.json), sauf POD-AT-0008, POD-AT-0009, POD-AT-0010 et la semelle orthopédique
// en couleur, validés par Paul pour les sites webpodologue le 2026-10-04 (décision côté sites : rien n'est écrit dans le studio ÉcranZen). « valide » = atome validé par Paul dans le studio (même si le module
// de géométrie qui le produit garde « PROPOSÉ » dans son en-tête : c'est l'atome qui est validé, pas les ajouts proposés du module). Les éléments HTML
// (semelle orthopédique, chaussure de running, praticien) ne sont pas encore au catalogue ÉcranZen : statut « brouillon », sans
// valide_par. Ajouts propres aux sites : `declinaisons` (vue / état → forme de formes.ts), `usages_sites`, `limites`.
import type { Registre } from '../dessins';
import { svgForme } from './rendu';
import { svgLigne, LIGNE_FORME, type OptionsLigne } from '../ligne';

export type StatutBibliotheque = 'reserve' | 'brouillon' | 'en-validation' | 'valide' | 'a-revalider' | 'retire';

export interface DeclinaisonBibliotheque {
  vue: string;
  etat: string;
  /** Clé de la forme (formes.ts) */
  forme: string;
  /** Statut propre à la déclinaison s'il diffère de l'élément (état proposé après la validation de l'atome) */
  statut?: StatutBibliotheque;
  version?: string;
  /** Déclinaison dérivée côté sites (bibliotheque/derivees.ts) : origine et validation */
  source?: string;
  valide_par?: string;
  valide_le?: string;
}

export interface ElementBibliotheque {
  /** ID ÉcranZen d'origine (POD-AT-0001…) ; « EZ-HTML/<objet> » pour un élément HTML pas encore au catalogue */
  id: string;
  slug: string;
  niveau: 'atome' | 'molecule' | 'scene' | 'element-html';
  titre: string;
  description: string;
  professions: string[];
  zones: string[];
  sujets: string[];
  tags: string[];
  /** Vue canonique par défaut */
  vue: string;
  statut: StatutBibliotheque;
  valide_par: string | null;
  valide_le?: string;
  version: string;
  /** Source ÉcranZen (chemin dans le studio et fonction de géométrie) */
  source: string;
  /** Portée et licence : création TBCOM (générée pour Paul), aucun média externe sous licence */
  licence: string;
  compose_de: string[];
  declinaisons: DeclinaisonBibliotheque[];
  /** Pages ou soins des sites où l'élément est utile */
  usages_sites: string[];
  /** Règles d'usage (référentiels ÉcranZen, pièges de lecture) */
  limites: string[];
}

const LICENCE = 'global – création TBCOM (générée pour Paul par le studio ÉcranZen), aucun média externe';
const G = (f: string, fn: string) => `ÉcranZen studio outils/lib/geometrie/${f} — ${fn}`;
const H = (f: string) => `ÉcranZen studio html/elements/${f} (générique, sans marque : voir JURIDIQUE.md du dossier)`;
const d = (vue: string, etat: string, forme: string, o: Partial<DeclinaisonBibliotheque> = {}): DeclinaisonBibliotheque => ({ vue, etat, forme, ...o });
const PAUL = 'Paul Tremblot';

export const BIBLIOTHEQUE: readonly ElementBibliotheque[] = [
  {
    id: 'POD-AT-0001', slug: 'pied-dorsal', niveau: 'atome', titre: 'Pied droit, vue de dessus',
    description: 'Pied adulte vu de dessus : dos du pied, cheville, tendons extenseurs, cinq orteils articulés et leurs ongles.',
    professions: ['podologie'], zones: ['pied', 'orteils', 'ongles'], sujets: ['anatomie', 'hygiene-pieds', 'pied-diabetique'], tags: ['dorsal', 'adulte'],
    vue: 'dorsale', statut: 'valide', valide_par: PAUL, version: '1.0.0', source: G('pied.mjs', 'modelePiedDorsal()'), licence: LICENCE, compose_de: [],
    declinaisons: [d('dorsale', 'repos', 'pied-dorsal')],
    usages_sites: ['Soins des pieds et des ongles (vue d’ensemble)', 'Pied diabétique : examen et surveillance', 'Conseils d’hygiène'],
    limites: ['Aucune couleur posée sur la peau (lecture « maladie ») : désigner par un médaillon de zoom', 'Pas de main qui touche le pied'],
  },
  {
    id: 'POD-AT-0002', slug: 'pied-plantaire', niveau: 'atome', titre: 'Pied droit, vue de dessous',
    description: 'Plante du pied adulte : talon, voûte non portante plus claire, coussinet du talon, pli des orteils, cinq orteils.',
    professions: ['podologie'], zones: ['pied', 'plante', 'arche-mediale'], sujets: ['anatomie', 'appuis', 'peau-seche'], tags: ['plantaire', 'adulte'],
    vue: 'plantaire', statut: 'valide', valide_par: PAUL, version: '1.0.0', source: G('pied.mjs', 'modelePiedPlantaire()'), licence: LICENCE, compose_de: [],
    declinaisons: [d('plantaire', 'repos', 'pied-plantaire')],
    usages_sites: ['Examen podologique, bilan des appuis', 'Hyperkératoses, cors, verrues plantaires (avec médaillon)', 'Pied diabétique'],
    limites: ['La pression ne se peint pas sur la peau : sur la vitre du podoscope ou l’empreinte (élément « empreinte »)', 'Pas de rond creux sur la plante (lecture « douleur »)'],
  },
  {
    id: 'POD-SC-0007', slug: 'empreinte', niveau: 'scene', titre: 'Empreinte plantaire (trace d’appui)',
    description: 'Trace d’appui réelle d’un pied droit : talon ovale, bande externe, avant-pied, pulpes des orteils, voûte sans appui.',
    professions: ['podologie'], zones: ['plante'], sujets: ['appuis', 'orthese-plantaire', 'examen-podologique'], tags: ['empreinte', 'podoscope'],
    vue: 'plantaire', statut: 'valide', valide_par: PAUL, version: '1.0.0', source: G('semelle.mjs', 'modeleTraceAppuis({ orteils: true }) — trace d’appui de POD-SC-0007 (S2)'), licence: LICENCE, compose_de: ['POD-AT-0002'],
    declinaisons: [d('plantaire', 'trace', 'empreinte')],
    usages_sites: ['Examen podologique, podoscope, baropodométrie', 'Semelles orthopédiques (prise d’empreinte)'],
    limites: ['Couleur = appui, jamais une mesure : garder la mention « Représentation illustrative, sans valeur de mesure » si des valeurs s’affichent'],
  },
  {
    id: 'POD-AT-0003', slug: 'pied-profil-medial', niveau: 'atome', titre: 'Pied droit, vue de profil médial',
    description: 'Pied et bas de jambe vus du côté interne : arche médiale décollée du sol, malléole, hallux et ongle ; état « ongle épais » (v1.2).',
    professions: ['podologie'], zones: ['pied', 'arche-mediale', 'cheville', 'hallux'], sujets: ['anatomie', 'orthese-plantaire', 'marche', 'ongles-epais'], tags: ['profil', 'adulte'],
    vue: 'profil-medial', statut: 'valide', valide_par: PAUL, version: '1.0.0', source: G('pied-profil.mjs', 'modelePiedProfilMedial() (module marqué « PROPOSÉ » dans son en-tête ; atome validé par Paul dans catalogue/assets.json)'), licence: LICENCE, compose_de: [],
    declinaisons: [d('profil-medial', 'repos', 'pied-profil-medial'), d('profil-medial', 'ongle-epais-meulage', 'pied-profil-ongle-epais-meulage', { statut: 'brouillon', source: 'dessin sites 2026-10-05, fiches de soins de la migration 0020 (bibliotheque/soins-ongles.ts), à valider par Paul' }), d('profil-medial', 'ongle-epais', 'pied-profil-ongle-epais', { statut: 'en-validation', version: '1.2.0' })],
    usages_sites: ['Semelles orthopédiques (pied posé)', 'Voûte plantaire, marche', 'Ongles épais (onychogryphose) : cadrage serré sur l’hallux'],
    limites: ['Arche médiale jamais au sol', 'Ongle épais : jamais jauni ni strié (lecture « mycose »)'],
  },
  {
    id: 'POD-AT-0008', slug: 'squelette-pied-profil-medial', niveau: 'atome', titre: 'Anatomie du pied de profil : os, tendon calcanéen, aponévrose plantaire',
    description: 'POD-AT-0003 en transparence (voile de peau) : tibia, fibula, squelette du pied, tendon calcanéen fondu vers le haut, aponévrose plantaire schématisée ; variante avec épine calcanéenne.',
    professions: ['podologie'], zones: ['talon', 'calcaneus', 'aponevrose-plantaire', 'tendon-calcaneen'], sujets: ['talalgie', 'aponevrosite', 'epine-calcaneenne', 'anatomie'], tags: ['profil', 'transparence'],
    vue: 'profil-medial', statut: 'valide', valide_par: PAUL, valide_le: '2026-10-04', version: '0.3.0',
    source: G('jambe-profil.mjs', 'modelePiedProfilMedialTendon({ epine }) + aponevrosePlantaire({ schema: 2 }) — éléments html/elements/pied-profil-anatomie(-epine).svg (HTML-014 v3, HTML-075) — validé pour les sites webpodologue (Paul Tremblot, 2026-10-04 ; statut ÉcranZen inchangé)'),
    licence: LICENCE, compose_de: ['POD-AT-0003'],
    declinaisons: [d('profil-medial', 'anatomie', 'pied-profil-anatomie'), d('profil-medial', 'epine', 'pied-profil-anatomie-epine'), d('aponevrose', 'repos', 'aponevrose-plantaire')],
    usages_sites: ['Talalgie, douleur sous le talon au réveil (aponévrosite plantaire)', 'Épine calcanéenne', 'Tendon d’Achille'],
    limites: ['Os au trait sur un voile clair, jamais os clairs sur fond sombre (lecture « radio ») : poser l’élément sur un fond clair, pas sur le fond plan', 'L’épine se montre comme une forme de l’os, sans rouge ni rond de douleur'],
  },
  {
    id: 'POD-AT-0009', slug: 'hallux-dorsal', niveau: 'atome', titre: 'Gros orteil vu de dessus (ongle détaillé)',
    description: 'POD-AT-0001 agrandi ×3 autour de l’hallux : lame, bord libre, lunule, replis et sillons ; état « incarné » (spicule dans le repli épaissi, sans rouge).',
    professions: ['podologie'], zones: ['hallux', 'ongle'], sujets: ['ongle-incarne', 'coupe-ongles', 'orthonyxie'], tags: ['dorsal', 'zoom'],
    vue: 'dorsale', statut: 'valide', valide_par: PAUL, valide_le: '2026-10-04', version: '0.2.0', source: G('ongle.mjs', 'modeleHalluxDorsal(), ETATS_HALLUX_DORSAL — validé pour les sites webpodologue (Paul Tremblot, 2026-10-04 ; statut ÉcranZen inchangé)'), licence: LICENCE, compose_de: ['POD-AT-0001'],
    declinaisons: [d('dorsale', 'repos', 'hallux-dorsal'), d('dorsale', 'incarne', 'hallux-dorsal-incarne-net', { statut: 'a-revalider', source: 'dérivé de POD-AT-0009 (état incarné), 2026-10-07 : lame sans cran ni spicule triangulaire au coin (Paul : « on dirait que l’ongle est cassé ») ; bibliotheque/derivees.ts, à revoir par Paul' }),
      d('dorsale', 'incarne-sites', 'hallux-dorsal-incarne-sites', { statut: 'a-revalider', source: 'retouche du 2026-10-07 à revoir par Paul (« on dirait qu’il y a un ongle incarné inclus dedans ») : repli gonflé en peau avec rougeur fondue, sans trait intérieur ; auparavant : dérivé de POD-AT-0009, retouche du spicule validée par Paul 2026-10-05 (spicule qui prolonge l’arc de la lame, bout arrondi recouvert par le repli latéral épaissi ; bibliotheque/derivees.ts)' }),
      d('dorsale-gros-plan', 'repos', 'hallux-gros-plan', { statut: 'valide', valide_par: PAUL, source: 'validé par Paul le 2026-10-05 (remarque : le bourrelet enveloppe un peu trop l’ongle, à alléger à la prochaine retouche) ; dessin sites, références de lecture fournies par Paul, 2026-10-05 (gros plan de l’hallux refait de zéro, normal et incarné : contour latéral bombé, peau gonflée sur le bord de la lame, rougeur fondue ; bibliotheque/hallux-gros-plan.ts)' }),
      d('dorsale-gros-plan', 'orthonyxie', 'hallux-gros-plan-orthonyxie', { statut: 'brouillon', source: 'dessin sites 2026-10-05, fiches de soins de la migration 0020 (bibliotheque/soins-ongles.ts), à valider par Paul' }),
      d('dorsale-gros-plan', 'onychoplastie', 'hallux-gros-plan-onychoplastie', { statut: 'brouillon', source: 'dessin sites 2026-10-05, fiches de soins de la migration 0020 (bibliotheque/soins-ongles.ts), à valider par Paul' }),
      d('dorsale-gros-plan', 'mycose', 'hallux-gros-plan-mycose', { statut: 'brouillon', source: 'dessin sites 2026-10-05, fiches de soins de la migration 0020 (bibliotheque/soins-ongles.ts), à valider par Paul' }),
      d('dorsale-gros-plan', 'incarne', 'hallux-gros-plan-incarne', { statut: 'valide', valide_par: PAUL, source: 'validé par Paul le 2026-10-05 (remarque : le bourrelet enveloppe un peu trop l’ongle, à alléger à la prochaine retouche) ; dessin sites, références de lecture fournies par Paul, 2026-10-05 (gros plan de l’hallux refait de zéro, normal et incarné : contour latéral bombé, peau gonflée sur le bord de la lame, rougeur fondue ; bibliotheque/hallux-gros-plan.ts)' })],
    usages_sites: ['Ongle incarné', 'Coupe des ongles (couper droit)', 'Orthonyxie'],
    limites: ['La douleur se montre par un rond creux posé par la page, jamais par du rouge sur la peau', 'Exception décidée par Paul (2026-10-05) pour le gros plan incarné : rougeur fondue, localisée au repli latéral gonflé, plus sombre que la peau ; jamais un aplat rouge à bord net'],
  },
  {
    id: 'POD-AT-0010', slug: 'ongle-hallux-coupe-transversale', niveau: 'atome', titre: 'Ongle du gros orteil en coupe transversale',
    description: 'Coupe au milieu de la lame vue depuis l’arrière de l’orteil : lame bombée, lit, phalange, replis latéraux ; état « incarné ».',
    professions: ['podologie'], zones: ['ongle', 'hallux'], sujets: ['ongle-incarne', 'orthonyxie'], tags: ['coupe'],
    vue: 'coupe-transversale', statut: 'valide', valide_par: PAUL, valide_le: '2026-10-04', version: '0.3.0', source: G('ongle.mjs', 'modeleOngleCoupe(), ETATS_COUPE — validé pour les sites webpodologue (Paul Tremblot, 2026-10-04 ; statut ÉcranZen inchangé)'), licence: LICENCE, compose_de: [],
    declinaisons: [d('coupe-transversale', 'repos', 'ongle-coupe'), d('coupe-transversale', 'incarne', 'ongle-coupe-incarne'), d('coupe-transversale', 'orthonyxie', 'ongle-coupe-orthonyxie', { statut: 'brouillon', source: 'dessin sites 2026-10-05, fiches de soins de la migration 0020 (bibliotheque/soins-ongles.ts), à valider par Paul' })],
    usages_sites: ['Ongle incarné : comprendre la courbure', 'Orthonyxie (redressement de la lame)'],
    limites: ['Schéma de compréhension : toujours accompagné de la vue de dessus (lecture profane difficile seul)'],
  },
  {
    id: 'POD-AT-0004', slug: 'semelle-dorsal', niveau: 'atome', titre: 'Semelle orthopédique, vue de dessus et de dessous',
    description: 'Orthèse plantaire (L/l 2,63) : recouvrement, talonnette, soutien de voûte, barre rétrocapitale ; dessous : coque.',
    professions: ['podologie'], zones: ['plante'], sujets: ['orthese-plantaire', 'semelles'], tags: ['semelle', 'dorsal'],
    vue: 'dorsal', statut: 'valide', valide_par: PAUL, version: '1.0.0', source: G('semelle.mjs', 'modeleSemelleDorsal() (module marqué « PROPOSÉ » dans son en-tête ; atome validé par Paul dans catalogue/assets.json)'), licence: LICENCE, compose_de: [],
    declinaisons: [d('dessus', 'pieces', 'semelle-dorsal'), d('dessous', 'coque', 'semelle-dessous')],
    usages_sites: ['Semelles orthopédiques (orthèses plantaires) : vue d’ensemble et éléments correcteurs'],
    limites: ['Jamais de forme « Paint » : garder la vraie forme (L/l ≈ 2,6)', 'Aucune promesse de résultat associée'],
  },
  {
    id: 'POD-AT-0005', slug: 'semelle-profil-medial', niveau: 'atome', titre: 'Semelle orthopédique, vue de profil médial',
    description: 'Semelle de profil : talon épais, soutien de voûte relevé, avant-pied fin ; coque galbée sous le recouvrement.',
    professions: ['podologie'], zones: ['arche-mediale'], sujets: ['orthese-plantaire', 'semelles'], tags: ['semelle', 'profil'],
    vue: 'profil-medial', statut: 'valide', valide_par: PAUL, version: '1.0.0', source: G('semelle.mjs', 'modeleSemelleProfil() (module marqué « PROPOSÉ » dans son en-tête ; atome validé par Paul dans catalogue/assets.json)'), licence: LICENCE, compose_de: [],
    declinaisons: [d('profil-medial', 'galbee', 'semelle-profil-medial')],
    usages_sites: ['Semelles orthopédiques : la semelle épouse la voûte (avec le pied de profil, même repère)'],
    limites: ['Même repère que POD-AT-0003 : le pied posé est relevé de 9 u'],
  },
  {
    id: 'TRV-AT-0009', slug: 'chaussure-profil-medial', niveau: 'atome', titre: 'Chaussure fermée, vue de profil médial',
    description: 'Chaussure basse sans marque : tige, col sous la malléole, laçage, semelle extérieure avec talon et cambrion.',
    professions: ['transverse'], zones: ['pied'], sujets: ['chaussage', 'orthese-plantaire'], tags: ['chaussure', 'profil'],
    vue: 'profil-medial', statut: 'valide', valide_par: PAUL, version: '1.0.0', source: G('semelle.mjs', 'modeleChaussureProfil() (état ville) (module marqué « PROPOSÉ » dans son en-tête ; atome validé par Paul dans catalogue/assets.json)'), licence: LICENCE, compose_de: [],
    // Retour de Paul du 2026-10-07 (« elle fait trop vieille, il faut un truc plus dynamique, style basket de ville / sneaker ») : vue
    // canonique = basket de ville dessinée pour les sites (bibliotheque/derivees.ts) ; l'ancienne chaussure de ville reste en état « ville ».
    declinaisons: [d('profil-medial', 'basket', 'chaussure-sneaker-profil', { statut: 'brouillon', source: 'dessin sites 2026-10-07 (bibliotheque/derivees.ts, SNEAKER), même repère que l’atome, à valider par Paul' }), d('profil-medial', 'ville', 'chaussure-profil-medial')],
    usages_sites: ['Conseils de chaussage', 'Semelles : « vous les portez dans vos chaussures »'],
    limites: ['Aucune marque, bande ou découpe identifiable'],
  },
  {
    id: 'POD-AT-0006', slug: 'sandale-piscine-dorsal', niveau: 'atome', titre: 'Sandale de piscine vue de dessus (claquette, tong)',
    description: 'Claquette et tong de piscine posées au sol, vues de dessus, sans marque.',
    professions: ['podologie'], zones: ['plante'], sujets: ['verrues', 'piscine', 'chaussage', 'hygiene-pieds'], tags: ['dorsal', 'sandale'],
    vue: 'dorsal', statut: 'valide', valide_par: PAUL, version: '1.0.0', source: G('piscine.mjs', 'modeleSandale(), ETATS_SANDALE (module marqué « PROPOSÉ » dans son en-tête ; atome validé par Paul dans catalogue/assets.json)'), licence: LICENCE, compose_de: [],
    declinaisons: [d('dorsal', 'claquette-posee', 'sandale-claquette'), d('dorsal', 'tong-posee', 'sandale-tong-sites', { statut: 'a-revalider', source: 'dérivé de POD-AT-0006 (tong), 2026-10-07 : bout de la semelle arrondi et droit (Paul : « le haut de la tong est un peu bizarre, normalement il est plus rond / droit ») ; bibliotheque/derivees.ts' }),
      // Tong d'origine (ÉcranZen, validée) : reste disponible pour les contenus publiés tant que la tong retouchée n'est pas validée
      d('dorsal', 'tong-ecranzen', 'sandale-tong')],
    usages_sites: ['Verrues plantaires : prévention (piscine, vestiaires)', 'Mycoses : conseils d’hygiène'],
    limites: ['Conseil de prévention, jamais une promesse (« évite les verrues »)'],
  },
  {
    id: 'TRV-AT-0007', slug: 'medaillon-zoom', niveau: 'atome', titre: 'Médaillon de zoom et rond de repérage',
    description: 'Médaillon circulaire (fond + anneau fin) pour montrer un détail agrandi ; rond de repérage (anneau, rayon 48 u à l’échelle du pied).',
    professions: ['transverse'], zones: [], sujets: ['zoom', 'reperage'], tags: ['medaillon', 'loupe'],
    vue: 'aucune', statut: 'valide', valide_par: PAUL, version: '1.0.0', source: G('objets.mjs', 'modeleMedaillon() — canaux visible / reperage'), licence: LICENCE, compose_de: [],
    declinaisons: [d('medaillon', 'visible', 'medaillon'), d('reperage', 'reperage', 'rond-reperage')],
    usages_sites: ['Tout détail (ongle, verrue, cor) montré sans main sur le pied : médaillon relié au rond'],
    limites: ['Jamais cible, réticule ni croix dans le rond (motif interdit)', 'Rond creux posé sur la peau = « douleur » : le réserver à ce sens, jamais sur un objet'],
  },
  {
    id: 'EZ-HTML/semelle-ortho', slug: 'semelle-orthopedique', niveau: 'element-html', titre: 'Semelle orthopédique en couleur (dessus, dessous, profil)',
    description: 'Orthèse plantaire générique « sport » : recouvrement perforé, coque, talonnette, élément d’avant-pied ; neuve.',
    professions: ['podologie'], zones: ['plante'], sujets: ['orthese-plantaire', 'semelles', 'sport'], tags: ['semelle', 'flat'],
    vue: 'dessus', statut: 'valide', valide_par: PAUL, valide_le: '2026-10-04', version: '2026-10-01', source: H('semelle-ortho/semelle-ortho.js — svg(vue, { modele: "sport", neuve: true }) — validé pour les sites webpodologue (Paul Tremblot, 2026-10-04 ; statut ÉcranZen inchangé)'), licence: LICENCE, compose_de: [],
    declinaisons: [d('dessus', 'neuve', 'semelle-ortho-dessus'), d('dessous', 'neuve', 'semelle-ortho-dessous'), d('profil', 'neuve', 'semelle-ortho-profil')],
    usages_sites: ['Page « Semelles orthopédiques » : visuel principal', 'Podologie du sport'],
    limites: ['Aucun logo, texte ni combinaison de couleurs d’un fabricant (JURIDIQUE.md)', 'Vue 3/4 non reprise : 295 ko, trop lourde pour le mobile'],
  },
  {
    id: 'EZ-HTML/chaussure-running', slug: 'chaussure-running', niveau: 'element-html', titre: 'Chaussure de running (profil, 3/4, dessous)',
    description: 'Chaussure de course générique (mousse épaisse, rocker, tige en maille), coloris « glacier », neuve.',
    professions: ['podologie'], zones: ['pied'], sujets: ['sport', 'chaussage', 'course'], tags: ['chaussure', 'sport', 'flat'],
    vue: 'profil', statut: 'brouillon', valide_par: null, version: '2026-09-30', source: H('chaussure-running/chaussure-running.js — svg(vue, { palette: "glacier" })'), licence: LICENCE, compose_de: [],
    declinaisons: [d('profil', 'neuve', 'chaussure-running-profil'), d('trois-quarts', 'neuve', 'chaussure-running-trois-quarts'), d('dessous', 'neuve', 'chaussure-running-dessous')],
    usages_sites: ['Podologie du sport, analyse de la course', 'Conseils de chaussage du coureur'],
    limites: ['Aucun signe de marque : pas de virgule, bandes, éclair, plaque visible (JURIDIQUE.md)'],
  },
  {
    id: 'EZ-HTML/praticien', slug: 'praticien-neutre', niveau: 'element-html', titre: 'Praticien neutre en blouse',
    description: 'Personnage-symbole : tête ronde unie sans visage, blouse à col V, pied brodé sur la poche ; aucun symbole médical.',
    professions: ['podologie'], zones: [], sujets: ['cabinet', 'equipe'], tags: ['personnage', 'flat'],
    vue: 'neutre', statut: 'brouillon', valide_par: null, version: '2026-10-03', source: H('praticien/praticien.js — svg("neutre", { blouse: "blanche" })'), licence: LICENCE, compose_de: [],
    declinaisons: [d('neutre', 'blouse-blanche', 'praticien')],
    usages_sites: ['Équipe : vignette d’un praticien sans photo', 'Prise de rendez-vous, première consultation'],
    limites: ['Ne remplace jamais la photo du praticien réel quand elle existe ; personne ne doit passer pour le praticien', 'Pas de stéthoscope, croix, caducée ni badge (JURIDIQUE.md)'],
  },
  {
    id: 'SITES/orteil-griffe', slug: 'orteil-griffe-coupe', niveau: 'atome', titre: 'Orteil en griffe, coupe sagittale du 2e rayon',
    description: '2e métatarsien, P1 en hyperextension, P2 et P3 fléchies, peau et ongle ; états « cor » (cor dorsal à noyau, durillon sous la tête, empeigne qui frotte) et « orthoplastie » (crête et anneau en silicone).',
    professions: ['podologie'], zones: ['orteils', 'avant-pied', 'tete-metatarsienne'], sujets: ['cors-durillons', 'orthoplastie', 'orteil-griffe'], tags: ['coupe', 'profil'],
    vue: 'coupe-sagittale', statut: 'retire', valide_par: null, version: '2026-10-05', source: 'dessin sites (bibliotheque/soins-ongles.ts, proportions réelles commentées), pas d’atome ÉcranZen équivalent', licence: LICENCE, compose_de: [],
    declinaisons: [d('coupe-sagittale', 'cor', 'orteil-griffe-cor'), d('coupe-sagittale', 'orthoplastie', 'orteil-griffe-orthoplastie')],
    usages_sites: ['Cors et durillons', 'Orthoplastie'],
    limites: ['RETIRÉE le 2026-10-07 (Paul, 1★ : « on comprend rien, à jeter ») : statut « retiré », plus utilisée nulle part', 'Plus utilisée par les dessins des sites depuis le 2026-10-06 (v3) : coupe jugée illisible par Paul, remplacée par le schéma classique (plante et dessus des orteils, soins-ongles.ts)', 'Schéma de compréhension en coupe : cor ≈ 1/4 de la largeur de l’orteil, teinte de peau à peine jaunie, jamais une boule colorée', 'La déformation n’est jamais corrigée à l’image (pas d’avant / après)'],
  },
];

/** Déclinaison d'un élément (par ID ÉcranZen ou slug) ; vue / état facultatifs (sinon la première déclinaison). */
export function declinaison(id: string, o: { vue?: string; etat?: string } = {}): DeclinaisonBibliotheque {
  const e = BIBLIOTHEQUE.find((x) => x.id === id || x.slug === id);
  if (!e) throw new Error(`bibliothèque : élément inconnu « ${id} »`);
  const dd = e.declinaisons.find((x) => (!o.vue || x.vue === o.vue) && (!o.etat || x.etat === o.etat));
  if (!dd) throw new Error(`bibliothèque : « ${id} » n'a pas de déclinaison ${JSON.stringify(o)}`);
  return dd;
}

/**
 * SVG d'un élément de la bibliothèque, dans la charte des sites (variables --dessin-*, --peau…, --pression-*).
 * svgElement('POD-AT-0001') · svgElement('semelle-orthopedique', { vue: 'profil' }) · svgElement('hallux-dorsal', { etat: 'incarne', registre: 'releve' })
 */
export function svgElement(id: string, opts: { registre?: Registre; vue?: string; etat?: string; titre?: string; classe?: string; ligne?: OptionsLigne } = {}): string {
  const forme = declinaison(id, opts).forme;
  // Registre « ligne » : le dessin au trait continu du même sujet (LIGNE_FORME) ; sinon la forme dans le registre pédagogique
  if (opts.registre === 'ligne') {
    const nom = LIGNE_FORME[forme];
    if (nom) return svgLigne(nom, { ...opts.ligne, classe: opts.classe });
    return svgForme(forme, { ...opts, registre: 'pedagogique' });
  }
  return svgForme(forme, opts);
}
