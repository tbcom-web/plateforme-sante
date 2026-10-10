'use client';

// Tournoi en grilles (tournoi-grilles.ts) : l'écran est servi par le serveur (servirEcran : grille réservée à ce votant, ou duel de
// départage) ; 6 designs rendus avec le MÊME profil de démonstration (contenu égal), mobile d'abord. Touchez 2 préférés (n° 1 puis
// n° 2) ; « Celui qui ne va pas » facultatif ; Valider. Barre « Top 10 sûr à 72 % · ~6 grilles restantes ». Rendus identiques à
// l'œil : le doublon est signalé (même contrôle que la Dégustation).
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import type { PhotoBanque, PoidsAtelier } from '@plateforme/core';
import { empreinteIframe } from '../../admin/degustation/Vignettes';
import ApercuModele, { type RenduChaine } from '../ApercuModele';
import { repondreGrille, servirEcran, voter, type Ecran } from '../actions';
import { contexteDuProfil, rendreDesign, type ProfilRendu } from '../rendu-profil';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

type Props = {
  profil: string | null;
  versions: Record<string, { nom: string; design: Record<string, unknown> }>;
  profils: ProfilRendu[];
  rendu: RenduChaine;
  poids: PoidsAtelier | null;
  photos: PhotoBanque[];
  budget: number;
  ouverture: number;
};

