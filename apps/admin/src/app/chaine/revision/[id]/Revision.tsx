'use client';

// Avis humain et revalidation d'une version de modèle (chaîne des modèles, étapes 4 et 7). Mêmes outils que le Studio : zones
// entourées (AnnotateurZones), éléments, 🔒 verrous et 🎲 dés (toutChanger / tirerDimension / respecterVerrous). Mobile d'abord.
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  contexteScenario, DIMENSIONS_RECETTE, elementsComposition, ETIQUETTES_ZONE, libelleElement, libellePageModele, modeleIntegre, normaliserComposition, PAGES_MODELE, pagesChangees,
  respecterVerrous, serialiserComposition, tirerDimension, toutChanger, type AppareilModele, type DimensionRecette, type EtatCellule, type LigneJournal, type PageModele,
  type PhotoBanque, type PoidsAtelier, type StatutModele, type TicketModele, type Zone,
} from '@plateforme/core';
import AnnotateurZones from '@/components/AnnotateurZones';
import ApercuModele, { type RenduChaine, type ScenarioChaine } from '../../ApercuModele';
import { useRenduProfil } from '../../ApercuDesign';
import type { ProfilRendu } from '../../rendu-profil';
import { creerTickets, garderRelance, revalider, rienASignaler } from '../../actions';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const bouton = `min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm ${focus}`;

type Props = {
  moi: string;
  fiche: { id: string; statut: StatutModele; version: number; scenario: ScenarioChaine; nom: string };
  composition: Record<string, unknown>;
  precedente: Record<string, unknown> | null;
  journal: LigneJournal[];
  test: { verdict: string; controles: string[] } | null;
  tickets: TicketModele[];
  cellules: EtatCellule[];
  rendu: RenduChaine;
  poids: PoidsAtelier | null;
  photos: PhotoBanque[];
  /** Design (profil nul) : profils compatibles avec lesquels on peut voir les pages ; [] = ancien modèle (son scénario) */
  profilsRendu: ProfilRendu[];
};

