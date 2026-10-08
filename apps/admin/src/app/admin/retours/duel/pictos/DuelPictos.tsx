'use client';

// « On compare : le style des icônes » (page.tsx). Mode « picto » : le même picto de l'échantillon dans deux directions (ou une
// direction face au picto actuel), montré à ses vraies tailles (48 et 24 px) sur fond blanc, teinté et sombre ; mode « planches » :
// la planche de 12 de deux directions, en situation (cartes de soins, infos pratiques, téléphone). Clés : picto:<id>@direction-<d>,
// picto:<id> (actuel), picto:style-icones-<d> (planche). Direction D « icônes illustrées » (icones-illustrees.ts, 2026-10-08) : ses
// icônes ne couvrent que 4 pictos de l'échantillon (CORRESPONDANCE_ECHANTILLON_D) et se montrent à 128 et 64 px (jamais en 24 px).
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  classementDuels, cleDirection, cleStyleIcones, DIRECTIONS_PICTOS, ECHANTILLON_DIRECTIONS, FICHES_DIRECTIONS, FONDS_PICTO, gamme as gammeParId,
  LIBELLES_ECHANTILLON, lireCleDirection, NEUTRES, svgPicto, svgPictoDirection, svgPlancheDirection, variablesGamme, variablesPictoSur, hasard,
  svgIconeIllustree, variablesIconesIllustrees, cleIconeIllustree, lireCleIconeIllustree, svgPlancheIllustree, CLE_STYLE_ICONES_D,
  CORRESPONDANCE_ECHANTILLON_D, FICHE_DIRECTION_D,
  type DirectionPicto, type Duel, type ResultatDuel,
} from '@plateforme/core';
import { enregistrerDuel } from '../actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
type Mode = 'picto' | 'planches';
type Cote = { cle: string; id?: string; direction?: DirectionPicto | 'actuel' | 'd'; idD?: string };
type Direction = DirectionPicto | 'd';
const DIRECTIONS: Direction[] = [...DIRECTIONS_PICTOS, 'd'];
const nomDirection = (d: string) => (d === 'd' ? FICHE_DIRECTION_D.nom : FICHES_DIRECTIONS[d as DirectionPicto]?.nom ?? d);
const GAMMES = ['canard', 'menthe', 'sable', 'pasteque'];
const NOMS_FONDS = { blanc: 'fond blanc', teinte: 'fond teinté', sombre: 'fond sombre' } as const;

function nomCote(c: Cote): string {
  if (c.direction === 'actuel') return 'Picto actuel';
  return c.direction ? nomDirection(c.direction) : c.cle;
}

/** Un picto à ses tailles réelles, sur les trois fonds de la gamme */
function VuePicto({ c, g }: { c: Cote; g: string }) {
  const gm = gammeParId(g)!;
  const rendu = (t: number) => (c.direction === 'actuel' ? svgPicto(c.id!, { taille: t, accent: true }) : c.direction === 'd' ? svgIconeIllustree(c.idD!, { taille: t }) : svgPictoDirection(c.id!, c.direction as DirectionPicto, { taille: t })) ?? '';
  const [grand, petit] = c.direction === 'd' ? [128, 64] : c.direction === 'c' ? [64, 40] : [48, 24];
  return (
    <div className="grid gap-1">
      {FONDS_PICTO.map((f) => (
        <div key={f} className="flex items-center gap-4 rounded-xl px-4 py-3" style={{ ...variablesGamme(gm), ...variablesPictoSur(gm, f), ...variablesIconesIllustrees(gm) } as CSSProperties} title={NOMS_FONDS[f]}>
          <span dangerouslySetInnerHTML={{ __html: rendu(grand) }} />
          <span dangerouslySetInnerHTML={{ __html: rendu(petit) }} />
        </div>
      ))}
    </div>
  );
}

function VuePlanche({ d, g }: { d: Direction; g: string }) {
  const gm = gammeParId(g)!;
  return (
    <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl ring-1 ring-black/10" style={{ ...variablesGamme(gm), background: gm.fond, color: gm.encre ?? NEUTRES.encre } as CSSProperties}
      dangerouslySetInnerHTML={{ __html: d === 'd' ? svgPlancheIllustree(gm) : svgPlancheDirection(d) }} />
  );
}

