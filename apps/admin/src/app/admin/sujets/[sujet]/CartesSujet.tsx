'use client';

// Une carte à la fois (point d'entrée « À valider », packages/core/src/sujets-validation.ts, docs/a-valider.md). Mobile d'abord :
// gestes en bas de l'écran ; glisser à droite = OK, à gauche = Pas OK (vers le haut à la souris = J'adore) ; clavier → / ← / ↑ / ↓,
// O / N / L / P, C commentaire, Z annuler, S « voir seul ».
// ENCHAÎNEMENT INSTANTANÉ : la carte suivante est déjà montée (invisible) sous la carte courante, ses images décodées, et les aperçus
// des 8 suivantes sont chargés pendant que Paul décide. La décision part au serveur 5 s plus tard (ou à la décision suivante) :
// « Annuler » dans ce délai n'écrit rien ; ensuite, l'annulation rejoue l'état précédent de l'arrivage (une note reste au journal,
// la redécision la remplace). Décision en attente gardée dans ce navigateur (rejouée à la prochaine ouverture si la page se ferme).
// LUDIQUE, SOBRE : objectif du jour, série, combo, progression du sujet, pari du juge révélé APRÈS la décision, sujet complet,
// récompense « Créer des modèles <sujet> ». Retour haptique (si l'appareil le permet) ; sons désactivés par défaut.
import '@plateforme/core/dessins.css';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as PE } from 'react';
import { etiquettesDuType, gamme as gammeParId, SURFACES_CSS, typeDeCle, variablesCharte, variablesGamme, type EtatPolitique } from '@plateforme/core';
import {
  comboDecisions, fileCartes, gesteSujetClavier, gesteSujetGlisse, lienCreerModeles, lienSujet, textePari, verdictPari, type GesteSujet,
} from '@plateforme/core/sujets-validation';
import { useExpositions } from '@/components/useExpositions';
import type { CarteSujet } from '@/lib/sujets-validation';
import type { VisuelArrivage } from '../../arrivages/Arrivages';
import { annulerDecisionSujet, deciderCarte, validerPourLesSites, visuelsCartes, type AnnulationSujet, type RefCarte } from '../actions';
import BandeauJour from '../BandeauJour';
import Scene, { CSS_SCENE, type DonneesScene, type DonneesStudio } from './Scene';

type Props = {
  sujet: { id: string; libelle: string; profil: string | null; okServeur: number; total: number; aVoir: number };
  cartes: CarteSujet[];
  visuelsInitiaux: Record<string, VisuelArrivage>;
  politique: EtatPolitique;
  jours: Record<string, number>;
  aujourdhui: string;
  scene: DonneesScene;
  studio: DonneesStudio | null;
  suivants: { id: string; libelle: string; nouveautes: number; aVoir: number }[];
  seuilModeles: number;
};

type Decision = {
  n: number; carte: CarteSujet; geste: GesteSujet; commentaire: string; etiquettes: string[]; jamais: boolean; le: number;
  etat: 'attente' | 'envoyee'; annulation?: AnnulationSujet;
};
type Reglages = { vibrer: boolean; son: boolean };

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const DELAI_ENVOI_MS = 5000;
const CLE_ATTENTE = 'a-valider-attente';
const CLE_REGLAGES = 'a-valider-reglages';
const VISUELS_FAMILLES = new Set(['illustration', 'icone', 'animation']);
const LIBELLES_FAMILLES: Record<string, string> = { illustration: 'Illustration', icone: 'Icône', animation: 'Animation', photo: 'Photo', palette: 'Palette', police: 'Police', 'mise-en-page': 'Mise en page', element: 'Élément', contenu: 'Texte', serie: 'Série de photos' };
const PARTICIPES: Record<GesteSujet, string> = { ok: 'OK', adore: 'J’adore', 'pas-ok': 'Pas OK', 'plus-tard': 'Plus tard' };

const refDe = (c: CarteSujet): RefCarte => ({ id: c.id, kind: c.kind, cle: c.cle, precedent: c.precedent ?? null, empreinte: c.empreinte, photoId: c.photoId, photosSerie: c.photosSerie?.map((p) => p.cle) });
const besoinVisuel = (c: CarteSujet) => (c.kind === 'nouveaute' || c.kind === 'element' || c.kind === 'contenu') && c.famille !== 'photo';
const visuelDirect = (c: CarteSujet): VisuelArrivage | null => (c.kind === 'photo' || c.famille === 'photo' ? (c.url ? { kind: 'image', src: c.url } : { kind: 'aucun' }) : null);

