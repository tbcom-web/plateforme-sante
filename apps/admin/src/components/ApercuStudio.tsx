'use client';

// Aperçu d'un élément du studio de recettes dans « Donner mon avis » (tuiles « Structures de pages », « Éléments », « Effets ») :
// le site de démonstration (cabinet fictif, sujets Sport et Enfant, gabarit tableau, village ou revue) rendu par ApercuTheme
// avec la variante, la structure de page ou le jeu d'effets de la clé (compositionPourCle), et seulement les blocs concernés
// (blocsPourCle) ; les effets jouent : survol simulé en boucle et apparition rejouable (comme le studio).
import { useEffect, useMemo, useState } from 'react';
import {
  appliquerRecette, blocsPourCle, vuePourCle, compositionInitiale, compositionPourCle, draftVide, gabaritModele, modeleIntegre, universCatalogue,
  STRUCTURES, type MarqueImportee, type ModeleManifeste, type SiteDraft, type Structure, type Univers,
} from '@plateforme/core';
import ApercuTheme from '@/components/ApercuTheme';
import SpecimenHabillage from '@/components/SpecimenHabillage';
import type { SoinCatalogue } from '@/lib/sites';

type Props = {
  cle: string;
  proposes: Univers[];
  modeles: { id: string; manifeste: ModeleManifeste }[];
  catalogue: SoinCatalogue[];
  marquesImportees: MarqueImportee[];
  themesActives: string[];
  mobile?: boolean;
  /** Rendu nu (DoubleRendu : le cadre est fourni par le parent ; sans commandes) */
  nu?: boolean;
  /** Rendu nu : hauteur affichée de la vignette (défaut 600 téléphone, 560 ordinateur) */
  vignette?: number;
  /** Rendu nu : hauteur imposée AVEC défilement (planche des menus : barre collante au défilement) ; prime sur `vignette` */
  hauteur?: number;
};

/** Photos de démonstration de la galerie du cabinet (banque intégrée, jamais « posture ») */
export const PHOTOS_GALERIE_DEMO = ['/photos/analyse-plateforme.webp', '/photos/sport-course.webp', '/photos/enfant-chaussures.webp', '/photos/sport-chaussure.webp'];

/** Cabinet fictif complet (téléphone, e-mail, adresse, deux praticiens, photos du cabinet) : chaque élément a de quoi s'afficher */
export function draftStudio(principaux: string[], secondaires: string[] = [], couleurs: string[] = []): SiteDraft {
  const d = draftVide();
  d.cabinet = { ...d.cabinet, nom: 'Cabinet de podologie', ville: 'Lyon', quartier: 'Brotteaux', telephone: '04 00 00 00 00', email: 'cabinet@exemple.fr' };
  d.lieux[0] = { ...d.lieux[0], adresse: '10 rue de la Démo', codePostal: '69006', ville: 'Lyon' };
  d.praticiens = [{ ...d.praticiens[0], prenom: 'Camille', nom: 'Rousseau' }, { ...d.praticiens[0], id: 'demo2', prenom: 'Julien', nom: 'Bernard' }];
  d.priorites = { principaux, secondaires };
  d.couleursPreferees = couleurs;
  d.photos = { ...d.photos, cabinet: [...PHOTOS_GALERIE_DEMO] };
  return d;
}

export default function ApercuStudio({ cle, proposes, modeles, catalogue, marquesImportees, themesActives, mobile = false, nu = false, vignette, hauteur }: Props) {
  const modele = (id: string) => modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id);
  // Structure rendue : la première dont le gabarit porte les variantes (tableau, village, revue), parmi celles du parcours
  const structure = useMemo<Structure>(() => STRUCTURES.find((s) => proposes.some((u) => u.id === s) && gabaritModele(modele(universCatalogue(s)?.preReglage.modele ?? 'tableau')) !== 'classique') ?? 'clair-pratique',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [proposes, modeles]);
  const effets = cle.startsWith('effets:');
  const [survol, setSurvol] = useState(false);
  const [rejouer, setRejouer] = useState(0);
  useEffect(() => { if (!effets) return; const t = setInterval(() => setSurvol((x) => !x), 1400); return () => clearInterval(t); }, [effets]);
  const apercu = useMemo(() => {
    const d = draftStudio(['sport', 'enfant']);
    const ctx = { sujets: ['sport', 'enfant'], principaux: 2, modele };
    const base = { ...compositionInitiale(ctx), structure };
    const x = compositionPourCle({ ...base, effets: 'sobre' }, cle);
    return appliquerRecette(d, x, { proposes, modeles: modeles.map((m) => m.manifeste), soinsConnus: catalogue.map((c) => c.slug), themesActives });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, structure, proposes, modeles, catalogue, themesActives]);
  // Typographies et détails : spécimen lisible (titre, surtitre, paragraphe, bouton, carte, citation) ; menus : l'accueil (en-tête)
  if (/^(typo|details):/.test(cle)) return nu ? <SpecimenHabillage cle={cle} mobile={mobile} vignette={mobile ? 600 : 560} /> : <div aria-hidden="true" className={`overflow-hidden bg-neutral-100 ring-1 ring-black/10 ${mobile ? 'mx-auto w-[300px] max-w-full rounded-[22px] ring-4 ring-neutral-800' : 'rounded-xl'}`}><SpecimenHabillage cle={cle} mobile={mobile} /></div>;
  if (!apercu) return <p className="text-sm text-neutral-600">Aperçu indisponible.</p>;
  if (nu) return <ApercuTheme key={`${cle}|${mobile}`} sansCommandes vignette={hauteur ? undefined : vignette ?? (mobile ? 600 : 560)} hauteurCadre={hauteur} vueInitiale={vuePourCle(cle)} survol={survol} seul={blocsPourCle(cle)} appareil={mobile ? 'mobile' : 'bureau'} draft={apercu.draft} modele={apercu.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} />;
  return (
    <div className="grid gap-2">
      {effets && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-neutral-600">Survol simulé en boucle (cartes, visuels, boutons).</span>
          <button type="button" onClick={() => setRejouer((n) => n + 1)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700">Rejouer l’apparition</button>
        </div>
      )}
      <div aria-hidden="true" className={`overflow-hidden bg-neutral-100 ring-1 ring-black/10 ${mobile ? 'mx-auto w-[300px] max-w-full rounded-[22px] ring-4 ring-neutral-800' : 'rounded-xl'}`}>
        <ApercuTheme key={`${cle}|${rejouer}|${mobile}`} vueInitiale={vuePourCle(cle)} survol={survol} seul={blocsPourCle(cle)} appareil={mobile ? 'mobile' : 'bureau'} draft={apercu.draft} modele={apercu.modele} catalogue={catalogue} marquesImportees={marquesImportees} jeuPhotos={null} />
      </div>
    </div>
  );
}
