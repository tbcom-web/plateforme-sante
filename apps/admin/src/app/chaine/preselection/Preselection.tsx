'use client';

// Présélection « mode illimité » (chaîne des modèles, étape 1) : pages de 6 sites complets du même profil (grilleDirectionsDegustation :
// favoris 4-5 ★, harmonie, diversité garantie), filtre léger (filtreLeger : exclus, déjà vus, rendus identiques à l'œil) ; on touche
// ceux qui plaisent (multi-sélection), « Garder » enregistre : candidats + points dans le journal de la Dégustation. Défilement
// infini : la page suivante se prépare quand on arrive en bas ; une page touchée mais pas gardée l'est en passant à la suivante.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CHAINE, contexteScenario, elementsComposition, filtreLeger, grilleDirectionsDegustation, modeleIntegre, serialiserComposition, type PhotoBanque, type PoidsAtelier, type ScenarioRecette,
} from '@plateforme/core';
import { empreinteIframe } from '../../admin/degustation/Vignettes';
import ApercuModele, { type RenduChaine } from '../ApercuModele';
import { garderPreselection, importerRecettes, type PropositionPreselection } from '../actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type Profil = { id: string; nom: string; sujets: string[]; scenario: ScenarioRecette };
type Page = { id: number; propositions: (PropositionPreselection & { legende: string })[]; selection: number[]; etat: 'ouverte' | 'gardee' | 'passee'; message?: string; masquees: number[]; debut: number };

type Props = {
  profession: string;
  profils: Profil[];
  profilInitial: string;
  candidats: Record<string, number>;
  dejaVues: string[];
  rendu: RenduChaine;
  poids: PoidsAtelier | null;
  photos: PhotoBanque[];
  tranches: { refuses: string[]; favoris: string[]; notes: string[] };
};