function lireReglages(): Reglages {
  try { return { vibrer: true, son: false, ...(JSON.parse(localStorage.getItem(CLE_REGLAGES) ?? '{}') as Partial<Reglages>) }; } catch { return { vibrer: true, son: false }; }
}

/** Petit son (désactivé par défaut) */
function jouerSon(geste: GesteSujet) {
  try {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const C = W.AudioContext ?? W.webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = geste === 'pas-ok' ? 300 : geste === 'adore' ? 880 : 620;
    g.gain.setValueAtTime(0.05, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.13);
    setTimeout(() => void ctx.close(), 300);
  } catch { /* pas de son */ }
}

export default function CartesSujet(props: Props) {
  // Données de la page FIGÉES à l'ouverture : une décision enregistrée rafraîchit la page (revalidatePath des actions), et les
  // nouvelles données compteraient deux fois les décisions de la séance (progression, objectif du jour) ; la séance fait foi
  const [{ sujet, cartes, visuelsInitiaux, politique, jours, aujourdhui, scene, studio, suivants, seuilModeles }] = useState(() => props);
  const { ctx, montrer } = useExpositions('tuiles', politique);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [visuels, setVisuels] = useState<Record<string, VisuelArrivage>>(visuelsInitiaux);
  const [retour, setRetour] = useState<string | null>(null);
  const [commentaireOuvert, setCommentaireOuvert] = useState(false);
  const [commentaire, setCommentaire] = useState('');
  const [etiquettes, setEtiquettes] = useState<string[]>([]);
  const [jamais, setJamais] = useState(false);
  const [seul, setSeul] = useState(false);
  const [retourInfo, setRetourInfo] = useState<{ texte: string; pari: string | null; ok: boolean; geste: GesteSujet | null } | null>(null);
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [reglages, setReglages] = useState<Reglages>({ vibrer: true, son: false });
  const [mobile, setMobile] = useState(false);
  const [celebrer, setCelebrer] = useState(false);
  const [validation, setValidation] = useState<'idle' | 'confirmer' | 'envoi' | 'fait'>('idle');
  const [messageValidation, setMessageValidation] = useState<string | null>(null);
  const compteur = useRef(0);
  const attente = useRef<{ d: Decision; t: ReturnType<typeof setTimeout> } | null>(null);
  const enVol = useRef(new Set<string>());
  const depart = useRef<{ x: number; y: number; id: number } | null>(null);
  // Appui long (≈ 0,5 s sans bouger) sur la carte : ouvre le commentaire (mobile seul, 2026-10-10)
  const appui = useRef<number | null>(null);
  const finAppui = () => { if (appui.current) { window.clearTimeout(appui.current); appui.current = null; } };
  const zoneCarte = useRef<HTMLDivElement>(null);

  useEffect(() => { setReglages(lireReglages()); setMobile(window.matchMedia('(max-width: 640px)').matches); }, []);
  // Téléphone (2026-10-10, « mobile seul ») : la carte arrive en haut de l'écran (l'en-tête, la progression et l'objectif du jour
  // la poussaient sous la barre des gestes : on décidait sans la voir) ; on remonte pour les revoir
  useEffect(() => {
    if (!window.matchMedia('(max-width: 640px)').matches) return;
    const t = window.setTimeout(() => { const el = zoneCarte.current; if (el && window.scrollY < 40) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 8), behavior: 'smooth' }); }, 250);
    return () => window.clearTimeout(t);
  }, []);
  const changerReglages = (r: Partial<Reglages>) => setReglages((x) => { const n = { ...x, ...r }; try { localStorage.setItem(CLE_REGLAGES, JSON.stringify(n)); } catch { /* ignoré */ } return n; });

  // File des cartes (politique d'évaluation, sans répétition) ; une carte annulée revient en tête
  const decidees = useMemo(() => new Set(decisions.map((d) => d.carte.cle)), [decisions]);
  const file = useMemo(() => {
    const f = fileCartes(cartes, { ctx, decidees });
    const i = retour ? f.findIndex((c) => c.id === retour) : -1;
    return i > 0 ? [f[i], ...f.slice(0, i), ...f.slice(i + 1)] : f;
  }, [cartes, ctx, decidees, retour]);
  const courante = file[0] ?? null;
  const suivante = file[1] ?? null;
  const visuelDe = useCallback((c: CarteSujet | null): VisuelArrivage | null => (c ? visuelDirect(c) ?? visuels[c.cle] ?? null : null), [visuels]);

  // Préchargement : aperçus des 8 prochaines cartes, images des 3 prochaines
  useEffect(() => {
    const manquants = file.slice(0, 8).filter((c) => besoinVisuel(c) && !visuels[c.cle] && !enVol.current.has(c.cle)).map((c) => c.cle);
    if (manquants.length) {
      manquants.forEach((k) => enVol.current.add(k));
      visuelsCartes(manquants).then((r) => setVisuels((v) => ({ ...v, ...r })), () => manquants.forEach((k) => enVol.current.delete(k)));
    }
    for (const c of file.slice(1, 4)) {
      const srcs = [visuelDirect(c)?.kind === 'image' ? (visuelDirect(c) as { src: string }).src : null, ...(c.photosSerie ?? []).slice(0, 3).map((p) => p.apercu)].filter(Boolean) as string[];
      for (const s of srcs) { const im = new Image(); im.decoding = 'async'; im.src = s; }
    }
  }, [file, visuels]);

  // Envoi d'une décision (différé : « Annuler » sans rien écrire pendant DELAI_ENVOI_MS)
  const envoyer = useCallback(async (d: Decision) => {
    try { localStorage.removeItem(CLE_ATTENTE); } catch { /* ignoré */ }
    if (d.geste === 'plus-tard') { setDecisions((l) => l.map((x) => (x.n === d.n ? { ...x, etat: 'envoyee' } : x))); return; }
    const r = await deciderCarte(refDe(d.carte), d.geste, { commentaire: d.commentaire, etiquettes: d.etiquettes, jamais: d.jamais, sujet: sujet.id }).catch(() => ({ ok: false, message: 'Connexion perdue : la carte revient, réessaie.' } as Awaited<ReturnType<typeof deciderCarte>>));
    if (!r.ok) {
      // Échec : la carte revient en tête, message clair
      setDecisions((l) => l.filter((x) => x.n !== d.n));
      setRetour(d.carte.id);
      setRetourInfo({ texte: r.message, pari: null, ok: false, geste: null });
      return;
    }
    setDecisions((l) => l.map((x) => (x.n === d.n ? { ...x, etat: 'envoyee', annulation: r.annulation } : x)));
    if (r.message && r.note === 1) setRetourInfo((x) => ({ texte: r.message, pari: x?.pari ?? null, ok: true, geste: d.geste }));
  }, [sujet.id]);

  const vider = useCallback(() => {
    const a = attente.current;
    if (!a) return;
    clearTimeout(a.t);
    attente.current = null;
    void envoyer(a.d);
  }, [envoyer]);

  // Décision restée en attente (page fermée dans les 5 s) : rejouée à l'ouverture ; envoi avant de quitter la page
  useEffect(() => {
    try {
      const x = JSON.parse(localStorage.getItem(CLE_ATTENTE) ?? 'null') as { ref: RefCarte; geste: GesteSujet; commentaire: string; etiquettes: string[]; jamais: boolean; sujet: string; le: number } | null;
      if (x && Date.now() - x.le < 86400000) void deciderCarte(x.ref, x.geste, { commentaire: x.commentaire, etiquettes: x.etiquettes, jamais: x.jamais, sujet: x.sujet }).finally(() => { try { localStorage.removeItem(CLE_ATTENTE); } catch { /* ignoré */ } });
    } catch { /* ignoré */ }
    const quitter = () => vider();
    window.addEventListener('pagehide', quitter);
    return () => { window.removeEventListener('pagehide', quitter); vider(); };
  }, [vider]);

  const decider = useCallback((geste: GesteSujet) => {
    const c = courante;
    if (!c) return;
    // Pas OK sur un texte : le commentaire est indispensable (il part à Claude pour retravailler)
    if (geste === 'pas-ok' && c.kind === 'contenu' && !commentaire.trim()) {
      setCommentaireOuvert(true);
      setRetourInfo({ texte: 'Dis en quelques mots ce qui ne va pas dans ce texte (le commentaire part à Claude).', pari: null, ok: false, geste: null });
      return;
    }
    vider();
    const d: Decision = { n: ++compteur.current, carte: c, geste, commentaire: commentaire.trim(), etiquettes, jamais: geste === 'pas-ok' && jamais, le: Date.now(), etat: 'attente' };
    setDecisions((l) => [...l, d]);
    setRetour(null);
    attente.current = { d, t: setTimeout(() => { attente.current = null; void envoyer(d); }, DELAI_ENVOI_MS) };
    try { localStorage.setItem(CLE_ATTENTE, JSON.stringify({ ref: refDe(c), geste, commentaire: d.commentaire, etiquettes, jamais: d.jamais, sujet: sujet.id, le: d.le })); } catch { /* ignoré */ }
    // Mémoire commune des expositions : « Plus tard » journalisé (délai de retour), les notes le sont déjà par leur table
    montrer([{ cle: c.cle, resultat: geste === 'plus-tard' ? 'ignore' : c.nouveaute ? (geste === 'pas-ok' ? 'refuse' : 'accepte') : 'note', note: geste === 'ok' ? 4 : geste === 'adore' ? 5 : geste === 'pas-ok' ? 2 : null }], { journaliser: geste === 'plus-tard' || c.nouveaute, surface: c.nouveaute ? 'arrivages' : 'tuiles' });
    // Pari du juge révélé après la décision
    const v = verdictPari(c.prediction, geste);
    setRetourInfo({ texte: PARTICIPES[geste], pari: v && c.prediction !== null ? textePari(c.prediction, v) : null, ok: true, geste });
    if (reglages.vibrer && geste !== 'plus-tard') { try { navigator.vibrate?.(geste === 'pas-ok' ? [8, 40, 8] : geste === 'adore' ? [10, 30, 18] : 12); } catch { /* ignoré */ } }
    if (reglages.son && geste !== 'plus-tard') jouerSon(geste);
    setCommentaire(''); setEtiquettes([]); setJamais(false); setCommentaireOuvert(false); setDrag(null);
  }, [courante, commentaire, etiquettes, jamais, vider, envoyer, montrer, sujet.id, reglages]);

  const annuler = useCallback(async () => {
    const a = attente.current;
    if (a) {
      clearTimeout(a.t);
      attente.current = null;
      try { localStorage.removeItem(CLE_ATTENTE); } catch { /* ignoré */ }
      setDecisions((l) => l.filter((x) => x.n !== a.d.n));
      setRetour(a.d.carte.id);
      setRetourInfo({ texte: 'Annulé : rien n’a été enregistré.', pari: null, ok: true, geste: null });
      return;
    }
    const d = [...decisions].reverse().find((x) => x.etat === 'envoyee');
    if (!d) return;
    const r = d.annulation ? await annulerDecisionSujet(d.annulation) : { ok: true, message: 'Annulé.' };
    if (!r.ok) { setRetourInfo({ texte: r.message, pari: null, ok: false, geste: null }); return; }
    setDecisions((l) => l.filter((x) => x.n !== d.n));
    setRetour(d.carte.id);
    setRetourInfo({ texte: r.message || 'Annulé.', pari: null, ok: true, geste: null });
  }, [decisions]);

  // Clavier
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable)) { if (e.key === 'Escape') { setCommentaireOuvert(false); t.blur(); } return; }
      if (e.metaKey || e.altKey) return;
      if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) { e.preventDefault(); void annuler(); return; }
      if (e.ctrlKey) return;
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); setCommentaireOuvert((x) => !x); return; }
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); setSeul((x) => !x); return; }
      const g = gesteSujetClavier(e.key);
      if (g) { e.preventDefault(); decider(g); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [decider, annuler]);

  // Glisser
  const surDebut = (e: PE<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button,a,input,textarea,select,summary,label')) return;
    depart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    finAppui();
    if (e.pointerType !== 'mouse') appui.current = window.setTimeout(() => {
      appui.current = null;
      depart.current = null;
      setDrag(null);
      setCommentaireOuvert(true);
      try { navigator.vibrate?.(10); } catch { /* ignoré */ }
    }, 520);
  };
  const surMouvement = (e: PE<HTMLDivElement>) => {
    const d = depart.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) finAppui();
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) setDrag({ dx, dy: e.pointerType === 'mouse' ? dy : 0 });
  };
  const surFin = (e: PE<HTMLDivElement>) => {
    finAppui();
    const d = depart.current;
    depart.current = null;
    if (!d || d.id !== e.pointerId) return;
    const g = gesteSujetGlisse(e.clientX - d.x, e.pointerType === 'mouse' ? e.clientY - d.y : 0);
    if (g) decider(g); else setDrag(null);
  };

  // Progression, combo, récompenses
  const faites = decisions.filter((d) => d.geste !== 'plus-tard');
  const okSeance = faites.filter((d) => d.geste !== 'pas-ok');
  const okTotal = sujet.okServeur + okSeance.filter((d) => !(d.carte.note !== null && d.carte.note >= 4)).length;
  const vus = Math.min(sujet.total, sujet.total - sujet.aVoir + faites.length);
  const part = sujet.total ? vus / sujet.total : 0;
  const combo = comboDecisions(faites.map((d) => d.le));
  const plusTard = decisions.filter((d) => d.geste === 'plus-tard');
  const complet = !courante;
  const modeles = Boolean(sujet.profil) && okTotal >= seuilModeles;
  const deja = useRef(complet);
  useEffect(() => {
    if (complet && !deja.current && faites.length > 0) {
      setCelebrer(true);
      if (reglages.vibrer) { try { navigator.vibrate?.([12, 60, 12, 60, 24]); } catch { /* ignoré */ } }
    }
    deja.current = complet;
  }, [complet, faites.length, reglages.vibrer]);

  // « Valider pour les sites » : éléments du code trouvés OK (dans la séance, ou déjà ≥ 4 ★) et pas encore « Validés »
  const aValider = useMemo(() => {
    const pasOk = new Set(faites.filter((d) => d.geste === 'pas-ok').map((d) => d.carte.cle));
    const l = new Map<string, CarteSujet>();
    for (const d of okSeance) if ((d.carte.kind === 'element' && d.carte.aValider) || (d.carte.kind === 'nouveaute' && VISUELS_FAMILLES.has(d.carte.famille))) l.set(d.carte.cle, d.carte);
    for (const c of cartes) if (c.kind === 'element' && c.aValider && (c.note ?? 0) >= 4 && !pasOk.has(c.cle)) l.set(c.cle, c);
    return [...l.values()];
  }, [okSeance, faites, cartes]);
  const valider = async () => {
    if (validation === 'idle') { setValidation('confirmer'); return; }
    if (validation !== 'confirmer') return;
    vider();
    setValidation('envoi');
    const r = await validerPourLesSites(aValider.map((c) => c.cle)).catch(() => ({ ok: false, message: 'Connexion perdue : réessaie.' }));
    setMessageValidation(r.message);
    setValidation(r.ok ? 'fait' : 'idle');
  };

  const style = useMemo(() => ({ ...variablesCharte(), ...variablesGamme(gammeParId('canard')!) }) as CSSProperties, []);
  const etiquettesCarte = courante && courante.kind !== 'serie' && courante.kind !== 'contenu' ? (() => { const t = typeDeCle(courante.cle); return t ? etiquettesDuType(t) : []; })() : [];
  const transformation = drag ? `translate3d(${drag.dx}px, ${drag.dy}px, 0) rotate(${Math.max(-8, Math.min(8, drag.dx / 30))}deg)` : undefined;
  const indice = drag ? gesteSujetGlisse(drag.dx, drag.dy, 50) : null;

  const entete = (c: CarteSujet) => (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="font-semibold text-neutral-900">{c.titre}</span>
      {c.nouveaute ? <span className="rounded-full bg-amber-300 px-2 text-xs font-bold text-amber-950">Nouveau</span> : c.aValider ? <span className="rounded-full bg-amber-50 px-2 text-xs text-amber-900 ring-1 ring-amber-200">Dans le kit · à valider</span> : <span className="rounded-full bg-teal-50 px-2 text-xs text-teal-900 ring-1 ring-teal-200">Dans le kit</span>}
      <span className="text-xs text-neutral-500">{LIBELLES_FAMILLES[c.famille] ?? c.famille}{c.detail ? ` · ${c.detail}` : ''}</span>
    </div>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 pb-40 sm:pb-6" style={style}>
      <style>{SURFACES_CSS + CSS_SCENE + '@keyframes sv-pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}@keyframes sv-pulse{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}@media (prefers-reduced-motion:reduce){.sv-anim{animation:none!important}}'}</style>

      {/* Progression du sujet, objectif du jour, combo */}
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="grid gap-1 rounded-2xl border border-black/5 bg-white px-3 py-2">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold text-neutral-900">{sujet.libelle}</span>
            <span className="tabular-nums text-neutral-600"><span className="font-semibold text-neutral-900">{vus}</span> / {sujet.total} vus · <span className="font-semibold text-teal-800">{okTotal}</span> OK</span>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-neutral-200" role="meter" aria-valuemin={0} aria-valuemax={sujet.total} aria-valuenow={vus} aria-label={`${sujet.libelle} : progression`}>
            <div className="absolute inset-y-0 left-0 rounded-full bg-teal-700 transition-[width] duration-300" style={{ width: `${Math.round(part * 100)}%` }} />
          </div>
          {sujet.profil && !modeles && <p className="text-xs text-neutral-600">Encore <span className="font-semibold tabular-nums">{seuilModeles - okTotal}</span> OK pour créer des modèles {sujet.libelle}.</p>}
          {modeles && <p className="text-xs font-semibold text-teal-800">Assez d’éléments OK : les modèles {sujet.libelle} peuvent être créés.</p>}
        </div>
        <BandeauJour jours={jours} aujourdhui={aujourdhui} enPlus={faites.length} compact />
      </div>

      {combo >= 3 && <p key={combo} className="sv-anim justify-self-start rounded-full bg-teal-800 px-3 py-1 text-sm font-semibold text-white" style={{ animation: 'sv-pulse .35s ease-out' }} aria-live="polite">Combo × {combo}</p>}

      {courante ? (
        <div className="relative" ref={zoneCarte}>
          {/* Carte suivante déjà montée (images décodées) : l'enchaînement est instantané */}
          {suivante && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 opacity-0">
              {entete(suivante)}
              <Scene visuel={visuelDe(suivante)} scene={scene} studio={studio} seul={seul} titre={suivante.titre} photosSerie={suivante.photosSerie} mobile={mobile} />
            </div>
          )}
          <article key={courante.id} aria-label={`Carte : ${courante.titre}`} onPointerDown={surDebut} onPointerMove={surMouvement} onPointerUp={surFin} onPointerCancel={() => { finAppui(); depart.current = null; setDrag(null); }} onContextMenu={(e) => { if (!(e.target as HTMLElement).closest('a,img')) e.preventDefault(); }}
            className="relative grid touch-pan-y select-none gap-2 rounded-3xl border border-black/5 bg-white p-3 shadow-sm sm:p-4"
            style={{ transform: transformation, transition: drag ? 'none' : 'transform .18s ease-out' }}>
            {indice && (
              <span className={`pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 rounded-full px-4 py-1.5 text-lg font-bold text-white shadow ${indice === 'pas-ok' ? 'bg-red-600' : indice === 'adore' ? 'bg-rose-500' : 'bg-teal-700'}`}>
                {indice === 'pas-ok' ? '✗ Pas OK' : indice === 'adore' ? '❤ J’adore' : '✓ OK'}
              </span>
            )}
            <div className="flex flex-wrap items-start justify-between gap-2">
              {entete(courante)}
              <button type="button" onClick={() => setSeul((x) => !x)} className={`min-h-11 shrink-0 rounded-full px-3 text-xs font-semibold text-neutral-700 ring-1 ring-black/10 hover:bg-neutral-50 ${focus}`} aria-pressed={seul} title="Touche S">
                {seul ? 'En situation' : 'Voir seul'}
              </button>
            </div>
            <Scene visuel={visuelDe(courante)} scene={scene} studio={studio} seul={seul} titre={courante.titre} photosSerie={courante.photosSerie} mobile={mobile} />
          </article>
        </div>
      ) : (
        <FinDeSujet
          sujet={sujet} celebrer={celebrer} faites={faites.length} okSeance={okSeance.length} adore={faites.filter((d) => d.geste === 'adore').length} pasOk={faites.filter((d) => d.geste === 'pas-ok').length}
          plusTard={plusTard.length} revoir={() => setDecisions((l) => l.filter((d) => d.geste !== 'plus-tard'))}
          modeles={modeles} okTotal={okTotal} seuil={seuilModeles} aValider={aValider.length} validation={validation} messageValidation={messageValidation} valider={valider}
          suivants={suivants}
        />
      )}

      {/* Retour de la dernière décision (et pari du juge) */}
      <div aria-live="polite" className="min-h-6 text-sm">
        {retourInfo && (
          <p className={retourInfo.ok ? 'text-neutral-700' : 'rounded-lg bg-amber-50 px-3 py-2 text-amber-950 ring-1 ring-amber-200'}>
            {retourInfo.geste && <span className={`mr-2 font-semibold ${retourInfo.geste === 'pas-ok' ? 'text-red-700' : retourInfo.geste === 'adore' ? 'text-rose-600' : 'text-teal-800'}`}>{retourInfo.texte}</span>}
            {!retourInfo.geste && retourInfo.texte}
            {retourInfo.pari && <span className="text-neutral-600">{retourInfo.pari}</span>}
          </p>
        )}
      </div>

      {/* Gestes : en bas de l'écran sur téléphone */}
      {courante && (
        <div className="fixed inset-x-0 bottom-0 z-40 grid gap-2 border-t border-black/10 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 shadow-[0_-4px_16px_rgba(0,0,0,.06)] backdrop-blur sm:static sm:rounded-2xl sm:border sm:border-black/5 sm:px-4 sm:py-3 sm:shadow-none">
          {commentaireOuvert && (
            <div className="grid gap-2">
              <label className="grid gap-1 text-sm">
                <span className="text-neutral-700">Commentaire (facultatif{courante.kind === 'contenu' ? ', indispensable pour « Pas OK » sur un texte' : ''}) : il part à Claude avec ta décision</span>
                <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)} rows={2} autoFocus maxLength={2000}
                  className={`w-full rounded-xl border border-neutral-300 px-3 py-2 text-base ${focus}`} placeholder="Ce qui va, ce qui ne va pas…" />
              </label>
              {etiquettesCarte.length > 0 && (
                <details className="text-sm">
                  <summary className="min-h-11 cursor-pointer content-center text-neutral-700">Étiquettes rapides{etiquettes.length ? ` (${etiquettes.length})` : ''}</summary>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {etiquettesCarte.map((e) => {
                      const on = etiquettes.includes(e.id);
                      return <button key={e.id} type="button" aria-pressed={on} onClick={() => setEtiquettes((l) => (on ? l.filter((x) => x !== e.id) : [...l, e.id]))}
                        className={`min-h-11 rounded-full px-3 text-xs ring-1 ${focus} ${on ? (e.positive ? 'bg-teal-700 text-white ring-teal-700' : 'bg-red-600 text-white ring-red-600') : e.positive ? 'text-teal-900 ring-teal-200' : 'text-red-800 ring-red-200'}`}>{e.libelle}</button>;
                    })}
                  </div>
                </details>
              )}
              {courante.kind !== 'contenu' && courante.kind !== 'serie' && (
                <label className="flex min-h-11 items-center gap-2 text-sm text-neutral-700">
                  <input type="checkbox" checked={jamais} onChange={(e) => setJamais(e.target.checked)} className="size-4" />
                  Avec « Pas OK » : ne plus jamais le montrer
                </label>
              )}
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => decider('pas-ok')} title="← ou N" className={`min-h-14 rounded-2xl bg-red-50 text-lg font-bold text-red-700 ring-1 ring-red-200 active:scale-95 ${focus}`}>✗ <span className="text-base">Pas OK</span></button>
            <button type="button" onClick={() => decider('adore')} title="↑ ou L" className={`min-h-14 rounded-2xl bg-rose-50 text-lg font-bold text-rose-600 ring-1 ring-rose-200 active:scale-95 ${focus}`}>❤ <span className="text-base">J’adore</span></button>
            <button type="button" onClick={() => decider('ok')} title="→ ou O" className={`min-h-14 rounded-2xl bg-teal-700 text-lg font-bold text-white active:scale-95 ${focus}`}>✓ <span className="text-base">OK</span></button>
          </div>
          <div className="flex items-center justify-between gap-2 text-sm">
            <button type="button" onClick={() => setCommentaireOuvert((x) => !x)} aria-expanded={commentaireOuvert} title="C" className={`min-h-11 rounded-full px-3 font-semibold text-neutral-700 ring-1 ring-black/10 ${focus} ${commentaire ? 'bg-amber-50' : ''}`}>💬 Commenter</button>
            <button type="button" onClick={() => decider('plus-tard')} title="↓ ou P" className={`min-h-11 rounded-full px-3 text-neutral-700 ring-1 ring-black/10 ${focus}`}>Plus tard</button>
            <button type="button" onClick={() => void annuler()} disabled={!decisions.length} title="Z" className={`min-h-11 rounded-full px-3 text-neutral-700 ring-1 ring-black/10 disabled:opacity-40 ${focus}`}>↶ Annuler</button>
          </div>
        </div>
      )}

      <details className="text-xs text-neutral-600">
        <summary className="min-h-11 cursor-pointer content-center">Réglages et raccourcis</summary>
        <div className="mt-1 grid gap-1.5">
          <p>→ / O : OK · ← / N : Pas OK · ↑ / L : J’adore · ↓ / P : Plus tard · C : commenter · Z : annuler · S : voir seul. Au doigt : glisser à droite (OK) ou à gauche (Pas OK), appui long pour commenter.</p>
          <p>OK = 4 ★, J’adore = 5 ★, Pas OK = 2 ★ (1 ★ seulement au second « Pas OK » sur le même élément, ou si tu coches « ne plus jamais le montrer »). Rien n’est « Validé » pour les sites sans ton bouton en fin de sujet.</p>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={reglages.vibrer} onChange={(e) => changerReglages({ vibrer: e.target.checked })} className="size-4" />Vibration à chaque décision (si l’appareil le permet)</label>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={reglages.son} onChange={(e) => changerReglages({ son: e.target.checked })} className="size-4" />Petit son à chaque décision</label>
        </div>
      </details>
    </div>
  );
}

