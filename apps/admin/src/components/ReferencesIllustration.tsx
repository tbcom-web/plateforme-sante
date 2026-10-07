'use client';

// « Chercher des références » (vue agrandie de /admin/illustrations) : images LIBRES liées au sujet de l'élément, par lots de
// 5 (Wikimedia Commons, Openverse, Pexels, Pixabay ; Google Programmable Search seulement sur demande ou en dernier recours,
// s'il est configuré). Requête pré-remplie par le dictionnaire métier (orthonyxie → « ingrown toenail brace »), modifiable.
// « Relancer (5 autres) » : page suivante, source suivante, puis variantes de la requête ; une image déjà montrée ou écartée
// (« Pas pertinent ») ne revient jamais pour cet élément. Paul coche les bonnes, dit ce qui l'inspire (+ texte court), accepte
// ou refuse le classement suggéré, puis enregistre : INSPIRATIONS liées à l'élément (vignette ≤ 400 px WebP dans le bucket
// PRIVÉ « inspirations »). Vignettes affichées : servies par la source. Rien n'est jamais réutilisé sur un site.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { hashtagsValides, SUJETS_VISUELS, sujetsDuVisuel, type HashtagsAssets, type SurchargesSujets, type VisuelSujets } from '@plateforme/core';
import { suggererClassement } from '@plateforme/core/classement-visuels';
import { requeteDepuisElement } from '@plateforme/core/dictionnaire-metier';
import {
  cleReference, ETIQUETTES_REFERENCE, INFOS_SOURCES_REFERENCES, initialiserRelance, integrerPage, marquerEpuisee, prendreLot, REGLE_REFERENCES, requetesDuLot, SOURCES_REFERENCES,
  sourcesActives, TEXTE_REFERENCE_MAX, type EtatRelance, type ReferenceImage, type SourceReference,
} from '@plateforme/core/references-illustrations';
import {
  chercherPageReferences, ecarterReference, enregistrerReferences, etatSourcesReferences, referencesDeLElement, retirerReference, type EtatSources, type ReferenceEnregistree,
} from '@/app/admin/illustrations/actions-references';
import { SuggestionsClassement } from '@/components/SuggestionsClassement';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-1';
const libelleSujet = (id: string) => SUJETS_VISUELS.find((s) => s.id === id)?.libelle ?? id;
const CLE_VUES = (cle: string) => `references-vues:${cle}`;
const VUES_MAX = 600;
const APPELS_PAR_LOT = 8;