export default function DuelPictos({ historique, modeInitial }: { historique: Duel[]; modeInitial: Mode }) {
  const [duels, setDuels] = useState<Duel[]>(historique);
  const [mode, setMode] = useState<Mode>(modeInitial);
  const [graine, setGraine] = useState(1);
  const [g, setG] = useState(GAMMES[0]);
  const [message, setMessage] = useState('');
  const [enCours, setEnCours] = useState(false);
  useEffect(() => { setGraine(Math.floor(Math.random() * 1e9) + 1); }, []);

  // Paire : jamais jouée d'abord, sinon au hasard
  const paire = useMemo((): [Cote, Cote] => {
    const r = hasard(graine);
    const joues = new Set(duels.map((d) => [d.aCle, d.bCle].sort().join('|')));
    const tirer = <T,>(l: readonly T[]) => l[Math.floor(r() * l.length)];
    for (let essai = 0; essai < 40; essai++) {
      let a: Cote, b: Cote;
      if (mode === 'planches') {
        const [x, y] = [...DIRECTIONS].sort(() => r() - 0.5);
        const pl = (d: Direction): Cote => ({ cle: d === 'd' ? CLE_STYLE_ICONES_D : cleStyleIcones(d), direction: d });
        a = pl(x); b = pl(y);
      } else if (r() < 0.3) {
        // D (icône illustrée) contre A, B ou C sur le même sujet
        const [idD, id] = tirer(Object.entries(CORRESPONDANCE_ECHANTILLON_D));
        const x = tirer(DIRECTIONS_PICTOS);
        const cd: Cote = { cle: cleIconeIllustree(idD), id: id!, idD, direction: 'd' }, cx: Cote = { cle: cleDirection(id!, x), id: id!, direction: x };
        [a, b] = r() < 0.5 ? [cd, cx] : [cx, cd];
      } else {
        const id = tirer(ECHANTILLON_DIRECTIONS);
        const choix: (DirectionPicto | 'actuel')[] = r() < 0.2 ? ['actuel', tirer(DIRECTIONS_PICTOS)] : [...DIRECTIONS_PICTOS].sort(() => r() - 0.5).slice(0, 2);
        const cote = (x: DirectionPicto | 'actuel'): Cote => ({ cle: x === 'actuel' ? `picto:${id}` : cleDirection(id, x), id, direction: x });
        [a, b] = r() < 0.5 ? [cote(choix[0]), cote(choix[1])] : [cote(choix[1]), cote(choix[0])];
      }
      if (!joues.has([a.cle, b.cle].sort().join('|')) || essai === 39) return [a, b];
    }
    throw new Error('inatteignable');
  }, [graine, mode, duels]);

  const changerMode = (m: Mode) => {
    setMode(m); setGraine((x) => x + 1); setMessage('');
    try { const u = new URL(window.location.href); u.searchParams.set('mode', m); window.history.replaceState(null, '', u); } catch { /* sans effet */ }
  };

  const choisir = useCallback(async (resultat: ResultatDuel) => {
    if (enCours) return;
    const [a, b] = paire;
    const duel: Duel = {
      type: 'illustration', scenario: { sujets: ['general'] }, aCle: a.cle, bCle: b.cle,
      aIngredients: { assets: [a.cle], element: a.cle }, bIngredients: { assets: [b.cle], element: b.cle },
      dimension: 'variante:style', resultat, appareil: 'les-deux', le: new Date().toISOString(),
    };
    setEnCours(true);
    setDuels((l) => [duel, ...l]);
    setGraine((x) => x + 1);
    const r = await enregistrerDuel(duel as unknown as Record<string, unknown>).catch(() => ({ ok: false, message: 'Connexion perdue : duel gardé dans ce navigateur.' }));
    setEnCours(false);
    setMessage(r.ok ? `Duel enregistré (${resultat === 'a' ? 'A' : resultat === 'b' ? 'B' : resultat === 'egalite' ? 'égalité' : 'les deux sont mauvais'}).` : r.message);
  }, [paire, enCours]);

  const refChoisir = useRef(choisir);
  refChoisir.current = choisir;
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      const r = ({ ArrowLeft: 'a', ArrowRight: 'b', ArrowDown: 'egalite', ArrowUp: 'mauvais' } as Record<string, ResultatDuel>)[e.key];
      if (r) { e.preventDefault(); void refChoisir.current(r); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  // Classement par direction (tous pictos confondus) : la direction de chaque clé
  const classement = useMemo(() => {
    const dir = (k: string) => (k.startsWith('picto:style-icones-') ? k.slice(-1) : lireCleIconeIllustree(k) ? 'd' : lireCleDirection(k)?.direction ?? 'actuel');
    return classementDuels(duels.map((d) => ({ ...d, aIngredients: { element: dir(d.aCle) }, bIngredients: { element: dir(d.bCle) } })));
  }, [duels]);
  const [a, b] = paire;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-32 md:pb-0">
      <div className="flex flex-wrap items-end gap-3">
        <div role="tablist" aria-label="Ce qu’on compare" className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
          {([['picto', 'Même picto, deux styles'], ['planches', 'Planche contre planche']] as const).map(([m, nom]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => changerMode(m)}
              className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${focus} ${mode === m ? 'bg-white text-teal-900 shadow-sm' : 'text-neutral-700 hover:bg-white/60'}`}>{nom}</button>
          ))}
        </div>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Couleurs</span>
          <select value={g} onChange={(e) => setG(e.target.value)} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
            {GAMMES.map((x) => <option key={x} value={x}>{gammeParId(x)?.nom ?? x}</option>)}
          </select>
        </label>
      </div>

      <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-950 ring-1 ring-teal-200">
        On compare : <strong>le style des icônes</strong>
        {mode === 'picto' && a.id ? <> — « {LIBELLES_ECHANTILLON[a.id as keyof typeof LIBELLES_ECHANTILLON]} », même picto, tailles réelles</> : <> — les planches en situation</>}
      </p>

      <section aria-label="Duel" className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          {[a, b].map((c, i) => (
            <figure key={c.cle} className="grid gap-1.5">
              <span className="w-fit rounded-lg bg-white px-2 py-0.5 text-sm font-bold ring-1 ring-black/10">{i ? 'B' : 'A'}</span>
              {mode === 'planches' ? <VuePlanche d={c.direction as Direction} g={g} /> : <VuePicto c={c} g={g} />}
              <figcaption className="text-sm text-neutral-700">{nomCote(c)}</figcaption>
            </figure>
          ))}
        </div>
        <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 gap-2 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
          {([['a', '← A'], ['egalite', '↓ Égalité'], ['mauvais', '↑ Les deux mauvais'], ['b', 'B →']] as const).map(([r, nom]) => (
            <button key={r} type="button" disabled={enCours} onClick={() => void choisir(r)}
              className={`min-h-12 rounded-xl px-2 text-sm font-semibold ${focus} ${r === 'a' || r === 'b' ? 'bg-teal-800 text-white hover:bg-teal-900' : 'border border-neutral-300 bg-white hover:bg-neutral-50'}`}>{nom}</button>
          ))}
        </div>
      </section>
      {message && <p role="status" className="text-sm text-neutral-700">{message}</p>}

      <section className="grid content-start gap-1.5 rounded-2xl border border-black/10 bg-white p-4">
        <h2 className="text-base font-semibold">Directions préférées (tous duels de style d’icônes)</h2>
        {classement.length ? (
          <ol className="grid gap-1 text-sm">{classement.map((l) => <li key={l.cle}>{l.cle === 'actuel' ? 'Picto actuel' : nomDirection(l.cle)} <span className="text-xs text-neutral-500">{l.elo} ± {l.plusMoins} · {l.n} duel{l.n > 1 ? 's' : ''}</span></li>)}</ol>
        ) : <p className="text-xs text-neutral-500">Aucun duel encore.</p>}
      </section>
    </div>
  );
}