export default function Preselection(props: Props) {
  const [profilId, setProfilId] = useState(props.profilInitial);
  const profil = props.profils.find((p) => p.id === profilId) ?? props.profils[0];
  const [appareil, setAppareil] = useState<'ordinateur' | 'mobile'>('mobile');
  useEffect(() => { if (window.innerWidth >= 1024) setAppareil('ordinateur'); }, []);
  const [pages, setPages] = useState<Page[]>([]);
  const [compte, setCompte] = useState(props.candidats);
  const [message, setMessage] = useState('');
  const vues = useRef(new Set(props.dejaVues));
  const graine = useRef(1);
  const tranches = useMemo(() => ({ refuses: new Set(props.tranches.refuses), favoris: new Set(props.tranches.favoris) }), [props.tranches]);
  const modele = useCallback((id: string) => props.rendu.modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id), [props.rendu.modeles]);
  const scenario = useMemo(() => ({ principaux: profil.scenario.principaux, secondaires: profil.scenario.secondaires, couleurs: profil.scenario.couleurs }), [profil]);

  /** Une page de 6 (jusqu'à 6 essais de graine si le filtre léger en écarte trop) */
  const generer = useCallback((): Page | null => {
    const ctx = contexteScenario(profil.scenario, { poids: props.poids, photos: props.photos, modele, modeTirage: 'favoris' });
    const notes = props.poids?.notesElements ?? {};
    const retenues: Page['propositions'] = [];
    for (let essai = 0; essai < 6 && retenues.length < CHAINE.tailleGrille; essai++) {
      const g = grilleDirectionsDegustation({ contexte: ctx, notes, tranches, graine: (graine.current++ * 7919 + profil.id.length) >>> 0 });
      for (const p of g?.propositions ?? []) {
        if (retenues.length >= CHAINE.tailleGrille || !p.x) continue;
        const f = filtreLeger({ cle: p.cle, violationsDures: 0, elements: elementsComposition(p.x, ctx.sujets), exclus: tranches.refuses, dejaVues: vues.current });
        if (!f.garde) continue;
        vues.current.add(p.cle);
        const legende = [p.etiquette, ...(p.mots ?? [])].filter(Boolean).join(' · ');
        retenues.push({ cle: p.cle, nom: `${profil.nom} · ${p.etiquette ?? 'Direction'} ${p.cle.slice(5, 9)}`, composition: JSON.parse(serialiserComposition(p.x)), ingredients: p.ingredients as Record<string, unknown>, legende });
      }
    }
    return retenues.length >= 2 ? { id: graine.current, propositions: retenues, selection: [], etat: 'ouverte', masquees: [], debut: Date.now() } : null;
  }, [profil, props.poids, props.photos, modele, tranches]);

  // Changement de profil : on repart d'une page
  useEffect(() => { const p = generer(); setPages(p ? [p] : []); setMessage(p ? '' : 'Pas assez de sites distincts pour ce profil pour l’instant.'); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [profilId]);

  const garder = useCallback(async (id: number) => {
    const p = pages.find((x) => x.id === id);
    if (!p || p.etat !== 'ouverte') return;
    const selection = p.selection.filter((i) => !p.masquees.includes(i));
    setPages((l) => l.map((x) => (x.id === id ? { ...x, etat: selection.length ? 'gardee' : 'passee', message: selection.length ? 'Enregistrement…' : 'Passée' } : x)));
    if (!selection.length) return;
    const r = await garderPreselection({ profil: profil.id, propositions: p.propositions.map(({ legende: _l, ...x }) => x), selection, appareil, dureeMs: Date.now() - p.debut });
    setPages((l) => l.map((x) => (x.id === id ? { ...x, message: r.message } : x)));
    if (r.ok && r.ajoutes) setCompte((c) => ({ ...c, [profil.id]: (c[profil.id] ?? 0) + r.ajoutes! }));
  }, [pages, profil, appareil]);

  // Défilement infini : en bas de la dernière page, la suivante ; une page touchée mais pas gardée est gardée au passage
  const fin = useRef<HTMLDivElement>(null);
  const suivante = useCallback(() => {
    const ouverte = pages.filter((p) => p.etat === 'ouverte' && p.selection.length);
    for (const p of ouverte) void garder(p.id);
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
      const iframes = Array.from(racine.querySelectorAll('iframe'));
      const sig = iframes.map((f) => { const e = empreinteIframe(f); return e ? e.map((x) => x.sig).join('\n') : null; });
      const masquees: number[] = [];
      sig.forEach((s, i) => { if (s && filtreLeger({ cle: `compo:${i}`, violationsDures: 0, elements: [], exclus: new Set(), dejaVues: new Set(), empreinteRendu: s, empreintesVoisines: sig.slice(0, i) }).raisons.includes('rendu-identique')) masquees.push(i); });
      if (masquees.length) setPages((l) => l.map((p) => (p.id === id ? { ...p, masquees } : p)));
    }, 2500);
  }, []);

  const toucher = (id: number, i: number) => setPages((l) => l.map((p) => (p.id === id && p.etat === 'ouverte' ? { ...p, selection: p.selection.includes(i) ? p.selection.filter((k) => k !== i) : [...p.selection, i] } : p)));
  const n = compte[profil.id] ?? 0;
  const hauteur = appareil === 'mobile' ? 330 : 260;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Profil">
        {props.profils.map((p) => (
          <button key={p.id} type="button" aria-pressed={p.id === profil.id} onClick={() => setProfilId(p.id)} className={`min-h-11 rounded-full border px-3 text-sm ${focus} ${p.id === profil.id ? 'border-teal-800 bg-teal-800 font-semibold text-white' : 'border-neutral-300 bg-white'}`}>
            {p.nom} <span className="opacity-80">{compte[p.id] ?? 0}/{CHAINE.objectifCandidats}</span>
          </button>
        ))}
      </div>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-xl bg-white/95 p-2 text-sm shadow-sm ring-1 ring-black/5 sm:top-16">
        <span className="font-semibold" data-compteur-candidats={n}>{n} / {CHAINE.objectifCandidats} candidats · {profil.nom}</span>
        <span className="h-2 w-24 overflow-hidden rounded-full bg-neutral-200" aria-hidden="true"><span className="block h-full bg-teal-700" style={{ width: `${Math.min(100, (n / CHAINE.objectifCandidats) * 100)}%` }} /></span>
        <button type="button" onClick={() => setAppareil(appareil === 'mobile' ? 'ordinateur' : 'mobile')} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 ${focus}`}>{appareil === 'mobile' ? 'Voir sur ordinateur' : 'Voir sur téléphone'}</button>
        <button type="button" onClick={async () => setMessage((await importerRecettes(profil.id)).message)} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 ${focus}`}>Importer les recettes du profil</button>
        {message && <span role="status" className="text-neutral-700">{message}</span>}
      </div>

      {pages.map((p) => (
        <section key={p.id} aria-label={`Page de ${p.propositions.length} sites`} className={`grid gap-2 rounded-2xl border p-2 sm:p-3 ${p.etat === 'ouverte' ? 'border-black/10 bg-white' : 'border-black/5 bg-neutral-50 opacity-80'}`} data-page-preselection={p.etat}>
          <ul ref={(el) => { if (el && !el.dataset.verifie) { el.dataset.verifie = '1'; verifierRendus(p.id, el); } }} className={`grid gap-2 ${appareil === 'mobile' ? 'grid-cols-2 lg:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {p.propositions.map((x, i) => {
              if (p.masquees.includes(i)) return null;
              const choisi = p.selection.includes(i);
              return (
                <li key={x.cle} data-carte-preselection={i} className="min-w-0">
                  <button type="button" aria-pressed={choisi} onClick={() => toucher(p.id, i)} disabled={p.etat !== 'ouverte'}
                    className={`relative block w-full overflow-hidden rounded-xl text-left ring-2 ${focus} ${choisi ? 'ring-teal-700' : 'ring-transparent hover:ring-teal-300'}`}>
                    <span className="pointer-events-none block">
                      <ApercuModele composition={x.composition} scenario={scenario} rendu={props.rendu} appareil={appareil} hauteur={hauteur} vignette />
                    </span>
                    {choisi && <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white shadow" aria-hidden="true">{p.selection.indexOf(i) + 1}</span>}
                    <span className="block truncate px-2 py-1 text-xs text-neutral-700">{x.legende}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            {p.etat === 'ouverte' ? (
              <>
                <button type="button" onClick={() => void garder(p.id)} disabled={!p.selection.length} className={`min-h-11 rounded-lg bg-teal-800 px-4 font-semibold text-white disabled:opacity-50 ${focus}`}>Garder ({p.selection.length})</button>
                <button type="button" onClick={() => { setPages((l) => l.map((x) => (x.id === p.id ? { ...x, etat: 'passee', message: 'Passée' } : x))); }} className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 ${focus}`}>Aucun ne me plaît</button>
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
