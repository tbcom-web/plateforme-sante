'use client';

// Présélection infinie SANS THÈME (chaîne des modèles, étape 1 ; décision de Paul du 2026-10-09) : un modèle est un DESIGN. Chaque
// page de 6 est générée et rendue avec un profil de démonstration (rotation : jamais deux pages de suite avec le même), ses images
// venant du kit du profil (rendu-profil.ts). Grilles « Directions » (favoris 4-5 ★, harmonie, diversité garantie), filtre léger
// (exclus, déjà vus, rendus identiques à l'œil). Multi-sélection, « Garder » : candidats (designs) + points dans la Dégustation +
// « J'aime ». « Voir avec un autre thème » : la même carte rendue avec un autre profil.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CHAINE, designDe, elementsComposition, filtreLeger, grilleDirectionsDegustation, profilDemo, serialiserComposition, type PhotoBanque, type PoidsAtelier,
} from '@plateforme/core';
import { empreinteIframe } from '../../admin/degustation/Vignettes';
import ApercuModele, { type RenduChaine } from '../ApercuModele';
import { garderPreselection, type PropositionPreselection } from '../actions';
import { contexteDuProfil, rendreDesign, type ProfilRendu } from '../rendu-profil';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type Carte = PropositionPreselection & { legende: string; rendue: Record<string, unknown>; vu: string };
type Page = { id: number; profil: string; propositions: Carte[]; selection: number[]; etat: 'ouverte' | 'gardee' | 'passee'; message?: string; masquees: number[]; debut: number };

type Props = {
  profils: ProfilRendu[];
  candidats: number;
  dejaVues: string[];
  rendu: RenduChaine;
  poids: PoidsAtelier | null;
  photos: PhotoBanque[];
  tranches: { refuses: string[]; favoris: string[]; notes: string[] };
};

