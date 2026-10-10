'use client';

// Images en situation d'un DESIGN de la chaîne (chaine-images.ts) : design habillé des images du profil de démonstration, choix
// enregistrés (préférences de rendu design × profil × emplacement) puis aperçu instantané de la candidate qu'on fait défiler.
// Partagé par la relecture guidée et la fiche du modèle ; le contrôle sur l'image est ChoixImagesSituation (générique).
import { useEffect, useMemo, useState } from 'react';
import { themeIllustre, themeParId, type PageStructure, type PhotoBanque, type PoidsAtelier } from '@plateforme/core';
import {
  appliquerChoixImages, candidatesDuContexte, candidatesHeros, choixEnVigueur, emplacementsDe, imageA, libelleEmplacement,
  type CandidateImage, type ChoixImage, type EmplacementImage,
} from '@plateforme/core/chaine-images';
import ChoixImagesSituation, { type EmplacementSituation } from '@/components/ChoixImagesSituation';
import ApercuModele, { type RenduChaine, type ScenarioChaine } from './ApercuModele';
import { useRenduProfil } from './ApercuDesign';
import type { ProfilRendu } from './rendu-profil';
import { choisirImage } from './images-actions';

/** L'image affichée fait toujours partie des candidates (« Garder ») */
const avecActuelle = (l: CandidateImage[], actuelle: string | null): CandidateImage[] => (!actuelle || l.some((c) => c.image === actuelle) ? l : [{ image: actuelle, note: null, valide: true }, ...l]);

export type DonneesImages = { candidates: Record<string, CandidateImage[]>; choix: ChoixImage[]; migrationImages: boolean };

export function useImagesSituation(o: { modele: string; design: Record<string, unknown>; profils: ProfilRendu[]; poids: PoidsAtelier | null; photos: PhotoBanque[]; rendu: RenduChaine } & DonneesImages) {
  const vue = useRenduProfil(o.profils, { poids: o.poids, photos: o.photos, rendu: o.rendu });
  const actif = o.profils.length > 0;
  const profil = vue.profil;
  const [locaux, setLocaux] = useState<ChoixImage[]>([]);
  const [apercus, setApercus] = useState<Partial<Record<EmplacementImage, string>>>({});
  useEffect(() => { setApercus({}); }, [profil?.id]);
  const heros = useMemo(() => (profil ? candidatesHeros(profil.scenario.principaux, { illustre: themeIllustre, libelle: (x) => themeParId(x)?.court ?? x }) : []), [profil]);
  // Kit du profil ; sans photo dans le kit, repli sur les photos où le rendu puise déjà (rendu-profil.ts)
  const photos = useMemo(() => (!profil ? [] : o.candidates[profil.id]?.length ? o.candidates[profil.id] : candidatesDuContexte(o.photos, profil)), [profil, o.candidates, o.photos]);
  const cand = useMemo(() => ({ photos, heros }), [photos, heros]);
  const enregistres = useMemo(() => (profil ? choixEnVigueur([...o.choix, ...locaux], o.modele, profil.id) : {}), [profil, o.choix, locaux, o.modele]);
  /** Composition rendue d'un design avec les images choisies (et l'aperçu en cours si `apercu`) */
  const rendre = (design: Record<string, unknown>, apercu = true) => {
    if (!actif) return design;
    const x = appliquerChoixImages(vue.rendre(design), enregistres, cand);
    return apercu ? appliquerChoixImages(x, apercus, cand) : x;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const avecChoix = useMemo(() => rendre(o.design, false), [o.design, actif, profil?.id, enregistres, cand]);
  const affichee = useMemo(() => (actif ? appliquerChoixImages(avecChoix, apercus, cand) : avecChoix), [actif, avecChoix, apercus, cand]);
  const emplacements: EmplacementSituation[] = useMemo(() => (actif ? emplacementsDe(avecChoix).map((e) => ({
    id: e, libelle: libelleEmplacement(e), type: e === 'heros' ? 'illustration' as const : 'photo' as const,
    actuelle: imageA(affichee, e), enregistree: imageA(avecChoix, e), candidates: e === 'heros' ? heros : avecActuelle(photos, imageA(avecChoix, e)),
  })) : []), [actif, avecChoix, affichee, heros, photos]);
  const onApercu = (e: string, img: string | null) => setApercus((a) => { const x = { ...a }; if (img) x[e as EmplacementImage] = img; else delete x[e as EmplacementImage]; return x; });
  const onChoisir = async (e: string, image: string) => {
    if (!profil) return { ok: false, message: 'Aucun profil.' };
    const r = await choisirImage(o.modele, profil.id, e, image);
    // Migration 0063 absente : le choix reste montré le temps de la page
    if (r.ok || o.migrationImages || /0063/.test(r.message)) {
      setLocaux((l) => [...l, { modele: o.modele, profil: profil.id, emplacement: e as EmplacementImage, image, le: new Date().toISOString() }]);
      setApercus((a) => { const n = { ...a }; delete n[e as EmplacementImage]; return n; });
    }
    return r;
  };
  return { vue, actif, affichee, rendre, emplacements, onApercu, onChoisir, scenario: vue.scenario, reinitialiser: () => setApercus({}) };
}

/** Fiche du modèle : aperçu du design avec le contrôle d'images sur la page (téléphone ou ordinateur) */
export default function ApercuDesignImages(p: { modele: string; design: Record<string, unknown>; profils: ProfilRendu[]; poids: PoidsAtelier | null; photos: PhotoBanque[]; rendu: RenduChaine; scenarioDefaut: ScenarioChaine; hauteur: number; page?: PageStructure } & DonneesImages) {
  const [appareil, setAppareil] = useState<'mobile' | 'ordinateur'>('ordinateur');
  const im = useImagesSituation(p);
  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {(['mobile', 'ordinateur'] as const).map((a) => <button key={a} type="button" aria-pressed={appareil === a} onClick={() => setAppareil(a)} className={`min-h-11 rounded-lg border px-3 text-sm ${appareil === a ? 'border-teal-800 bg-teal-50 font-semibold' : 'border-neutral-300 bg-white'}`}>{a === 'mobile' ? 'Téléphone' : 'Ordinateur'}</button>)}
        {im.vue.selecteur}
      </div>
      <div className={appareil === 'mobile' ? 'mx-auto w-full max-w-[400px]' : ''}>
        <ChoixImagesSituation emplacements={im.emplacements} onApercu={im.onApercu} onChoisir={im.onChoisir}>
          <ApercuModele composition={im.affichee} scenario={im.scenario ?? p.scenarioDefaut} rendu={p.rendu} page={p.page} appareil={appareil} hauteur={appareil === 'mobile' ? 640 : p.hauteur} />
        </ChoixImagesSituation>
      </div>
      {im.emplacements.length > 0 && <p className="text-xs text-neutral-600">Survolez ou touchez une photo ou l’illustration du haut pour en choisir une autre (‹ ›, molette) : le choix vaut pour ce profil, le design ne change pas.</p>}
    </div>
  );
}
