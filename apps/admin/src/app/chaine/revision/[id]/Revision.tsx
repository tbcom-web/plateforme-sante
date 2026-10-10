'use client';

// RELECTURE GUIDÉE d'un modèle (demande de Paul du 2026-10-10 : « on me propose de revoir chaque page du modèle, je valide ou
// j'indique ce qui manque éventuellement avec des notes […] on me guide pas à pas jusqu'à la publication du modèle »). Mobile d'abord.
// Une page à la fois (téléphone puis ordinateur), en grand, deux gestes : ✓ « Page OK » ou ✎ « Il manque / à corriger » (note,
// zone entourée, étiquettes rapides repliées). Barre « Page 3 / 16 », précédente / suivante, reprise à la première page pas vue.
// Fin : récapitulatif → « Envoyer les corrections à Claude » (demande à copier dans Claude Code) ; au retour de la nouvelle version,
// seules les pages modifiées sont reproposées (revalidation) ; tout au vert → écran « Publier ce modèle pour les praticiens » (Paul).
// STRUCTURE FIGÉE (décision de Paul du 2026-10-10) : plus de 🔒 / 🎲 ici ; seules les IMAGES se choisissent, en situation, sur la
// page (ChoixImagesSituation : photos et illustration du haut, candidates du kit du profil) — préférence de rendu, jamais une version.
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ETIQUETTES_ZONE, libellePageModele, PAGES_MODELE, pagesChangees,
  type AppareilModele, type EtatCellule, type LigneJournal, type PageModele, type PhotoBanque, type PoidsAtelier, type StatutModele, type TicketModele, type VerrouValidation, type Zone,
} from '@plateforme/core';
import { structureFigee, type CandidateImage, type ChoixImage } from '@plateforme/core/chaine-images';
import AnnotateurZones from '@/components/AnnotateurZones';
import ChoixImagesSituation from '@/components/ChoixImagesSituation';
import ApercuModele, { type RenduChaine, type ScenarioChaine } from '../../ApercuModele';
import type { ProfilRendu } from '../../rendu-profil';
import { creerTickets, revalider, rienASignaler } from '../../actions';
import { envoyerCorrections, publierDepuisParcours } from '../../images-actions';
import { useImagesSituation } from '../../images-situation';

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const bouton = `min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm ${focus}`;
export const PHRASE_CLAUDE = 'Corrige les tickets de la chaîne des modèles (retours/tickets-modeles.json)';

type Props = {
  moi: string;
  validateur: boolean;
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
  /** Photos candidates de chaque profil de démonstration (kit du profil) */
  candidates: Record<string, CandidateImage[]>;
  /** Choix d'images déjà faits pour ce modèle */
  choix: ChoixImage[];
  migrationImages: boolean;
  /** Écran de publication (prêt pour validation) */
  publication: { verrous: VerrouValidation[]; profils: { id: string; nom: string; coche: boolean }[]; publies: string[] } | null;
};