function FinDeSujet(p: {
  sujet: Props['sujet']; celebrer: boolean; faites: number; okSeance: number; adore: number; pasOk: number; plusTard: number; revoir: () => void;
  modeles: boolean; okTotal: number; seuil: number; aValider: number; validation: 'idle' | 'confirmer' | 'envoi' | 'fait'; messageValidation: string | null; valider: () => void;
  suivants: Props['suivants'];
}) {
  return (
    <section aria-labelledby="fin-sujet" className="grid gap-4 rounded-3xl border border-teal-700/20 bg-white p-5 text-center sm:p-8">
      <div className={`sv-anim mx-auto grid size-16 place-items-center rounded-full bg-teal-700 text-3xl text-white ${p.celebrer ? '' : 'opacity-90'}`} style={p.celebrer ? { animation: 'sv-pop .5s ease-out' } : undefined} aria-hidden="true">✓</div>
      <div className="grid gap-1">
        <h2 id="fin-sujet" className="text-xl font-bold">{p.sujet.libelle} : sujet complet</h2>
        <p className="text-sm text-neutral-600">
          {p.faites ? <>{p.faites} décision{p.faites > 1 ? 's' : ''} : <span className="font-semibold text-teal-800">{p.okSeance} OK</span>{p.adore ? ` dont ${p.adore} J’adore` : ''} · <span className="font-semibold text-red-700">{p.pasOk} Pas OK</span>.</> : 'Rien à voir dans ce sujet pour l’instant.'}
          {p.plusTard > 0 && <> {p.plusTard} mise{p.plusTard > 1 ? 's' : ''} de côté. <button type="button" onClick={p.revoir} className="font-semibold text-teal-800 underline">Les revoir</button></>}
        </p>
      </div>
      {p.sujet.profil && (p.modeles
        ? <Link href={lienCreerModeles(p.sujet.profil)} className={`mx-auto flex min-h-14 items-center gap-2 rounded-2xl bg-teal-800 px-6 text-lg font-semibold text-white shadow-sm hover:bg-teal-900 ${focus}`}>Créer des modèles {p.sujet.libelle} →</Link>
        : <p className="text-sm text-neutral-600">Encore <span className="font-semibold">{p.seuil - p.okTotal}</span> élément{p.seuil - p.okTotal > 1 ? 's' : ''} OK pour créer des modèles {p.sujet.libelle} ({p.okTotal} / {p.seuil}).</p>)}
      {p.aValider > 0 && p.validation !== 'fait' && (
        <div className="grid justify-items-center gap-1">
          <button type="button" onClick={p.valider} disabled={p.validation === 'envoi'} className={`min-h-12 rounded-2xl px-5 font-semibold ring-1 ${focus} ${p.validation === 'confirmer' ? 'bg-amber-300 text-amber-950 ring-amber-400' : 'bg-white text-teal-900 ring-teal-700/40 hover:bg-teal-50'}`}>
            {p.validation === 'confirmer' ? `Confirmer : valider ${p.aValider} élément${p.aValider > 1 ? 's' : ''} pour les sites` : p.validation === 'envoi' ? 'Validation…' : `Valider pour les sites (${p.aValider})`}
          </button>
          <p className="text-xs text-neutral-500">Les éléments que tu as trouvés OK passent « Validé » : les sites des praticiens peuvent les utiliser. Rien n’est validé sans ce bouton.</p>
        </div>
      )}
      {p.messageValidation && <p className="text-sm font-semibold text-teal-800" aria-live="polite">{p.messageValidation}</p>}
      {p.suivants.length > 0 && (
        <div className="grid gap-2">
          <p className="text-sm text-neutral-600">Sujet suivant</p>
          <div className="flex flex-wrap justify-center gap-2">
            {p.suivants.map((s) => (
              <Link key={s.id} href={lienSujet(s.id)} className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${focus} ${s.nouveautes ? 'bg-amber-50 text-amber-950 ring-amber-300' : 'text-teal-900 ring-teal-700/30 hover:bg-teal-50'}`}>
                {s.libelle} · {s.nouveautes ? `${s.nouveautes} nouveau${s.nouveautes > 1 ? 'x' : ''}` : `${s.aVoir} à voir`} →
              </Link>
            ))}
          </div>
        </div>
      )}
      <Link href="/admin/sujets" className="text-sm text-neutral-600 underline">Tous les sujets</Link>
    </section>
  );
}