export default function Tournoi(p: Props) {
  const [ecran, setEcran] = useState<Ecran | null>(null);
  const [meilleures, setMeilleures] = useState<number[]>([]);
  const [pire, setPire] = useState<number | null>(null);
  const [modePire, setModePire] = useState(false);
  const [appareil, setAppareil] = useState<'ordinateur' | 'mobile'>('mobile');
  const [message, setMessage] = useState('');
  const [faits, setFaits] = useState(0);
  const [identiques, setIdentiques] = useState<number[]>([]);
  const [enCours, demarrer] = useTransition();
  useEffect(() => { if (window.innerWidth >= 1024) setAppareil('ordinateur'); }, []);
  const [panne, setPanne] = useState('');
  // Écran suivant : une erreur du serveur (base lente, délai de 20 s) est AFFICHÉE avec « Réessayer », jamais avalée en silence
  const ecranSuivant = async () => {
    try { setPanne(''); setEcran(await servirEcran(p.profil)); }
    catch { setPanne('La grille n’a pas pu être préparée (la base répond lentement).'); }
  };
  const charger = useCallback(() => demarrer(async () => { setMeilleures([]); setPire(null); setModePire(false); setIdentiques([]); await ecranSuivant(); }), [p.profil]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { charger(); }, [charger]);

  const profil = useMemo(() => (ecran && ecran.kind !== 'fini' ? p.profils.find((x) => x.id === ecran.profilDemo) ?? p.profils[0] : p.profils[0]), [ecran, p.profils]);
  const ids = ecran?.kind === 'grille' ? ecran.propositions : ecran?.kind === 'duel' ? [ecran.a, ecran.b] : [];
  const rendus = useMemo(() => {
    if (!profil) return [];
    const ctx = contexteDuProfil(profil, { poids: p.poids, photos: p.photos, modeles: p.rendu.modeles });
    return ids.map((id, i) => rendreDesign(p.versions[id]?.design ?? {}, profil, ctx, i + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(','), profil]);
  const scenario = profil ? { principaux: profil.scenario.principaux, secondaires: profil.scenario.secondaires, couleurs: profil.scenario.couleurs } : { principaux: [], secondaires: [], couleurs: [] };

  // Contrôle « rendu identique » : deux cartes identiques à l'œil sont signalées (le choix reste libre)
  useEffect(() => {
    if (ecran?.kind !== 'grille') return;
    const t = setTimeout(() => {
      const sig = Array.from(document.querySelectorAll('[data-carte-tournoi] iframe')).map((f) => { const e = empreinteIframe(f as HTMLIFrameElement); return e ? e.map((x) => x.sig).join('\n') : null; });
      setIdentiques(sig.flatMap((s, i) => (s && sig.slice(0, i).includes(s) ? [i] : [])));
    }, 2500);
    return () => clearTimeout(t);
  }, [ecran]);

  const toucher = (i: number) => {
    if (modePire) { setPire(pire === i ? null : i); setMeilleures((m) => m.filter((x) => x !== i)); setModePire(false); return; }
    setMeilleures((m) => (m.includes(i) ? m.filter((x) => x !== i) : m.length >= 2 ? [m[1], i] : [...m, i]));
    if (pire === i) setPire(null);
  };
  const valider = () => demarrer(async () => {
    if (ecran?.kind !== 'grille') return;
    let r; try { r = await repondreGrille(ecran.id, meilleures, pire, appareil); } catch { setMessage('Choix non enregistré (base lente) : touchez Valider à nouveau.'); return; }
    setMessage(r.message);
    if (r.ok) { setFaits((n) => n + 1); setMeilleures([]); setPire(null); setModePire(false); setIdentiques([]); await ecranSuivant(); }
  });
  const duel = (resultat: 'a' | 'b' | 'egalite') => demarrer(async () => {
    if (ecran?.kind !== 'duel') return;
    let r; try { r = await voter({ profil: p.profil, a: ecran.a, b: ecran.b, resultat, appareil }); } catch { setMessage('Vote non enregistré (base lente) : réessayez.'); return; }
    setMessage(r.message);
    if (r.ok) { setFaits((n) => n + 1); await ecranSuivant(); }
  });

  const certitude = ecran ? Math.round(ecran.certitude * 100) : 0;
  const h = appareil === 'mobile' ? 300 : 260;
  return (
    <div className="grid gap-3">
      <div className="sticky top-0 z-10 grid gap-1 rounded-xl bg-white/95 p-2 text-sm shadow-sm ring-1 ring-black/5 sm:top-16" data-progression-tournoi={certitude}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{ecran?.texte ?? 'Chargement…'}</span>
          <span className="text-neutral-600">· vous : {faits} écran{faits > 1 ? 's' : ''}</span>
          <button type="button" onClick={() => setAppareil(appareil === 'mobile' ? 'ordinateur' : 'mobile')} className={`ml-auto min-h-11 rounded-lg border border-neutral-300 bg-white px-3 ${focus}`}>{appareil === 'mobile' ? 'Voir sur ordinateur' : 'Voir sur téléphone'}</button>
        </div>
        <span className="h-2 overflow-hidden rounded-full bg-neutral-200" aria-hidden="true"><span className="block h-full bg-teal-700 transition-[width]" style={{ width: `${certitude}%` }} /></span>
      </div>
      {!ecran && !panne && (
        <p role="status" className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-5 text-sm font-semibold text-teal-900">
          <span className="size-5 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" aria-hidden="true" />Préparation de la grille…
        </p>
      )}
      {panne && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="flex-1 basis-56">{panne}</span>
          <button type="button" onClick={charger} disabled={enCours} className={`min-h-12 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50 ${focus}`}>{enCours ? 'Chargement…' : 'Réessayer'}</button>
        </div>
      )}
      {profil && ecran?.kind !== 'fini' && <p className="text-xs text-neutral-600">Tous montrés avec le cabinet « {profil.nom} » (mêmes images) : seul le design change.</p>}
      {ecran?.kind === 'fini' && (
        <div className="grid gap-3 rounded-2xl border border-black/10 bg-white p-5 text-sm" data-etat-tournoi="fini">
          <p>{ecran.texte}. Merci : les finalistes passent au test automatique.</p>
          {/* Le tableau fait tourner l'automate : finalistes, puis entrée dans la boucle de relecture */}
          <Link href="/chaine" className="flex min-h-12 items-center justify-center rounded-xl bg-teal-800 px-5 font-semibold text-white sm:justify-self-start">Voir les finalistes et la prochaine étape</Link>
        </div>
      )}

      {ecran?.kind === 'grille' && (
        <>
          <ul className={`grid gap-2 ${appareil === 'mobile' ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {ecran.propositions.map((id, i) => {
              const n = meilleures.indexOf(i);
              return (
                <li key={id} data-carte-tournoi={i} className="min-w-0">
                  <button type="button" onClick={() => toucher(i)} aria-pressed={n >= 0} disabled={enCours}
                    className={`relative block w-full overflow-hidden rounded-xl text-left ring-2 ${focus} ${n >= 0 ? 'ring-teal-700' : pire === i ? 'ring-red-600' : 'ring-transparent hover:ring-teal-300'}`}>
                    <span className="pointer-events-none block"><ApercuModele composition={rendus[i] ?? {}} scenario={scenario} rendu={p.rendu} appareil={appareil} hauteur={h} vignette /></span>
                    {n >= 0 && <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-teal-700 text-sm font-bold text-white shadow" aria-hidden="true">{n + 1}</span>}
                    {pire === i && <span className="absolute right-2 top-2 rounded-full bg-red-700 px-2 py-1 text-xs font-bold text-white" aria-hidden="true">ne va pas</span>}
                    {identiques.includes(i) && <span className="absolute left-2 top-2 rounded bg-amber-100 px-1.5 text-xs text-amber-900">rendu identique à un autre</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="sticky bottom-2 z-10 flex flex-wrap items-center gap-2 rounded-xl bg-white/95 p-2 shadow ring-1 ring-black/5">
            <button type="button" disabled={enCours || !meilleures.length} onClick={valider} className={`min-h-12 rounded-xl bg-teal-800 px-5 font-semibold text-white disabled:opacity-50 ${focus}`} data-action="valider-grille">Valider{meilleures.length ? ` (${meilleures.length} préféré${meilleures.length > 1 ? 's' : ''})` : ''}</button>
            <button type="button" aria-pressed={modePire} onClick={() => setModePire(!modePire)} className={`min-h-11 rounded-lg border px-3 text-sm ${focus} ${modePire ? 'border-red-700 bg-red-50' : 'border-neutral-300 bg-white'}`}>Celui qui ne va pas (facultatif)</button>
            {message && <span role="status" className="text-sm text-neutral-700">{message}</span>}
          </div>
        </>
      )}

      {ecran?.kind === 'duel' && (
        <div className="grid gap-3" data-duel={`${ecran.a}|${ecran.b}`}>
          <p className="text-sm font-semibold">Départage : lequel préférez-vous ?</p>
          <div className="grid gap-3 md:grid-cols-2">
            {(['a', 'b'] as const).map((k, i) => (
              <div key={k} className="grid gap-2 rounded-2xl border border-black/10 bg-white p-2">
                <ApercuModele composition={rendus[i] ?? {}} scenario={scenario} rendu={p.rendu} appareil={appareil} hauteur={appareil === 'mobile' ? 480 : 420} />
                <button type="button" disabled={enCours} onClick={() => duel(k)} className={`min-h-12 rounded-xl bg-teal-800 px-4 font-semibold text-white ${focus}`} data-voter={k}>Je préfère {k.toUpperCase()}</button>
              </div>
            ))}
          </div>
          <button type="button" disabled={enCours} onClick={() => duel('egalite')} className={`min-h-11 justify-self-center rounded-lg border border-neutral-300 bg-white px-4 ${focus}`}>Égalité</button>
        </div>
      )}
    </div>
  );
}