function lireVues(cle: string): string[] {
  try { const v = JSON.parse(window.localStorage.getItem(CLE_VUES(cle)) ?? '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}
function ecrireVues(cle: string, vues: readonly string[]) {
  try { window.localStorage.setItem(CLE_VUES(cle), JSON.stringify(vues.slice(-VUES_MAX))); } catch { /* stockage indisponible : mémoire de la session seulement */ }
}

type Choix = { reference: ReferenceImage; etiquettes: string[]; texte: string; sujets: string[]; hashtags: string[] };

type Props = {
  element: VisuelSujets & { titre: string; detail?: string | null };
  surcharges: SurchargesSujets;
  hashtags: HashtagsAssets;
  /** Inventaire (co-occurrences des suggestions de classement) */
  inventaire: readonly VisuelSujets[];
};

export default function ReferencesIllustration({ element, surcharges, hashtags, inventaire }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [sources, setSources] = useState<EtatSources | null>(null);
  const [requete, setRequete] = useState(() => requeteDepuisElement(element));
  const [etat, setEtat] = useState<EtatRelance | null>(null);
  const [lot, setLot] = useState<ReferenceImage[]>([]);
  const [numeroLot, setNumeroLot] = useState(0);
  const [chargement, setChargement] = useState(false);
  const [google, setGoogle] = useState(false);
  const [erreurs, setErreurs] = useState<Partial<Record<SourceReference, string>>>({});
  const [choix, setChoix] = useState<Choix[]>([]);
  const [enregistrees, setEnregistrees] = useState<ReferenceEnregistree[]>([]);
  const [ecartees, setEcartees] = useState<string[]>([]);
  const [migration, setMigration] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  const disponibles = useMemo(() => SOURCES_REFERENCES.filter((s) => sources?.configurees[s]), [sources]);
  const sujetsElement = useMemo(() => sujetsDuVisuel(element, surcharges).sujets, [element, surcharges]);
  const hashtagsElement = hashtags[element.cle] ?? [];
  const sujetsVoisins = useMemo(() => Object.fromEntries(inventaire.map((v) => [v.cle, sujetsDuVisuel(v, surcharges).sujets])), [inventaire, surcharges]);

  const relancer = useCallback(async (depart: EtatRelance, googleExplicite: boolean) => {
    setChargement(true);
    setMessage(null);
    let e = depart;
    const errs: Partial<Record<SourceReference, string>> = {};
    for (let i = 0; i <= APPELS_PAR_LOT; i++) {
      const r = prendreLot(e, sourcesActives(e, disponibles, googleExplicite), { forcer: i === APPELS_PAR_LOT });
      if (!r.aCharger) {
        setEtat(r.etat);
        setLot(r.lot);
        if (r.lot.length) { setNumeroLot((n) => n + 1); ecrireVues(element.cle, r.etat.vues); }
        else setMessage({ ok: false, texte: 'Plus aucune image nouvelle pour cette requête : modifiez-la ou incluez Google.' });
        break;
      }
      const { source, requete: q, page } = r.aCharger;
      const p = await chercherPageReferences(source, q, page).catch(() => ({ ok: false, message: 'Connexion perdue.', references: [] as ReferenceImage[], brut: 0, quotaGoogle: undefined }));
      if (p.quotaGoogle !== undefined) setSources((s) => (s ? { ...s, quotaGoogle: { ...s.quotaGoogle, restant: p.quotaGoogle! } } : s));
      if (!p.ok) { errs[source] = p.message; e = marquerEpuisee(e, source); continue; }
      e = integrerPage(e, source, { requete: q, references: p.references, brut: p.brut });
    }
    setErreurs(errs);
    setChargement(false);
  }, [disponibles, element.cle]);

  // Ouverture : sources configurées, références déjà enregistrées, images écartées
  const ouvrir = async () => {
    setOuvert(true);
    const [s, r] = await Promise.all([etatSourcesReferences(), referencesDeLElement(element.cle)]).catch(() => [null, null] as const);
    if (!s || !r) { setMessage({ ok: false, texte: 'Connexion perdue.' }); return; }
    setSources(s);
    setEnregistrees(r.references);
    setEcartees(r.ecartees);
    setMigration(r.migrationManquante);
  };
  // Premier lot dès que les sources sont connues
  useEffect(() => {
    if (ouvert && sources && !etat && disponibles.length) void relancer(initialiserRelance(requete, [...lireVues(element.cle), ...ecartees]), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert, sources]);

  const chercher = () => { setLot([]); void relancer(initialiserRelance(requete, [...(etat?.vues ?? lireVues(element.cle)), ...ecartees]), google); };

  const coche = (r: ReferenceImage) => choix.some((c) => cleReference(c.reference) === cleReference(r));
  const basculer = (r: ReferenceImage) => setChoix((l) => (coche(r) ? l.filter((c) => cleReference(c.reference) !== cleReference(r)) : [...l, { reference: r, etiquettes: [], texte: '', sujets: [], hashtags: [] }]));
  const modifier = (k: string, f: (c: Choix) => Choix) => setChoix((l) => l.map((c) => (cleReference(c.reference) === k ? f(c) : c)));

  const ecarter = async (r: ReferenceImage) => {
    const k = cleReference(r);
    setLot((l) => l.filter((x) => cleReference(x) !== k));
    setChoix((l) => l.filter((c) => cleReference(c.reference) !== k));
    setEcartees((l) => [...l, k]);
    const res = await ecarterReference(element.cle, r.source, r.idSource, r.requete ?? null).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setMessage({ ok: res.ok, texte: res.ok ? 'Image écartée : elle ne sera plus proposée pour cet élément.' : res.message });
  };

  const enregistrer = async () => {
    if (!choix.length) return;
    setMessage({ ok: true, texte: 'Enregistrement des références…' });
    const r = await enregistrerReferences(element.cle, choix).catch(() => ({ ok: false, message: 'Connexion perdue.', enregistrees: [] as string[], erreurs: [], migrationManquante: false }));
    setChoix((l) => l.filter((c) => !r.enregistrees.includes(cleReference(c.reference))));
    setMessage({ ok: r.ok, texte: [r.message, ...r.erreurs.map((e) => e.message)].join(' ') });
    if (r.migrationManquante) setMigration(true);
    if (r.enregistrees.length) { const x = await referencesDeLElement(element.cle).catch(() => null); if (x) setEnregistrees(x.references); }
  };

  const retirer = async (id: string) => {
    const r = await retirerReference(id).catch(() => ({ ok: false, message: 'Connexion perdue.' }));
    setMessage({ ok: r.ok, texte: r.message });
    if (r.ok) setEnregistrees((l) => l.filter((x) => x.id !== id));
  };

  if (!ouvert) {
    return (
      <button type="button" onClick={() => void ouvrir()} className={`min-h-11 justify-self-start rounded-lg bg-white px-4 text-sm font-semibold text-teal-900 ring-1 ring-teal-300 hover:bg-teal-50 ${focus}`}>
        Chercher des références
      </button>
    );
  }

  const requetesLot = requetesDuLot(lot);
  return (
    <section className="grid gap-3 rounded-xl bg-neutral-50 p-3 ring-1 ring-black/5" aria-label="Références d’illustration">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">Références d’illustration</h2>
          <p className="text-xs text-neutral-600">Images libres liées au sujet, par lots de 5. Cochez celles qui vous inspirent.</p>
        </div>
        <button type="button" onClick={() => setOuvert(false)} className={`min-h-11 rounded-lg px-3 text-sm ring-1 ring-black/10 hover:bg-white ${focus}`}>Masquer</button>
      </div>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 ring-1 ring-amber-200" role="note">{REGLE_REFERENCES}</p>
      {migration && <p className="text-xs text-amber-800">Migration 0033 à exécuter (supabase/migrations/0033_references_illustrations.sql) : la recherche fonctionne, l’enregistrement non.</p>}

      <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); chercher(); }}>
        <label htmlFor={`req-${element.cle}`} className="text-sm font-medium">Requête (anglais : langue des banques d’images)</label>
        <div className="flex flex-wrap gap-2">
          <input id={`req-${element.cle}`} value={requete} onChange={(e) => setRequete(e.target.value.slice(0, 100))} maxLength={100} autoCapitalize="none" spellCheck={false}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-base md:text-sm" />
          <button type="submit" disabled={chargement || !requete.trim() || !disponibles.length} className={`min-h-11 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white disabled:opacity-50 ${focus}`}>Chercher</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['diagram', 'illustration', 'icon', 'line drawing'].map((m) => (
            <button key={m} type="button" onClick={() => setRequete((q) => (q.includes(m) ? q : `${q.trim()} ${m}`.trim()))} className={`min-h-9 rounded-full border border-dashed border-neutral-400 px-3 text-xs text-neutral-700 hover:bg-white ${focus}`}>+ {m}</button>
          ))}
        </div>
      </form>

      <ul className="flex flex-wrap gap-1.5 text-xs" aria-label="Sources">
        {SOURCES_REFERENCES.map((s) => {
          const ok = sources?.configurees[s];
          return (
            <li key={s} className={`rounded-full px-2.5 py-1 ring-1 ${ok ? 'bg-white text-neutral-800 ring-black/10' : 'bg-neutral-100 text-neutral-500 ring-neutral-200'}`} title={erreurs[s] ?? ''}>
              {INFOS_SOURCES_REFERENCES[s].libelle}
              {!ok ? ' · non configurée' : s === 'google' && sources ? ` · quota estimé ${sources.quotaGoogle.restant}/${sources.quotaGoogle.jour}` : ''}
              {erreurs[s] ? ' · indisponible' : ''}
            </li>
          );
        })}
      </ul>
      {sources?.configurees.google && (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={google} onChange={(e) => setGoogle(e.target.checked)} className="size-5" />
          Inclure Google dans les relances (sinon seulement en dernier recours, pour préserver le quota gratuit)
        </label>
      )}
      {Object.values(erreurs).length > 0 && <p className="text-xs text-amber-800">{Object.values(erreurs).join(' ')}</p>}

      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            {chargement ? 'Recherche…' : lot.length ? <>Lot {numeroLot} · requête{requetesLot.length > 1 ? 's' : ''} {requetesLot.map((q) => (
              <button key={q} type="button" onClick={() => setRequete(q)} title="Reprendre cette requête pour la modifier" className={`mx-0.5 rounded bg-white px-1.5 py-0.5 font-mono text-xs ring-1 ring-black/10 hover:bg-teal-50 ${focus}`}>{q}</button>
            ))}</> : 'Aucun lot affiché.'}
          </p>
          <button type="button" disabled={chargement || !etat} onClick={() => etat && void relancer(etat, google)}
            className={`min-h-11 rounded-lg bg-white px-4 text-sm font-semibold ring-1 ring-teal-300 hover:bg-teal-50 disabled:opacity-50 ${focus}`}>Relancer (5 autres)</button>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Images proposées">
          {lot.map((r) => {
            const actif = coche(r);
            return (
              <li key={cleReference(r)} className={`grid content-start gap-1 overflow-hidden rounded-lg bg-white text-xs ring-1 ${actif ? 'ring-2 ring-teal-700' : 'ring-black/10'}`}>
                <button type="button" onClick={() => basculer(r)} aria-pressed={actif} className={`relative block aspect-[4/3] w-full bg-neutral-100 ${focus}`} aria-label={`${actif ? 'Décocher' : 'Cocher'} ${r.titre || 'cette image'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- vignette servie par la source, jamais optimisée chez nous */}
                  <img src={r.vignette} alt={r.titre || r.description || 'Image de référence'} loading="lazy" referrerPolicy="no-referrer" className="size-full object-contain" />
                  <span className={`absolute left-1.5 top-1.5 grid size-7 place-items-center rounded-md text-sm font-bold ring-1 ${actif ? 'bg-teal-700 text-white ring-teal-800' : 'bg-white/90 text-transparent ring-black/20'}`} aria-hidden>✓</span>
                </button>
                <div className="grid gap-0.5 px-2 pb-2">
                  <p className="truncate font-medium text-neutral-900" title={r.titre}>{r.titre || '—'}</p>
                  <p className="truncate text-neutral-600">{INFOS_SOURCES_REFERENCES[r.source].libelle}{r.auteur ? ` · ${r.auteur}` : ''}</p>
                  <p className="truncate text-neutral-500" title={r.licence}>{r.licence || 'Licence inconnue'}</p>
                  <div className="flex items-center justify-between gap-1">
                    <a href={r.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center font-semibold text-teal-900 underline-offset-2 hover:underline">Page d’origine ↗</a>
                    <button type="button" onClick={() => void ecarter(r)} className={`min-h-9 rounded px-1.5 text-neutral-600 hover:bg-neutral-100 ${focus}`}>Pas pertinent</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {choix.length > 0 && (
        <div className="grid gap-2">
          <p className="text-sm font-semibold">Images cochées ({choix.length}) · ce qui m’inspire</p>
          <ul className="grid gap-2">
            {choix.map((c) => {
              const k = cleReference(c.reference);
              const sugg = suggererClassement({
                requete: c.reference.requete, tags: c.reference.tags, titre: c.reference.titre, description: c.reference.description,
                sujetsOrigine: sujetsElement, hashtagsOrigine: hashtagsElement, voisins: { hashtags, sujets: sujetsVoisins }, deja: { sujets: c.sujets, hashtags: c.hashtags },
              });
              return (
                <li key={k} className="grid gap-2 rounded-lg bg-white p-2 ring-1 ring-black/10 sm:grid-cols-[96px_minmax(0,1fr)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- vignette servie par la source */}
                  <img src={c.reference.vignette} alt="" referrerPolicy="no-referrer" className="aspect-[4/3] w-24 rounded bg-neutral-100 object-contain" />
                  <div className="grid gap-1.5">
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ce qui m’inspire">
                      {ETIQUETTES_REFERENCE.map((e) => {
                        const actif = c.etiquettes.includes(e.id);
                        return (
                          <button key={e.id} type="button" aria-pressed={actif} onClick={() => modifier(k, (x) => ({ ...x, etiquettes: actif ? x.etiquettes.filter((y) => y !== e.id) : [...x.etiquettes, e.id] }))}
                            className={`min-h-9 rounded-full border px-3 text-sm ${focus} ${actif ? 'border-teal-800 bg-teal-800 text-white' : 'border-neutral-200 bg-white hover:bg-neutral-50'}`}>{e.libelle}</button>
                        );
                      })}
                    </div>
                    <input value={c.texte} maxLength={TEXTE_REFERENCE_MAX} onChange={(e) => modifier(k, (x) => ({ ...x, texte: e.target.value }))} placeholder="Ce qui m’inspire, en quelques mots (facultatif)"
                      aria-label="Texte : ce qui m’inspire" className="min-h-11 rounded-lg border border-neutral-300 px-3 text-base md:text-sm" />
                    {(c.sujets.length > 0 || c.hashtags.length > 0) && (
                      <ul className="flex flex-wrap gap-1.5" aria-label="Classement retenu">
                        {c.sujets.map((s) => <li key={s}><button type="button" onClick={() => modifier(k, (x) => ({ ...x, sujets: x.sujets.filter((y) => y !== s) }))} className={`min-h-9 rounded-full bg-teal-50 px-3 text-sm text-teal-950 ring-1 ring-teal-200 ${focus}`} aria-label={`Retirer ${libelleSujet(s)}`}>{libelleSujet(s)} ×</button></li>)}
                        {c.hashtags.map((h) => <li key={h}><button type="button" onClick={() => modifier(k, (x) => ({ ...x, hashtags: x.hashtags.filter((y) => y !== h) }))} className={`min-h-9 rounded-full bg-sky-50 px-3 text-sm text-sky-950 ring-1 ring-sky-200 ${focus}`} aria-label={`Retirer #${h}`}>#{h} ×</button></li>)}
                      </ul>
                    )}
                    <SuggestionsClassement suggestions={sugg} contexte="reference" compact
                      onSujet={(ids) => modifier(k, (x) => ({ ...x, sujets: [...new Set([...x.sujets, ...ids])] }))}
                      onHashtag={(t) => modifier(k, (x) => ({ ...x, hashtags: hashtagsValides([...x.hashtags, ...t]) }))} />
                  </div>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => void enregistrer()} className={`min-h-11 justify-self-start rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white hover:bg-teal-900 ${focus}`}>
            Enregistrer {choix.length} référence{choix.length > 1 ? 's' : ''} comme inspiration{choix.length > 1 ? 's' : ''}
          </button>
        </div>
      )}
      {message && <p role="status" className={`text-sm ${message.ok ? 'text-teal-900' : 'text-red-800'}`}>{message.texte}</p>}

      <div className="grid gap-2">
        <p className="text-sm font-semibold">Références enregistrées pour cet élément ({enregistrees.length})</p>
        {!enregistrees.length && <p className="text-xs text-neutral-500">Aucune pour l’instant.</p>}
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {enregistrees.map((r) => (
            <li key={r.id} className="grid content-start gap-1 rounded-lg bg-white p-1.5 text-xs ring-1 ring-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL signée du bucket privé */}
              {r.image ? <img src={r.image} alt="" className="aspect-[4/3] w-full rounded bg-neutral-100 object-contain" /> : <div className="aspect-[4/3] rounded bg-neutral-100" />}
              <p className="text-neutral-700">{r.etiquettes.map((e) => ETIQUETTES_REFERENCE.find((x) => x.id === e)?.libelle ?? e).join(', ') || '—'}</p>
              {r.texte && <p className="line-clamp-2 text-neutral-900">{r.texte}</p>}
              <p className="truncate text-neutral-500">{INFOS_SOURCES_REFERENCES[r.source].libelle}{r.licence ? ` · ${r.licence}` : ''}</p>
              <div className="flex items-center justify-between">
                <a href={r.pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center font-semibold text-teal-900 underline-offset-2 hover:underline">Page ↗</a>
                <button type="button" onClick={() => void retirer(r.id)} className={`min-h-9 rounded px-1.5 text-neutral-600 hover:bg-neutral-100 ${focus}`}>Retirer</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <button type="button" onClick={() => { ecrireVues(element.cle, []); setEtat(null); setLot([]); void relancer(initialiserRelance(requete, ecartees), google); }}
        className={`min-h-9 justify-self-start text-xs text-neutral-600 underline ${focus}`}>Oublier les images déjà vues (les écartées restent écartées)</button>
    </section>
  );
}