type Etape = { page: PageModele; appareil: AppareilModele };
const libelleAppareil = (a: AppareilModele) => (a === 'mobile' ? 'téléphone' : 'ordinateur');
const ORDRE: Etape[] = (['mobile', 'ordinateur'] as const).flatMap((a) => PAGES_MODELE.map((p) => ({ page: p.id, appareil: a })));
const lireLocal = (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const ecrireLocal = (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch { /* navigation privée */ } };

export default function Revision(p: Props) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState('');
  const s = p.fiche.statut;
  const revalidation = s === 'revalidation';
  const attente = s === 'retouche' || s === 'recheck-agent';
  const [signaler, setSignaler] = useState(false);
  const mode: 'relecture' | 'revalidation' | 'attente' | 'publication' | 'publie' =
    revalidation ? 'revalidation' : s === 'pret-validation' && !signaler ? 'publication' : s === 'publie' && !signaler ? 'publie' : attente ? 'attente' : 'relecture';

  // ---- Étapes du parcours ----
  const changees = useMemo(() => (p.precedente ? pagesChangees(p.precedente, p.composition) : PAGES_MODELE.map((x) => x.id)), [p.precedente, p.composition]);
  const etapes: Etape[] = mode === 'revalidation' ? ORDRE.filter((e) => changees.includes(e.page)) : ORDRE;
  const cellule = (e: Etape) => p.cellules.find((c) => c.page === e.page && c.appareil === e.appareil);
  const [faitsLocaux, setFaitsLocaux] = useState<Record<string, 'ok' | 'remarque'>>({});
  const cleE = (e: Etape) => `${e.page}|${e.appareil}`;
  const etatEtape = (e: Etape): 'a-voir' | 'ok' | 'remarque' => faitsLocaux[cleE(e)] ?? (mode === 'revalidation' ? 'a-voir' : cellule(e)?.etat === 'ok' ? 'ok' : cellule(e)?.etat === 'tickets' ? 'remarque' : 'a-voir');
  const cleLocale = `relecture:${p.fiche.id}:v${p.fiche.version}:${mode}`;
  const [i, setI] = useState(0);
  // Reprise : première page pas vue (relecture) ou dernière étape ouverte (revalidation, gardée dans le navigateur)
  useEffect(() => {
    let faits: Record<string, 'ok' | 'remarque'> = {};
    try { faits = JSON.parse(lireLocal(`${cleLocale}:faits`) ?? '{}') ?? {}; } catch { faits = {}; }
    if (mode === 'revalidation') setFaitsLocaux(faits);
    const local = Number(lireLocal(cleLocale));
    const premiere = etapes.findIndex((e) => etatEtape(e) === 'a-voir');
    setI(mode === 'revalidation' && Number.isInteger(local) && local > 0 ? Math.min(local, etapes.length) : premiere < 0 ? etapes.length : premiere);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleLocale]);
  useEffect(() => { ecrireLocal(cleLocale, String(i)); }, [cleLocale, i]);
  useEffect(() => { if (Object.keys(faitsLocaux).length) ecrireLocal(`${cleLocale}:faits`, JSON.stringify(faitsLocaux)); }, [cleLocale, faitsLocaux]);
  const etape = etapes[i] ?? null;
  const aller = (n: number) => { setI(Math.max(0, Math.min(etapes.length, n))); setRemarque(false); setZones([]); setNote(''); im.reinitialiser(); window.scrollTo?.({ top: 0, behavior: 'smooth' }); };
  const suivante = () => {
    const apres = etapes.findIndex((e, k) => k > i && etatEtape(e) === 'a-voir');
    aller(mode === 'revalidation' ? i + 1 : apres < 0 ? etapes.length : apres);
  };

  // ---- Remarque (✎) ----
  const [remarque, setRemarque] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [modeZone, setModeZone] = useState(false);
  const [note, setNote] = useState('');
  const [etiquette, setEtiquette] = useState('a-revoir');
  const [rouvrir, setRouvrir] = useState<number[]>([]);
  const [avant, setAvant] = useState(false);

  // ---- Rendu : design habillé des images du profil + choix d'images (préférences de rendu, images-situation.tsx) ----
  const im = useImagesSituation({ modele: p.fiche.id, design: p.composition, profils: p.profilsRendu, poids: p.poids, photos: p.photos, rendu: p.rendu, candidates: p.candidates, choix: p.choix, migrationImages: p.migrationImages });
  const design = im.actif;
  const vue = im.vue;
  const scenarioVu = (design && im.scenario) || p.fiche.scenario;
  const affichee = im.affichee;
  const emplacements = im.emplacements;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const precedenteVue = useMemo(() => (p.precedente && design ? im.rendre(p.precedente, false) : p.precedente), [p.precedente, design, vue.profil?.id, im.emplacements]);

  const agir = (f: () => Promise<{ ok: boolean; message: string }>, apres?: () => void) => demarrer(async () => {
    const r = await f();
    setMessage(r.message);
    if (r.ok) { apres?.(); router.refresh(); }
  });
  const pageOk = () => etape && agir(() => (mode === 'revalidation' ? Promise.resolve({ ok: true, message: 'Noté : corrigé.' }) : rienASignaler(p.fiche.id, etape.page, etape.appareil)), () => { setFaitsLocaux((l) => ({ ...l, [cleE(etape)]: 'ok' })); suivante(); });
  const envoyerRemarque = () => {
    if (!etape) return;
    const t = zones.length
      ? zones.map((z) => ({ page: etape.page, appareil: etape.appareil, zone: { forme: z.forme, x: z.x, y: z.y, l: z.l, h: z.h }, etiquette: z.etiquette || etiquette, commentaire: [z.commentaire, note].filter(Boolean).join(' · ').slice(0, 500) }))
      : [{ page: etape.page, appareil: etape.appareil, etiquette, commentaire: note.slice(0, 500) }];
    agir(() => creerTickets(p.fiche.id, t), () => { setFaitsLocaux((l) => ({ ...l, [cleE(etape)]: 'remarque' })); suivante(); });
  };
  const peutEnvoyer = zones.length > 0 || note.trim().length >= 3;

  const ticketsVersion = p.tickets.filter((t) => t.origine === 'humain' && t.statut === 'ouvert');
  const corriges = p.tickets.filter((t) => t.statut === 'corrige' && t.versionCorrection === p.fiche.version);
  const ticketsEtape = (e: Etape) => p.tickets.filter((t) => t.page === e.page && t.appareil === e.appareil && (t.statut === 'ouvert' || t.statut === 'corrige'));
  const h = etape?.appareil === 'ordinateur' ? 620 : 680;

  // ---- Écrans hors pages ----
  if (mode === 'publication' && p.publication) return <Publication {...p} publication={p.publication} onSignaler={() => setSignaler(true)} />;
  if (mode === 'publie') {
    return (
      <section className="grid gap-3 rounded-2xl border border-teal-200 bg-teal-50/60 p-4" data-ecran="publie">
        <h2 className="text-xl font-bold">Publié pour les praticiens</h2>
        <p className="text-sm text-neutral-700">« {p.fiche.nom} » (v{p.fiche.version}) est dans les choix des praticiens{p.publication?.publies.length ? ` : ${p.publication.publies.join(', ')}` : ''}.</p>
        <button type="button" onClick={() => setSignaler(true)} className={`${bouton} justify-self-start`} data-action="signaler">Signaler quelque chose (rouvre une retouche, reste en ligne)</button>
      </section>
    );
  }
  if (mode === 'attente') return <Attente statut={s} tickets={p.tickets.filter((t) => t.statut === 'ouvert')} validateur={p.validateur} />;

  const n = etapes.length;
  const faites = etapes.filter((e) => etatEtape(e) !== 'a-voir').length;
  return (
    <div className="grid gap-4" data-parcours={mode}>
      {/* Progression */}
      <section aria-label="Progression" className="grid gap-2 rounded-2xl border border-black/10 bg-white/95 p-3 lg:sticky lg:top-0 lg:z-10 lg:backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold" data-etape={etape ? `${i + 1}/${n}` : 'recap'}>
            {mode === 'revalidation' ? 'Revalidation · ' : ''}{etape ? `Page ${i + 1} / ${n} · ${libellePageModele(etape.page)} · ${libelleAppareil(etape.appareil)}` : 'Récapitulatif'}
          </p>
          <span className="ml-auto text-xs text-neutral-600">{faites} / {n} vues</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuemin={0} aria-valuemax={n} aria-valuenow={faites} aria-label="Pages vues">
          <div className="h-full rounded-full bg-teal-700 transition-[width]" style={{ width: `${n ? (faites / n) * 100 : 100}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={i === 0} onClick={() => aller(i - 1)} className={`${bouton} disabled:opacity-40`} data-action="precedente">‹ Précédente</button>
          <button type="button" disabled={i >= n} onClick={() => aller(i + 1)} className={`${bouton} disabled:opacity-40`} data-action="suivante">Suivante ›</button>
          {etape && <button type="button" onClick={() => aller(n)} className="min-h-11 px-2 text-sm text-teal-900 underline">Récapitulatif</button>}
          {design && vue.selecteur}
        </div>
        {s !== 'avis-humain' && mode === 'relecture' && s !== 'publie' && s !== 'pret-validation' && <p className="text-xs text-amber-900">Le test automatique passe d’abord ({p.test ? `verdict : ${p.test.verdict}` : 'en attente'}) ; vous pouvez déjà relire.</p>}
      </section>

      {etape ? (
        <>
          {mode === 'revalidation' && p.precedente && (
            <div className="flex gap-1 lg:hidden" role="group" aria-label="Avant ou après">
              {[false, true].map((x) => <button key={String(x)} type="button" aria-pressed={avant === x} onClick={() => setAvant(x)} className={`${bouton} ${avant === x ? 'border-teal-800 bg-teal-50 font-semibold' : ''}`}>{x ? `Avant (v${p.fiche.version - 1})` : `Après (v${p.fiche.version})`}</button>)}
            </div>
          )}
          <div className={`grid gap-3 ${mode === 'revalidation' && p.precedente ? 'lg:grid-cols-2' : ''}`}>
            {mode === 'revalidation' && p.precedente && (
              <figure className={`min-w-0 gap-1 ${avant ? 'grid' : 'hidden lg:grid'}`}>
                <figcaption className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Avant (v{p.fiche.version - 1})</figcaption>
                <div className={etape.appareil === 'mobile' ? 'mx-auto w-full max-w-[400px]' : ''}>
                  <ApercuModele composition={precedenteVue ?? p.precedente} scenario={scenarioVu} rendu={p.rendu} page={etape.page} appareil={etape.appareil} hauteur={h} />
                </div>
              </figure>
            )}
            <figure className={`min-w-0 gap-1 ${mode === 'revalidation' && avant ? 'hidden lg:grid' : 'grid'}`}>
              <figcaption className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{mode === 'revalidation' ? `Après (v${p.fiche.version})` : `${libellePageModele(etape.page)} · ${libelleAppareil(etape.appareil)}`}</figcaption>
              <div className={etape.appareil === 'mobile' ? 'mx-auto w-full max-w-[400px]' : ''}>
                <ChoixImagesSituation emplacements={emplacements} desactive={remarque && modeZone} onApercu={im.onApercu} onChoisir={im.onChoisir}>
                  {remarque ? (
                    <AnnotateurZones zones={zones} onChange={setZones} appareil={etape.appareil} mode={modeZone} onMode={setModeZone} libelle={`Page ${libellePageModele(etape.page)}`}>
                      <ApercuModele composition={affichee} scenario={scenarioVu} rendu={p.rendu} page={etape.page} appareil={etape.appareil} hauteur={h} />
                    </AnnotateurZones>
                  ) : <ApercuModele composition={affichee} scenario={scenarioVu} rendu={p.rendu} page={etape.page} appareil={etape.appareil} hauteur={h} />}
                </ChoixImagesSituation>
              </div>
              {design && emplacements.length > 0 && <p className="text-xs text-neutral-600" data-aide-images="">Images : survolez ou touchez une photo{emplacements.some((e) => e.id === 'heros') ? ' ou l’illustration du haut' : ''} pour en choisir une autre (‹ ›, molette). La structure du modèle est figée{structureFigee(s) ? '' : ' à partir des finalistes'}.</p>}
            </figure>
          </div>

          {/* Deux gestes */}
          {!remarque ? (
            <div className="sticky bottom-2 z-10 grid grid-cols-2 gap-2 rounded-2xl bg-white/90 p-1.5 shadow-lg ring-1 ring-black/10 backdrop-blur sm:flex lg:static lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0">
              <button type="button" disabled={enCours} onClick={pageOk} className={`min-h-14 rounded-xl bg-teal-800 px-5 text-base font-semibold text-white disabled:opacity-60 ${focus}`} data-action="page-ok">✓ {mode === 'revalidation' ? 'C’est bon' : 'Page OK'}</button>
              <button type="button" onClick={() => { setRemarque(true); setModeZone(false); }} className={`min-h-14 rounded-xl border-2 border-orange-700 bg-white px-5 text-base font-semibold text-orange-800 ${focus}`} data-action="remarque">✎ {mode === 'revalidation' ? 'Encore à corriger' : 'Il manque / à corriger'}</button>
            </div>
          ) : (
            <section ref={(el) => { if (el && !el.dataset.vu) { el.dataset.vu = '1'; el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }} aria-label="Remarque" className="grid gap-2 rounded-2xl border border-orange-200 bg-orange-50/60 p-3" data-remarque="">
              <label className="grid gap-1 text-sm font-semibold">Ce qui manque ou est à corriger
                <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} rows={3} placeholder="Ex. : le titre est coupé sur téléphone, il manque les horaires…" className="rounded-lg border border-neutral-300 bg-white p-2 text-base font-normal md:text-sm" />
              </label>
              <p className="text-xs text-neutral-700">Facultatif : « Signaler une zone » au-dessus de l’aperçu pour entourer l’endroit ({zones.length} zone{zones.length > 1 ? 's' : ''}).</p>
              <details className="text-sm">
                <summary className="min-h-11 cursor-pointer content-center">Étiquette rapide : {ETIQUETTES_ZONE.find((e) => e.id === etiquette)?.libelle}</summary>
                <div className="mt-1 flex flex-wrap gap-1">
                  {ETIQUETTES_ZONE.map((e) => <button key={e.id} type="button" aria-pressed={etiquette === e.id} onClick={() => setEtiquette(e.id)} className={`min-h-9 rounded-full border px-2.5 text-xs ${focus} ${etiquette === e.id ? 'border-orange-700 bg-orange-700 text-white' : 'border-neutral-300 bg-white'}`}>{e.libelle}</button>)}
                </div>
              </details>
              {mode === 'revalidation' && ticketsEtape(etape).filter((t) => t.statut === 'corrige').map((t) => (
                <label key={t.numero} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-5" checked={rouvrir.includes(t.numero)} onChange={(e) => setRouvrir((l) => (e.target.checked ? [...l, t.numero] : l.filter((x) => x !== t.numero)))} /> #{t.numero} pas encore corrigé : {t.commentaire || t.etiquette}</label>
              ))}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={enCours || (!peutEnvoyer && !(mode === 'revalidation' && rouvrir.length))} onClick={() => (peutEnvoyer ? envoyerRemarque() : (setFaitsLocaux((l) => ({ ...l, [cleE(etape)]: 'remarque' })), suivante()))} className={`min-h-12 rounded-xl bg-orange-700 px-4 font-semibold text-white disabled:opacity-50 ${focus}`} data-action="enregistrer-remarque">Enregistrer et page suivante</button>
                <button type="button" onClick={() => { setRemarque(false); setZones([]); setModeZone(false); }} className={bouton}>Annuler</button>
              </div>
            </section>
          )}
          {message && <p role="status" className="text-sm text-neutral-700">{message}</p>}
          {ticketsEtape(etape).length > 0 && (
            <section aria-label="Remarques de cette page" className="grid gap-1 text-sm">
              <h2 className="font-semibold">Déjà noté sur cette page</h2>
              {ticketsEtape(etape).map((t) => <p key={t.numero} className="rounded-lg bg-white px-3 py-2 ring-1 ring-black/5" data-ticket={t.numero}>#{t.numero} · {t.origine === 'testeur' ? 'agent' : 'humain'} · {t.commentaire || t.etiquette} · <em>{t.statut === 'corrige' ? 'corrigé, à revoir' : 'à corriger'}</em></p>)}
            </section>
          )}
        </>
      ) : (
        <Recapitulatif
          mode={mode} etapes={etapes} etat={etatEtape} aller={aller} enCours={enCours} message={message}
          tickets={ticketsVersion} corriges={corriges} rouvrir={rouvrir} test={p.test}
          onEnvoyer={() => agir(() => envoyerCorrections(p.fiche.id))}
          onRevalider={() => agir(() => revalider(p.fiche.id, rouvrir), () => setRouvrir([]))}
          onContinuer={() => router.refresh()}
        />
      )}
    </div>
  );
}

function CopierPhrase() {
  const [copie, setCopie] = useState(false);
  return (
    <div className="grid gap-2 rounded-xl bg-neutral-900 p-3 text-white" data-phrase-claude="">
      <p className="text-xs uppercase tracking-wide text-neutral-300">À coller dans Claude Code</p>
      <p className="font-mono text-sm">{PHRASE_CLAUDE}</p>
      <button type="button" onClick={() => { void navigator.clipboard?.writeText(PHRASE_CLAUDE).then(() => setCopie(true), () => null); }} className={`min-h-11 justify-self-start rounded-lg bg-white px-3 text-sm font-semibold text-neutral-900 ${focus}`}>{copie ? 'Copié ✓' : 'Copier la demande'}</button>
    </div>
  );
}

function Recapitulatif(r: {
  mode: string; etapes: Etape[]; etat: (e: Etape) => 'a-voir' | 'ok' | 'remarque'; aller: (n: number) => void; enCours: boolean; message: string;
  tickets: TicketModele[]; corriges: TicketModele[]; rouvrir: number[]; test: Props['test']; onEnvoyer: () => void; onRevalider: () => void; onContinuer: () => void;
}) {
  const [envoye, setEnvoye] = useState(false);
  const restantes = r.etapes.map((e, k) => ({ e, k })).filter((x) => r.etat(x.e) === 'a-voir');
  const remarques = r.etapes.filter((e) => r.etat(e) === 'remarque').length;
  return (
    <section className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4" data-ecran="recapitulatif">
      <h2 className="text-xl font-bold">Récapitulatif</h2>
      <ul className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-4">
        {r.etapes.map((e, k) => {
          const x = r.etat(e);
          return <li key={k}><button type="button" onClick={() => r.aller(k)} className={`flex min-h-11 w-full items-center gap-1.5 rounded-lg px-2 text-left ring-1 ${focus} ${x === 'ok' ? 'bg-teal-50 ring-teal-200' : x === 'remarque' ? 'bg-orange-50 ring-orange-200' : 'bg-neutral-50 ring-neutral-200'}`}><span aria-hidden="true">{x === 'ok' ? '✓' : x === 'remarque' ? '✎' : '·'}</span><span className="min-w-0 truncate">{libellePageModele(e.page)} · {e.appareil === 'mobile' ? 'tél.' : 'ordi.'}</span></button></li>;
        })}
      </ul>
      {restantes.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm">Il reste {restantes.length} page{restantes.length > 1 ? 's' : ''} à voir.</p>
          <button type="button" onClick={() => r.aller(restantes[0].k)} className={`min-h-12 justify-self-start rounded-xl bg-teal-800 px-5 font-semibold text-white ${focus}`} data-action="reprendre">Reprendre à la page {restantes[0].k + 1}</button>
        </div>
      ) : r.mode === 'revalidation' ? (
        <div className="grid gap-2">
          <p className="text-sm">{r.corriges.length} correction{r.corriges.length > 1 ? 's' : ''} revue{r.corriges.length > 1 ? 's' : ''}{r.rouvrir.length ? `, ${r.rouvrir.length} à reprendre` : ''}{remarques ? `, ${remarques} page${remarques > 1 ? 's' : ''} avec une nouvelle remarque` : ''}.</p>
          <button type="button" disabled={r.enCours} onClick={r.onRevalider} className={`min-h-12 justify-self-start rounded-xl bg-teal-800 px-5 font-semibold text-white ${focus}`} data-action="revalider">{r.rouvrir.length ? `Revalider le reste et rouvrir ${r.rouvrir.length} correction(s)` : 'Tout revalider'}</button>
        </div>
      ) : r.tickets.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-sm">{r.tickets.length} remarque{r.tickets.length > 1 ? 's' : ''} à corriger :</p>
          <ul className="grid gap-1 text-sm">{r.tickets.slice(0, 12).map((t) => <li key={t.numero} className="rounded-lg bg-orange-50 px-3 py-2">#{t.numero} · {libellePageModele(t.page)} ({libelleAppareil(t.appareil)}) · {t.commentaire || t.etiquette}</li>)}</ul>
          {!envoye
            ? <button type="button" disabled={r.enCours} onClick={() => { setEnvoye(true); r.onEnvoyer(); }} className={`min-h-12 justify-self-start rounded-xl bg-orange-700 px-5 font-semibold text-white ${focus}`} data-action="envoyer-claude">Envoyer les corrections à Claude</button>
            : <><p className="text-sm font-semibold">Dernier geste : demandez la correction à Claude. La nouvelle version revient seule ; vous ne reverrez que les pages modifiées.</p><CopierPhrase /></>}
        </div>
      ) : (
        <div className="grid gap-2">
          <p className="text-sm">Toutes les pages sont OK. {r.test?.verdict === 'vert' ? 'Le test automatique est au vert : le modèle passe en « Prêt pour validation ».' : 'Dès que le test automatique est au vert, le modèle passe en « Prêt pour validation ».'}</p>
          <button type="button" onClick={r.onContinuer} className={`min-h-12 justify-self-start rounded-xl bg-teal-800 px-5 font-semibold text-white ${focus}`} data-action="continuer">Continuer vers la publication</button>
        </div>
      )}
      {r.message && <p role="status" className="text-sm text-neutral-700">{r.message}</p>}
    </section>
  );
}

function Attente({ statut, tickets, validateur }: { statut: StatutModele; tickets: TicketModele[]; validateur: boolean }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4" data-ecran="attente">
      <h2 className="text-xl font-bold">{statut === 'retouche' ? `Claude corrige ${tickets.length} remarque${tickets.length > 1 ? 's' : ''}` : 'Le testeur repasse sur la nouvelle version'}</h2>
      <p className="text-sm text-neutral-700">{statut === 'retouche'
        ? `${validateur ? 'Dans Claude Code, collez la demande ci-dessous.' : 'Paul (ou quiconque a Claude Code) colle la demande ci-dessous.'} La nouvelle version arrive seule ; la relecture ne vous reproposera que les pages modifiées.`
        : 'Rien à faire : dès que le test est passé, les pages modifiées vous sont proposées à revalider.'}</p>
      {statut === 'retouche' && <CopierPhrase />}
      {tickets.length > 0 && <ul className="grid gap-1 text-sm">{tickets.slice(0, 12).map((t) => <li key={t.numero} className="rounded-lg bg-white px-3 py-2 ring-1 ring-black/5">#{t.numero} · {libellePageModele(t.page)} ({libelleAppareil(t.appareil)}) · {t.commentaire || t.etiquette}</li>)}</ul>}
    </section>
  );
}

function Publication(p: Props & { publication: NonNullable<Props['publication']>; onSignaler: () => void }) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [message, setMessage] = useState('');
  const [coches, setCoches] = useState<string[]>(p.publication.profils.filter((x) => x.coche).map((x) => x.id));
  const [confirmer, setConfirmer] = useState(false);
  // Les tags sont vérifiés par ce geste même : seuls les autres verrous doivent être au vert
  const bloquants = p.publication.verrous.filter((v) => !v.ok && v.id !== 'tags');
  return (
    <section className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4" data-ecran="publication">
      <h2 className="text-xl font-bold">Publier ce modèle pour les praticiens</h2>
      <p className="text-sm text-neutral-700">« {p.fiche.nom} » v{p.fiche.version} : relecture terminée{p.test ? `, test automatique ${p.test.verdict === 'vert' ? 'au vert' : p.test.verdict}` : ''}.</p>
      <ul className="grid gap-1 text-sm">
        {p.publication.verrous.filter((v) => v.id !== 'tags').map((v) => <li key={v.id} className="flex items-start gap-2" data-verrou={v.id} data-ok={v.ok ? 'oui' : 'non'}><span aria-hidden="true">{v.ok ? '🟢' : '🔴'}</span><span><span className="font-medium">{v.libelle}</span> <span className="text-neutral-600">· {v.detail}</span></span></li>)}
      </ul>
      <fieldset className="grid gap-1">
        <legend className="text-sm font-semibold">Profils où le proposer (pré-cochés : profils compatibles)</legend>
        {p.publication.profils.map((x) => (
          <label key={x.id} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-5" disabled={!p.validateur} checked={coches.includes(x.id)} onChange={(e) => setCoches((l) => (e.target.checked ? [...l, x.id] : l.filter((y) => y !== x.id)))} /> {x.nom}</label>
        ))}
      </fieldset>
      {!p.validateur ? <p className="text-sm text-neutral-700">Paul publie ce modèle : rien à faire de votre côté.</p> : bloquants.length ? (
        <p className="text-sm text-red-800">Pas encore publiable : {bloquants.map((v) => v.libelle).join(', ')}. <a href={`/chaine/modele/${p.fiche.id}`} className="font-semibold underline">Fiche du modèle</a></p>
      ) : !confirmer ? (
        <button type="button" disabled={!coches.length} onClick={() => setConfirmer(true)} className={`min-h-12 justify-self-start rounded-xl bg-amber-700 px-5 font-semibold text-white disabled:opacity-50 ${focus}`} data-action="publier">Publier ce modèle pour les praticiens</button>
      ) : (
        <div className="grid gap-2 rounded-xl bg-white p-3 ring-1 ring-amber-300" data-confirmation="">
          <p className="text-sm font-semibold">Publier « {p.fiche.nom} » v{p.fiche.version} pour {coches.length} profil{coches.length > 1 ? 's' : ''} ? Il apparaîtra dans les choix des praticiens.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={enCours} onClick={() => demarrer(async () => { const r = await publierDepuisParcours(p.fiche.id, coches); setMessage(r.message); if (r.ok) router.refresh(); })} className={`min-h-12 rounded-xl bg-amber-700 px-5 font-semibold text-white ${focus}`} data-action="confirmer-publication">Confirmer la publication</button>
            <button type="button" onClick={() => setConfirmer(false)} className={bouton}>Annuler</button>
          </div>
        </div>
      )}
      {message && <p role="status" className="text-sm">{message}</p>}
      <button type="button" onClick={p.onSignaler} className="min-h-11 justify-self-start text-sm text-teal-900 underline">Revoir les pages avant de publier</button>
    </section>
  );
}
