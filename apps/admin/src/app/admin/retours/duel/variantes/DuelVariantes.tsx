'use client';

// Duel des variantes d'une illustration de base (page.tsx) : deux rendus du MÊME dessin qui ne diffèrent que par une dimension
// (genererDuelVariantes, duels.ts). Contraste et couleurs : variantes de RENDU (filtre CSS de contraste, variables de gamme sur
// le conteneur du SVG) ; style : deux variantes de l'inventaire (relevé, pédagogique, trait continu, styles expérimentaux).
import '@plateforme/core/dessins.css';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  candidatsVariantes, classementDuels, CONTRASTES, filtreContraste, gamme as gammeParId, genererDuelVariantes, inventaireAssets, LIBELLES_CONTRASTES,
  LIBELLES_DUELS_VARIANTES, libelleVariante, lireVarianteRendu, preferencesVariantes, regrouperParBase, sujetsDuVisuel, SURFACES_CSS, titreDeBase,
  variablesCharte, variablesGamme, type Asset, type CandidatVariante, type Duel, type ResultatDuel,
} from '@plateforme/core';
import { enregistrerDuel } from '../actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
type Dim = 'contraste' | 'style' | 'couleur';
const GAMME_DE_BASE = 'canard';
const GAMMES_DUEL = ['canard', 'cobalt', 'terracotta', 'prune'];
const DIMS: { id: Dim; nom: string }[] = [{ id: 'contraste', nom: 'Contraste' }, { id: 'style', nom: 'Style' }, { id: 'couleur', nom: 'Couleurs' }];

/** Un côté du duel : le dessin source, au contraste et dans la gamme de la variante */
function Cote({ c, source, lettre }: { c: CandidatVariante; source: Asset; lettre: 'A' | 'B' }) {
  const svg = useMemo(() => (source.rendu.kind === 'svg' ? source.rendu.svg() : ''), [source]);
  const g = gammeParId(c.valeurs.couleur && c.valeurs.couleur !== 'origine' ? c.valeurs.couleur : GAMME_DE_BASE) ?? gammeParId(GAMME_DE_BASE)!;
  const fond = source.rendu.kind === 'svg' ? source.rendu.fond : 'clair';
  const style = { ...variablesGamme(g), background: fond === 'doux' ? 'var(--doux)' : fond === 'grille' || fond === 'plan' ? undefined : 'var(--fond)', color: 'var(--encre)' } as CSSProperties;
  const v = lireVarianteRendu(c.cle);
  const libelle = v?.dimension === 'contraste' ? LIBELLES_CONTRASTES[v.valeur as keyof typeof LIBELLES_CONTRASTES] ?? v.valeur : v?.dimension === 'couleur' ? `Gamme ${g.nom}` : libelleVariante(c.cle);
  return (
    <figure className="grid gap-1.5">
      <div className={`relative grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl ring-1 ring-black/10 ${fond === 'grille' ? 'surface-grille' : fond === 'plan' ? 'surface-plan' : ''}`} style={style}>
        <span className="absolute left-2 top-2 rounded-lg bg-white/90 px-2 py-0.5 text-sm font-bold text-neutral-900 ring-1 ring-black/10">{lettre}</span>
        <div className="dv-svg h-[86%] w-[86%]" style={{ filter: filtreContraste(c.valeurs.contraste) }} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <figcaption className="text-sm text-neutral-700">{libelle}</figcaption>
    </figure>
  );
}