export default function Preselection(props: Props) {
  const [appareil, setAppareil] = useState<'ordinateur' | 'mobile'>('mobile');
  useEffect(() => { if (window.innerWidth >= 1024) setAppareil('ordinateur'); }, []);
  const [pages, setPages] = useState<Page[]>([]);
  const [compte, setCompte] = useState(props.candidats);
  const vues = useRef(new Set(props.dejaVues));
  const graine = useRef(1);
  const dernierProfil = useRef<string | null>(null);
  const tranches = useMemo(() => ({ refuses: new Set(props.tranches.refuses), favoris: new Set(props.tranches.favoris) }), [props.tranches]);
  const profilDe = useCallback((id: string) => props.profils.find((p) => p.id === id) ?? props.profils[0], [props.profils]);
  const ctxDe = useCallback((p: ProfilRendu) => contexteDuProfil(p, { poids: props.poids, photos: props.photos, modeles: props.rendu.modeles }), [props.poids, props.photos, props.rendu.modeles]);
  const scenario = (p: ProfilRendu) => ({ principaux: p.scenario.principaux, secondaires: p.scenario.secondaires, couleurs: p.scenario.couleurs });

  /** Une page de 6 designs, rendue avec un profil de démonstration différent de la page précédente */
  const generer = useCallback((): Page | null => {
    const g0 = graine.current;
    const profil = profilDemo(props.profils, g0 * 2654435761, dernierProfil.current);
    if (!profil) return null;
    dernierProfil.current = profil.id;
    const ctx = ctxDe(profil);
    const retenues: Carte[] = [];
    for (let essai = 0; essai < 6 && retenues.length < CHAINE.tailleGrille; essai++) {
      const g = grilleDirectionsDegustation({ contexte: ctx, notes: props.poids?.notesElements ?? {}, tranches, graine: (graine.current++ * 7919 + 17) >>> 0 });
      for (const p of g?.propositions ?? []) {
        if (retenues.length >= CHAINE.tailleGrille || !p.x) continue;
        const design = designDe(p.x);
        const cle = p.cle;
        const f = filtreLeger({ cle: p.cle, violationsDures: 0, elements: elementsComposition(p.x, ctx.sujets), exclus: tranches.refuses, dejaVues: vues.current });
        if (!f.garde) continue;
        vues.current.add(p.cle);
        retenues.push({ cle, nom: `${p.etiquette ?? 'Direction'} ${p.cle.slice(5, 9)}`, design, ingredients: p.ingredients as Record<string, unknown>, profilDemo: profil.id,
          legende: [p.etiquette, ...(p.mots ?? [])].filter(Boolean).join(' · '), rendue: JSON.parse(serialiserComposition(p.x)), vu: profil.id });
      }
    }
    return retenues.length >= 2 ? { id: g0, profil: profil.id, propositions: retenues, selection: [], etat: 'ouverte', masquees: [], debut: Date.now() } : null;
  }, [props.profils, props.poids, ctxDe, tranches]);

  useEffect(() => { const p = generer(); setPages(p ? [p] : []); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const garder = useCallback(async (id: number) => {
    const p = pages.find((x) => x.id === id);
    if (!p || p.etat !== 'ouverte') return;
    const selection = p.selection.filter((i) => !p.masquees.includes(i));
    setPages((l) => l.map((x) => (x.id === id ? { ...x, etat: selection.length ? 'gardee' : 'passee', message: selection.length ? 'Enregistrement…' : 'Passée' } : x)));
    if (!selection.length) return;
    const r = await garderPreselection({ propositions: p.propositions.map(({ legende: _l, rendue: _r, vu: _v, ...x }) => x), selection, appareil, dureeMs: Date.now() - p.debut });
    setPages((l) => l.map((x) => (x.id === id ? { ...x, message: r.message } : x)));
    if (r.ok && r.ajoutes) setCompte((c) => c + r.ajoutes!);
  }, [pages, appareil]);

  const fin = useRef<HTMLDivElement>(null);
  const suivante = useCallback(() => {
    for (const p of pages.filter((x) => x.etat === 'ouverte' && x.selection.length)) void garder(p.id);
    const n = generer();
    if (n) setPages((l) => [...l.map((p) => (p.etat === 'ouverte' && !p.selection.length ? { ...p, etat: 'passee' as const } : p)), n].slice(-6));
  }, [pages, garder, generer]);
  useEffect(() => {
    const el = fin.current;
    if (!el) return;
    const o = new IntersectionObserver((e) => { if (e[0]?.isIntersecting && pages.length && pages[pages.length - 1].etat !== 'ouverte') suivante(); }, { rootMargin: '400px' });
    o.observe(el);
    return () => o.disconnect();
  }, [pages, suivante]);

  // Rendu identique à l'œil (empreinte du rendu, comme la Dégustation) : le doublon est masqué
  const verifierRendus = useCallback((id: number, racine: HTMLElement | null) => {
    if (!racine) return;
    setTimeout(() => {
      const sig = Array.from(racine.querySelectorAll('iframe')).map((f) => { const e = empreinteIframe(f); return e ? e.map((x) => x.sig).join('\n') : null; });
      const masquees: number[] = [];
      sig.forEach((s, i) => { if (s && sig.slice(0, i).includes(s)) masquees.push(i); });
      if (masquees.length) setPages((l) => l.map((p) => (p.id === id ? { ...p, masquees } : p)));
    }, 2500);
  }, []);

  /** « Voir avec un autre thème » : la carte rendue avec un autre profil (son kit d'images) */
  const autreTheme = (pid: number, i: number) => setPages((l) => l.map((p) => {
    if (p.id !== pid) return p;
    const c = p.propositions[i];
    const autre = profilDemo(props.profils, (Date.now() & 0xffff) + i, c.vu);
    if (!autre) return p;
    const rendue = rendreDesign(c.design, autre, ctxDe(autre), i + 1);
    return { ...p, propositions: p.propositions.map((x, k) => (k === i ? { ...x, rendue, vu: autre.id } : x)) };
  }));

  const toucher = (id: number, i: number) => setPages((l) => l.map((p) => (p.id === id && p.etat === 'ouverte' ? { ...p, selection: p.selection.includes(i) ? p.selection.filter((k) => k !== i) : [...p.selection, i] } : p)));
  const hauteur = appareil === 'mobile' ? 330 : 260;

  return (
    <div className="grid gap-4">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-xl bg-white/95 p-2 text-sm shadow-sm ring-1 ring-black/5 sm:top-16">
        <span className="font-semibold" data-compteur-candidats={compte}>{compte} / {CHAINE.objectifCandidats} candidats</span>
        <span className="h-2 w-24 overflow-hidden rounded-full bg-neutral-200" aria-hidden="true"><span className="block h-full bg-teal-700" style={{ width: `${Math.min(100, (compte / CHAINE.objectifCandidats) * 100)}%` }} /></span>
        <button type="button" onClick={() => setAppareil(appareil === 'mobile' ? 'ordinateur' : 'mobile')} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 ${focus}`}>{appareil === 'mobile' ? 'Voir sur ordinateur' : 'Voir sur téléphone'}</button>
      </div>

      {pages.map((p) => (
        <section key={p.id} aria-label={`Page de ${p.propositions.length} designs`} className={`grid gap-2 rounded-2xl border p-2 sm:p-3 ${p.etat === 'ouverte' ? 'border-black/10 bg-white' : 'border-black/5 bg-neutral-50 opacity-80'}`} data-page-preselection={p.etat} data-profil-demo={p.profil}>
          <p className="text-xs text-neutral-600">Montrés avec le cabinet de démonstration « {profilDe(p.profil).nom} » (ses images)</p>
          <ul ref={(el) => { if (el && !el.dataset.verifie) { el.dataset.verifie = '1'; verifierRendus(p.id, el); } }} className={`grid gap-2 ${appareil === 'mobile' ? 'grid-cols-2 lg:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {p.propositions.map((x, i) => {
              if (p.masquees.includes(i)) return null;
              const choisi = p.selection.includes(i);
              const pr = profilDe(x.vu);
              return (
                <li key={x.cle} data-carte-preselection={i} className="grid min-w-0 gap-1">
                  <button type="button" aria-pressed={choisi} onClick={() => toucher(p.id, i)} disabled={p.etat !== 'ouverte'}
                    className={`relative block w-full overflow-hidden rounded-xl text-left ring-2 ${focus} ${choisi ? 'ring-teal-700' : 'ring-transparent hover:ring-teal-300'}`}>
                    <span className="pointer-events-none block">
                      <ApercuModele composition={x.rendue} scenario={scenario(pr)} rendu={props.rendu} appareil={appareil} hauteur={hauteur} vignette />
                    </span>
                    {choisi && <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white shadow" aria-hidden="true">{p.selection.indexOf(i) + 1}</span>}
                    <span className="block truncate px-2 py-1 text-xs text-neutral-700">{x.legende}</span>
                  </button>
                  <button type="button" onClick={() => autreTheme(p.id, i)} className={`min-h-9 rounded-lg px-2 text-left text-xs text-teal-900 underline ${focus}`} data-action="autre-theme">Voir avec un autre thème ({pr.nom})</button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            {p.etat === 'ouverte' ? (
              <>
                <button type="button" onClick={() => void garder(p.id)} disabled={!p.selection.length} className={`min-h-11 rounded-lg bg-teal-800 px-4 font-semibold text-white disabled:opacity-50 ${focus}`}>Garder ({p.selection.length})</button>
                <button type="button" onClick={() => setPages((l) => l.map((x) => (x.id === p.id ? { ...x, etat: 'passee', message: 'Passée' } : x)))} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 ${focus}`}>Aucun ne me plaît</button>
              </>
            ) : <span role="status" className="text-sm text-neutral-700">{p.message}</span>}
          </div>
        </section>
      ))}
      <div ref={fin} className="grid place-items-center py-6">
        <button type="button" onClick={suivante} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-4 ${focus}`}>Page suivante</button>
      </div>
    </div>
  );
}