export default function Revision(p: Props) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState('');
  const revalidation = p.fiche.statut === 'revalidation';
  const changees = useMemo(() => (p.precedente ? pagesChangees(p.precedente, p.composition) : []), [p.precedente, p.composition]);
  const pagesVisibles = revalidation && changees.length ? PAGES_MODELE.filter((x) => changees.includes(x.id)) : PAGES_MODELE;
  const [page, setPage] = useState<PageModele>(pagesVisibles[0]?.id ?? 'accueil');
  const [appareil, setAppareil] = useState<AppareilModele>('mobile');
  const [zones, setZones] = useState<Zone[]>([]);
  const [mode, setMode] = useState(false);
  const [element, setElement] = useState<string | null>(null);
  const [etiquetteElement, setEtiquetteElement] = useState('a-revoir');
  const [commentaireElement, setCommentaireElement] = useState('');
  const [rouvrir, setRouvrir] = useState<number[]>([]);

  // ---- 🔒 / 🎲 (relance) ----
  const modele = (id: string) => p.rendu.modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id);
  const ctx = useMemo(() => contexteScenario({ ...p.fiche.scenario, soins: [] }, { poids: p.poids, photos: p.photos, modele, modeTirage: 'favoris' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.fiche.scenario, p.poids, p.photos]);
  const base = useMemo(() => normaliserComposition(p.composition, ctx), [p.composition, ctx]);
  const [essai, setEssai] = useState<Record<string, unknown> | null>(null);
  const [verrous, setVerrous] = useState<string[]>([]);
  const [relances, setRelances] = useState<string[]>([]);
  const [graine, setGraine] = useState(1);
  // Design : chaque page vue avec le kit d'un profil compatible (sélecteur « Voir avec »), même avant / après
  const vue = useRenduProfil(p.profilsRendu, { poids: p.poids, photos: p.photos, rendu: p.rendu });
  const design = p.profilsRendu.length > 0;
  const scenarioVu = (design && vue.scenario) || p.fiche.scenario;
  const affichee = useMemo(() => (design ? vue.rendre(essai ?? p.composition) : essai ?? p.composition),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [essai, p.composition, design, vue.profil?.id]);
  const precedenteVue = useMemo(() => (p.precedente && design ? vue.rendre(p.precedente) : p.precedente),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.precedente, design, vue.profil?.id]);
  const elements = useMemo(() => (base ? elementsComposition(base, ctx.sujets).slice(0, 10) : []), [base, ctx.sujets]);
  const relancer = (d: DimensionRecette | null) => {
    const x = essai ? normaliserComposition(essai, ctx) : base;
    if (!x) return;
    const g = graine * 7919 + 13;
    setGraine(graine + 1);
    const y = d ? tirerDimension(x, d, ctx, g) : respecterVerrous(x, toutChanger(x, verrous, ctx, g), verrous, ctx);
    setEssai(JSON.parse(serialiserComposition(y)));
    setRelances((l) => [...new Set([...l, d ?? 'le reste'])]);
  };

  const cellule = (pg: PageModele, a: AppareilModele) => p.cellules.find((c) => c.page === pg && c.appareil === a);
  const ticketsPage = p.tickets.filter((t) => t.page === page && t.appareil === appareil && (t.statut === 'ouvert' || t.statut === 'corrige'));
  const corriges = p.tickets.filter((t) => t.statut === 'corrige' && t.versionCorrection === p.fiche.version);
  const faites = p.cellules.filter((c) => c.etat !== 'a-voir').length;

  const agir = (f: () => Promise<{ ok: boolean; message: string }>, apres?: () => void) => demarrer(async () => {
    const r = await f();
    setMessage(r.message);
    if (r.ok) { apres?.(); router.refresh(); }
  });
  const envoyerZones = () => agir(() => creerTickets(p.fiche.id, zones.map((z) => ({ page, appareil, zone: { forme: z.forme, x: z.x, y: z.y, l: z.l, h: z.h }, etiquette: z.etiquette, commentaire: z.commentaire }))), () => { setZones([]); setMode(false); });
  const envoyerElement = () => element && agir(() => creerTickets(p.fiche.id, [{ page, appareil, element, etiquette: etiquetteElement, commentaire: commentaireElement }]), () => { setElement(null); setCommentaireElement(''); });
  const h = appareil === 'mobile' ? 640 : 560;

  return (
    <div className="grid gap-4">
      {/* Agent d'abord */}
      <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-3 text-sm" aria-label="Check de l’agent">
        <p className="font-semibold">Check de l’agent : {p.test ? <span data-verdict={p.test.verdict}>{p.test.verdict === 'vert' ? 'au vert' : p.test.verdict}</span> : 'en attente du testeur'}</p>
        {p.test?.controles.length ? <ul className="mt-1 list-disc pl-5 text-neutral-700">{p.test.controles.slice(0, 6).map((c, i) => <li key={i}>{c}</li>)}</ul> : null}
        {p.journal.length > 0 && <p className="mt-1 text-xs text-neutral-600">Journal v{p.fiche.version} : {p.journal.map((l) => l.texte).join(' · ')}</p>}
      </section>

      {revalidation ? (
        <section className="grid gap-2 rounded-2xl border border-teal-200 bg-teal-50/60 p-3" aria-label="Revalidation">
          <h2 className="font-semibold">Revalider ce qui a changé ({changees.length} page{changees.length > 1 ? 's' : ''})</h2>
          <ul className="grid gap-1 text-sm">
            {corriges.map((t) => (
              <li key={t.numero} className="flex flex-wrap items-center gap-2">
                <span>#{t.numero} · {libellePageModele(t.page)} ({t.appareil}) · {t.etiquette}{t.commentaire ? ` : ${t.commentaire}` : ''}</span>
                <label className="ml-auto inline-flex min-h-11 items-center gap-2"><input type="checkbox" checked={rouvrir.includes(t.numero)} onChange={(e) => setRouvrir((l) => (e.target.checked ? [...l, t.numero] : l.filter((n) => n !== t.numero)))} className="size-5" /> Pas encore corrigé</label>
              </li>
            ))}
          </ul>
          <button type="button" disabled={enCours} onClick={() => agir(() => revalider(p.fiche.id, rouvrir))} className={`min-h-12 justify-self-start rounded-xl bg-teal-800 px-5 font-semibold text-white ${focus}`} data-action="revalider">
            {rouvrir.length ? `Revalider le reste et rouvrir ${rouvrir.length} ticket(s)` : 'Tout revalider (1 clic)'}
          </button>
        </section>
      ) : (
        <p className="text-sm text-neutral-700" data-progression={`${faites}/${p.cellules.length}`}>Avis : {faites} / {p.cellules.length} pages vues. Une page est vue dès qu’elle a un ticket ou « Rien à signaler ».</p>
      )}

      {/* Pages × appareils */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Pages">
        {pagesVisibles.map((x) => {
          const o = cellule(x.id, 'ordinateur'), m = cellule(x.id, 'mobile');
          const pastille = (c?: EtatCellule) => (c?.etat === 'ok' ? '✓' : c?.etat === 'tickets' ? '!' : '·');
          return (
            <button key={x.id} type="button" role="tab" aria-selected={page === x.id} onClick={() => { setPage(x.id); setZones([]); }} className={`min-h-11 rounded-full border px-3 text-sm ${focus} ${page === x.id ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-300 bg-white'}`} data-page={x.id}>
              {x.libelle} <span aria-label="ordinateur, mobile" className="ml-1 font-mono text-xs opacity-80">{pastille(o)}{pastille(m)}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(['mobile', 'ordinateur'] as const).map((a) => <button key={a} type="button" aria-pressed={appareil === a} onClick={() => { setAppareil(a); setZones([]); }} className={`${bouton} ${appareil === a ? 'border-teal-800 bg-teal-50 font-semibold' : ''}`}>{a === 'mobile' ? 'Téléphone' : 'Ordinateur'}</button>)}
        {!revalidation && cellule(page, appareil)?.etat === 'a-voir' && (
          <button type="button" disabled={enCours} onClick={() => agir(() => rienASignaler(p.fiche.id, page, appareil))} className={`min-h-11 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white ${focus}`} data-action="rien">Rien à signaler sur cette page</button>
        )}
        {message && <span role="status" className="text-sm text-neutral-700">{message}</span>}
        {design && vue.selecteur}
      </div>

      <div className={`grid gap-3 ${revalidation && p.precedente ? 'lg:grid-cols-2' : 'lg:grid-cols-[minmax(0,1fr)_20rem]'}`}>
        {revalidation && p.precedente && (
          <figure className="grid gap-1"><figcaption className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Avant (v{p.fiche.version - 1})</figcaption>
            <ApercuModele composition={precedenteVue ?? p.precedente} scenario={scenarioVu} rendu={p.rendu} page={page} appareil={appareil} hauteur={h} />
          </figure>
        )}
        <figure className="grid min-w-0 gap-1">
          <figcaption className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{revalidation ? `Après (v${p.fiche.version})` : essai ? 'Proposition 🎲 (pas encore gardée)' : `${libellePageModele(page)} · ${appareil === 'mobile' ? 'téléphone' : 'ordinateur'}`}</figcaption>
          <div className={appareil === 'mobile' ? 'mx-auto w-full max-w-[400px]' : ''}>
            <AnnotateurZones zones={zones} onChange={setZones} appareil={appareil} mode={mode} onMode={setMode} libelle={`Page ${libellePageModele(page)}`}>
              <ApercuModele composition={affichee} scenario={scenarioVu} rendu={p.rendu} page={page} appareil={appareil} hauteur={h} />
            </AnnotateurZones>
          </div>
          {zones.length > 0 && <button type="button" disabled={enCours} onClick={envoyerZones} className={`min-h-11 justify-self-start rounded-lg bg-orange-700 px-4 text-sm font-semibold text-white ${focus}`} data-action="tickets-zones">Créer {zones.length} ticket{zones.length > 1 ? 's' : ''}</button>}
        </figure>

        {!revalidation && (
          <aside className="grid content-start gap-3">
            <section className="grid gap-2 rounded-2xl border border-black/10 bg-white p-3" aria-label="Toucher un élément">
              <h2 className="text-sm font-semibold">Toucher un élément</h2>
              <div className="flex flex-wrap gap-1">
                {elements.map((k) => <button key={k} type="button" aria-pressed={element === k} onClick={() => setElement(element === k ? null : k)} className={`min-h-9 rounded-full border px-2.5 text-xs ${focus} ${element === k ? 'border-orange-700 bg-orange-700 text-white' : 'border-neutral-300 bg-white'}`}>{libelleElement(k, ctx.sujets)}</button>)}
              </div>
              {element && (
                <div className="grid gap-2">
                  <select value={etiquetteElement} onChange={(e) => setEtiquetteElement(e.target.value)} aria-label="Étiquette" className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base md:text-sm">
                    {ETIQUETTES_ZONE.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
                  </select>
                  <input value={commentaireElement} onChange={(e) => setCommentaireElement(e.target.value.slice(0, 500))} placeholder="Ce qui ne va pas" aria-label="Commentaire" className="min-h-11 rounded-lg border border-neutral-300 px-2 text-base md:text-sm" />
                  <button type="button" disabled={enCours} onClick={envoyerElement} className={`min-h-11 rounded-lg bg-orange-700 px-3 text-sm font-semibold text-white ${focus}`} data-action="ticket-element">Créer le ticket</button>
                </div>
              )}
            </section>

            <section className="grid gap-2 rounded-2xl border border-black/10 bg-white p-3" aria-label="Verrouiller et relancer">
              <h2 className="text-sm font-semibold">🔒 Garder ce qui plaît, 🎲 relancer le reste</h2>
              <ul className="grid gap-1">
                {DIMENSIONS_RECETTE.map((d) => (
                  <li key={d.id} className="flex items-center gap-1 text-sm">
                    <button type="button" aria-pressed={verrous.includes(d.id)} onClick={() => setVerrous((l) => (l.includes(d.id) ? l.filter((x) => x !== d.id) : [...l, d.id]))} className={`grid size-11 place-items-center rounded-lg border ${focus} ${verrous.includes(d.id) ? 'border-amber-500 bg-amber-100' : 'border-neutral-300 bg-white'}`} aria-label={`${verrous.includes(d.id) ? 'Déverrouiller' : 'Verrouiller'} ${d.nom}`}>{verrous.includes(d.id) ? '🔒' : '🔓'}</button>
                    <span className="flex-1">{d.nom}</span>
                    <button type="button" disabled={verrous.includes(d.id)} onClick={() => relancer(d.id)} className={`grid size-11 place-items-center rounded-lg border border-neutral-300 bg-white disabled:opacity-40 ${focus}`} aria-label={`Relancer ${d.nom}`}>🎲</button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => relancer(null)} className={bouton} data-action="relancer">🎲 Relancer tout sauf 🔒</button>
              {essai && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={enCours} onClick={() => agir(() => garderRelance(p.fiche.id, essai, relances.join(', ')), () => { setEssai(null); setRelances([]); })} className={`min-h-11 rounded-lg bg-teal-800 px-3 text-sm font-semibold text-white ${focus}`} data-action="garder-relance">Garder cette version</button>
                  <button type="button" onClick={() => { setEssai(null); setRelances([]); }} className={bouton}>Revenir</button>
                </div>
              )}
            </section>
          </aside>
        )}
      </div>

      <section aria-label="Tickets de la page" className="grid gap-1 text-sm">
        <h2 className="font-semibold">Tickets · {libellePageModele(page)} ({appareil === 'mobile' ? 'téléphone' : 'ordinateur'})</h2>
        {ticketsPage.length ? ticketsPage.map((t) => (
          <p key={t.numero} className="rounded-lg bg-white px-3 py-2 ring-1 ring-black/5" data-ticket={t.numero}>
            #{t.numero} · <span className={t.origine === 'testeur' ? 'text-violet-800' : 'text-orange-800'}>{t.origine === 'testeur' ? 'agent' : 'humain'}</span> · {t.etiquette}{t.element ? ` · ${t.element}` : ''}{t.commentaire ? ` : ${t.commentaire}` : ''} · <em>{t.statut}</em>
          </p>
        )) : <p className="text-neutral-600">Aucun ticket sur cette page.</p>}
      </section>
    </div>
  );
}