export default function DuelVariantes({ historique, baseInitiale, dimensionInitiale }: { historique: Duel[]; baseInitiale: string | null; dimensionInitiale: Dim }) {
  const inventaire = useMemo(() => inventaireAssets(), []);
  const parCle = useMemo(() => new Map(inventaire.map((a) => [a.cle, a])), [inventaire]);
  const groupes = useMemo(() => regrouperParBase(inventaire).groupes.sort((a, b) => a.base.localeCompare(b.base)), [inventaire]);
  const [duels, setDuels] = useState<Duel[]>(historique);
  const [base, setBase] = useState(() => groupes.find((g) => g.base === baseInitiale)?.base ?? groupes[0]?.base ?? '');
  const [dim, setDim] = useState<Dim>(dimensionInitiale);
  const [graine, setGraine] = useState(1);
  const [message, setMessage] = useState('');
  const [enCours, setEnCours] = useState(false);
  useEffect(() => { setGraine(Math.floor(Math.random() * 1e9) + 1); }, []);

  const groupe = groupes.find((g) => g.base === base) ?? null;
  const candidats = useMemo(() => (groupe ? candidatsVariantes(groupe.base, groupe.variantes.map((v) => v.cle), { gammes: dim === 'couleur' ? GAMMES_DUEL : [], gammeDeBase: GAMME_DE_BASE }) : []), [groupe, dim]);
  const duelsBase = useMemo(() => duels.filter((d) => [d.aCle, d.bCle].some((k) => candidats.some((c) => c.cle === k))), [duels, candidats]);
  const paire = useMemo(() => genererDuelVariantes(candidats, duelsBase, { graine, dimension: dim }), [candidats, duelsBase, graine, dim]);
  const source = (c: CandidatVariante) => parCle.get(lireVarianteRendu(c.cle)?.source ?? c.cle);

  const changer = (b: string, d: Dim) => {
    setBase(b); setDim(d); setGraine((g) => g + 1); setMessage('');
    try { const u = new URL(window.location.href); u.searchParams.set('base', b); u.searchParams.set('dimension', d); window.history.replaceState(null, '', u); } catch { /* sans effet */ }
  };

  const choisir = useCallback(async (resultat: ResultatDuel) => {
    if (!paire || !groupe || enCours) return;
    const sujet = sujetsDuVisuel(groupe.representant).sujets[0] ?? 'general';
    const duel: Duel = {
      type: 'illustration', scenario: { sujets: [sujet] }, aCle: paire.a.cle, bCle: paire.b.cle,
      aIngredients: { assets: [paire.a.cle], element: paire.a.cle }, bIngredients: { assets: [paire.b.cle], element: paire.b.cle },
      dimension: paire.dimension, resultat, appareil: 'les-deux', le: new Date().toISOString(),
    };
    setEnCours(true);
    setDuels((l) => [duel, ...l]);
    setGraine((g) => g + 1);
    const r = await enregistrerDuel(duel as unknown as Record<string, unknown>).catch(() => ({ ok: false, message: 'Connexion perdue : duel gardé dans ce navigateur.' }));
    setEnCours(false);
    setMessage(r.ok ? `Duel enregistré (${resultat === 'a' ? 'A' : resultat === 'b' ? 'B' : resultat === 'egalite' ? 'égalité' : 'les deux sont mauvais'}).` : r.message);
  }, [paire, groupe, enCours]);

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

  const style = useMemo(() => ({ ...variablesCharte(), ...variablesGamme(gammeParId(GAMME_DE_BASE)!) }) as CSSProperties, []);
  const prefContraste = useMemo(() => preferencesVariantes(duels, 'contraste'), [duels]);
  const classementBase = useMemo(() => classementDuels(duelsBase.filter((d) => d.dimension === `variante:${dim}`)), [duelsBase, dim]);
  const nomCle = (k: string) => { const v = lireVarianteRendu(k); return v ? (v.dimension === 'contraste' ? LIBELLES_CONTRASTES[v.valeur as keyof typeof LIBELLES_CONTRASTES] ?? v.valeur : `Gamme ${gammeParId(v.valeur)?.nom ?? v.valeur}`) : libelleVariante(k); };
  const titre = groupe ? titreDeBase(groupe.representant.titre, groupe.representant.cle) : '';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 pb-32 md:pb-0" style={style}>
      <style>{SURFACES_CSS + '.dv-svg svg{width:100%;height:100%;display:block}'}</style>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Illustration de base</span>
          <select value={base} onChange={(e) => changer(e.target.value, dim)} className="min-h-11 max-w-[80vw] rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
            {groupes.map((g) => <option key={g.base} value={g.base}>{titreDeBase(g.representant.titre, g.representant.cle)} · {g.variantes.length} variantes</option>)}
          </select>
        </label>
        <div role="tablist" aria-label="Ce qui change" className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
          {DIMS.map((d) => (
            <button key={d.id} type="button" role="tab" aria-selected={dim === d.id} onClick={() => changer(base, d.id)}
              className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${focus} ${dim === d.id ? 'bg-white text-teal-900 shadow-sm' : 'text-neutral-700 hover:bg-white/60'}`}>{d.nom}</button>
          ))}
        </div>
      </div>

      <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-950 ring-1 ring-teal-200">
        On compare : <strong>{LIBELLES_DUELS_VARIANTES[`variante:${dim}`]}</strong> — « {titre} », même dessin de base.
      </p>

      {paire && groupe ? (
        <section aria-label="Duel" className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            {[paire.a, paire.b].map((c, i) => { const s = source(c); return s ? <Cote key={c.cle} c={c} source={s} lettre={i ? 'B' : 'A'} /> : null; })}
          </div>
          <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 gap-2 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
            {([['a', '← A'], ['egalite', '↓ Égalité'], ['mauvais', '↑ Les deux mauvais'], ['b', 'B →']] as const).map(([r, nom]) => (
              <button key={r} type="button" disabled={enCours} onClick={() => void choisir(r)}
                className={`min-h-12 rounded-xl px-2 text-sm font-semibold ${focus} ${r === 'a' || r === 'b' ? 'bg-teal-800 text-white hover:bg-teal-900' : 'border border-neutral-300 bg-white hover:bg-neutral-50'}`}>{nom}</button>
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-2xl border border-black/10 bg-white p-6 text-center text-sm text-neutral-700">
          {dim === 'style' ? 'Cette illustration n’a qu’un style : essayez le contraste ou les couleurs.' : 'Pas de duel possible pour cette illustration.'}
        </p>
      )}
      {message && <p role="status" className="text-sm text-neutral-700">{message}</p>}

      <section className="grid gap-3 md:grid-cols-2">
        <div className="grid content-start gap-1.5 rounded-2xl border border-black/10 bg-white p-4">
          <h2 className="text-base font-semibold">Variantes de « {titre} » ({DIMS.find((d) => d.id === dim)?.nom.toLowerCase()})</h2>
          {classementBase.length ? (
            <ol className="grid gap-1 text-sm">{classementBase.map((l) => <li key={l.cle}>{nomCle(l.cle)} <span className="text-xs text-neutral-500">{l.elo} ± {l.plusMoins} · {l.n} duel{l.n > 1 ? 's' : ''}</span></li>)}</ol>
          ) : <p className="text-xs text-neutral-500">Aucun duel encore pour cette illustration.</p>}
        </div>
        <div className="grid content-start gap-1.5 rounded-2xl border border-black/10 bg-white p-4">
          <h2 className="text-base font-semibold">Contraste préféré (tous dessins)</h2>
          {prefContraste.length ? (
            <ol className="grid gap-1 text-sm">{prefContraste.map((l) => <li key={l.cle}>{LIBELLES_CONTRASTES[l.cle as (typeof CONTRASTES)[number]] ?? l.cle} <span className="text-xs text-neutral-500">{l.elo} ± {l.plusMoins} · {l.n} duel{l.n > 1 ? 's' : ''}</span></li>)}</ol>
          ) : <p className="text-xs text-neutral-500">Pas encore de duel de contraste.</p>}
        </div>
      </section>
    </div>
  );
}
