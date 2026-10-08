'use client';

// Cadre des aperçus (retour de Paul du 2026-10-07 : « le rendu aperçu mobile est vraiment mauvais, les boutons flottants ne
// sont pas du tout bien placés »). Avant : la page était une <div> réduite par transform dans la page de l'admin ; la
// transformation faisait de cette <div> le repère des éléments en position fixe (barre d'actions, bouton flottant : posés en
// bas de la PAGE entière, ou décalés par l'échelle) et les media queries répondaient à la largeur de la fenêtre de l'admin.
// Maintenant : le rendu React est monté par portail dans une IFRAME de la largeur réelle de l'appareil (390 × 844 téléphone,
// 1440 ordinateur), réduite par transform sur l'iframe (jamais sur son contenu). Media queries, position fixe, vh/dvh,
// sticky et défilement s'y comportent comme sur l'appareil ; le défilement se fait dans l'iframe seulement.
// Feuilles de style : celles de la page de l'admin (CSS des polices fontsource, dessins.css, Tailwind) sont recopiées dans
// l'iframe et suivies (MutationObserver) ; les <style> de l'aperçu (gabarits, gamme, effets) voyagent avec le portail.
// Listes (vignettes) : l'iframe n'est montée que lorsque le cadre est visible (IntersectionObserver), démontée sinon.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { dimensionsCadre, type AppareilApercu } from '@plateforme/core';
import { DUREE_ANIMATIONS_MS, EVENEMENT_REPRISE, pauserAnimations, useAnimerContinu } from './AnimationsBudget';

type Props = {
  appareil: AppareilApercu;
  /** Hauteur affichée imposée (vignettes, cartes de retours) : pas de défilement */
  vignette?: number;
  /** Rendu plein écran : la fenêtre simulée occupe la hauteur disponible */
  plein?: boolean;
  /** Montage seulement à l'écran (défaut : vignettes) */
  paresseux?: boolean;
  /** Hauteur affichée imposée, défilement conservé (Studio grand écran : aperçus remplissant la hauteur de l'écran) */
  hauteur?: number;
  /** Titre accessible de l'iframe */
  titre?: string;
  children: ReactNode;
};

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Recopie (et suit) les feuilles de style de la page dans le document de l'iframe */
function suivreStyles(source: Document, cible: Document) {
  const copies = new Map<Element, Element>();
  const maj = () => {
    const actuels = Array.from(source.head.querySelectorAll('link[rel="stylesheet"], style'));
    const presents = new Set(actuels);
    for (const [orig, copie] of copies) if (!presents.has(orig)) { copie.remove(); copies.delete(orig); }
    for (const n of actuels) {
      const c = copies.get(n);
      if (!c) {
        const k = cible.importNode(n, true) as Element;
        cible.head.appendChild(k);
        copies.set(n, k);
      } else if (n.tagName === 'STYLE' && c.textContent !== n.textContent) {
        c.textContent = n.textContent;
      }
    }
  };
  maj();
  const mo = new MutationObserver(maj);
  mo.observe(source.head, { childList: true, subtree: true, characterData: true });
  return () => { mo.disconnect(); for (const c of copies.values()) c.remove(); copies.clear(); };
}

/** Raccourcis de l'admin (z : signaler une zone, h : masquer le repère, o : ouvrir le menu, Échap) même quand le focus est dans l'iframe */
const TOUCHES_RELAYEES = new Set(['z', 'Z', 'h', 'H', 'o', 'O', 'Escape']);

/**
 * Budget des animations de l'aperçu (AnimationsBudget.tsx) : jeu pendant DUREE_ANIMATIONS_MS après le montage, après chaque
 * changement du contenu (dé, recette, duel) et pendant le survol / toucher ; pause hors écran, onglet caché ; toujours en
 * jeu avec « Animer en continu ». Renvoie la fonction d'arrêt.
 */
function budgetAnimations(iframe: HTMLIFrameElement, d: Document, continu: { current: boolean }, reveil: { current: () => void }): () => void {
  const win = iframe.ownerDocument.defaultView ?? window;
  let jusqua = 0, visible = true, actif: boolean | null = null;
  let minuterie = 0, rescan = 0;
  const appliquer = () => {
    const a = !win.document.hidden && visible && (continu.current || win.performance.now() < jusqua);
    if (a !== actif) {
      actif = a;
      pauserAnimations(d, !a);
      win.clearInterval(rescan);
      // En pause : les animations infinies apparues depuis (classe rejouée…) sont arrêtées à leur tour
      if (!a) rescan = win.setInterval(() => pauserAnimations(d, true), 2000);
      else win.dispatchEvent(new Event(EVENEMENT_REPRISE));
    }
    win.clearTimeout(minuterie);
    if (a && !continu.current) minuterie = win.setTimeout(appliquer, Math.max(50, jusqua - win.performance.now() + 20));
  };
  const jouer = () => { jusqua = win.performance.now() + DUREE_ANIMATIONS_MS; appliquer(); };
  reveil.current = appliquer;
  const mo = new MutationObserver(jouer);
  mo.observe(d.body, { childList: true, subtree: true, characterData: true });
  const io = new win.IntersectionObserver((e) => { visible = e.some((x) => x.isIntersecting); appliquer(); });
  io.observe(iframe);
  const evts = ['pointermove', 'pointerdown', 'touchstart', 'wheel'] as const;
  for (const t of evts) d.addEventListener(t, jouer, { passive: true });
  iframe.addEventListener('pointerenter', jouer);
  win.document.addEventListener('visibilitychange', appliquer);
  jouer();
  return () => {
    mo.disconnect(); io.disconnect();
    for (const t of evts) d.removeEventListener(t, jouer);
    iframe.removeEventListener('pointerenter', jouer);
    win.document.removeEventListener('visibilitychange', appliquer);
    win.clearTimeout(minuterie); win.clearInterval(rescan);
    reveil.current = () => undefined;
  };
}

function Iframe({ largeur, hauteurVue, echelle, defile, mobile, titre, children }: { largeur: number; hauteurVue: number; echelle: number; defile: boolean; mobile: boolean; titre: string; children: ReactNode }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [corps, setCorps] = useState<HTMLElement | null>(null);
  const continu = useAnimerContinu();
  const refContinu = useRef(continu);
  const reveil = useRef<() => void>(() => undefined);
  useEffect(() => { refContinu.current = continu; reveil.current(); }, [continu]);
  // Document minimal en mode standard ; base = l'admin (polices, photos, /_next/…). Barre de défilement masquée sur
  // téléphone (largeur de mise en page = 390 comme sur l'appareil), fine sur ordinateur, absente des vignettes.
  const [doc] = useState(() => {
    const base = typeof window === 'undefined' ? '/' : `${window.location.origin}/`;
    const barre = !defile ? 'html{overflow:hidden}' : mobile ? 'html{scrollbar-width:none}html::-webkit-scrollbar{display:none}' : 'html{scrollbar-width:thin}';
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><base href="${base}"><style>html,body{margin:0;padding:0;background:#fff}${barre}body{overflow-x:hidden;-webkit-text-size-adjust:100%}</style></head><body data-cadre-apercu></body></html>`;
  });

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;
    let fin: (() => void) | null = null;
    const pret = () => {
      const d = iframe.contentDocument;
      if (fin || !d?.body?.hasAttribute('data-cadre-apercu')) return;
      const arretStyles = suivreStyles(document, d);
      const relais = (e: KeyboardEvent) => {
        if (!TOUCHES_RELAYEES.has(e.key)) return;
        window.dispatchEvent(new KeyboardEvent('keydown', { key: e.key, code: e.code, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, shiftKey: e.shiftKey, bubbles: true, cancelable: true }));
      };
      d.addEventListener('keydown', relais);
      const arretBudget = budgetAnimations(iframe, d, refContinu, reveil);
      fin = () => { arretStyles(); arretBudget(); d.removeEventListener('keydown', relais); };
      setCorps(d.body);
    };
    pret();
    iframe.addEventListener('load', pret);
    return () => { iframe.removeEventListener('load', pret); fin?.(); setCorps(null); };
  }, []);

  return (
    <>
      <iframe ref={ref} title={titre} srcDoc={doc} tabIndex={-1}
        style={{ display: 'block', width: largeur, height: hauteurVue, border: 0, background: '#fff', transform: echelle === 1 ? undefined : `scale(${echelle})`, transformOrigin: '0 0', colorScheme: 'light' }} />
      {corps && createPortal(children, corps)}
    </>
  );
}

export default function CadreApercu({ appareil, vignette, plein = false, paresseux = Boolean(vignette), hauteur: hauteurImposee, titre = 'Aperçu du site', children }: Props) {
  const boite = useRef<HTMLDivElement>(null);
  const [mesure, setMesure] = useState<{ largeur: number; hauteur: number } | null>(null);
  const [visible, setVisible] = useState(!paresseux);

  useIsoLayoutEffect(() => {
    const el = boite.current;
    if (!el) return;
    const maj = () => {
      const largeur = el.clientWidth;
      // Hauteur disponible : plein écran = du haut du cadre au bas de la fenêtre, moins le pied du dialogue et la note
      // (≈ 120 px) ; sinon 78 % de la fenêtre
      const haut = Math.max(0, el.getBoundingClientRect().top);
      const hauteur = hauteurImposee ? Math.round(hauteurImposee) : plein ? Math.max(360, Math.round(window.innerHeight - haut - 120)) : Math.round(window.innerHeight * 0.78);
      setMesure((m) => (m && m.largeur === largeur && m.hauteur === hauteur ? m : { largeur, hauteur }));
    };
    maj();
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    window.addEventListener('resize', maj);
    return () => { ro.disconnect(); window.removeEventListener('resize', maj); };
  }, [plein, hauteurImposee]);

  useEffect(() => {
    if (!paresseux) { setVisible(true); return; }
    const el = boite.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => setVisible(e.some((x) => x.isIntersecting)), { rootMargin: '240px' });
    io.observe(el);
    return () => io.disconnect();
  }, [paresseux]);

  const mobile = appareil === 'mobile';
  // Coque de téléphone (bords, encoche discrète) seulement quand il y a la place, hors vignettes (le parent a son cadre)
  const coque = mobile && !vignette && (mesure?.largeur ?? 0) >= 480;
  const bord = coque ? { cote: 10, haut: 30, bas: 16 } : null;
  const d = mesure ? dimensionsCadre({
    appareil,
    largeurDispo: mesure.largeur - (bord ? 2 * bord.cote : 0),
    hauteurMax: vignette ? undefined : mesure.hauteur - (bord ? bord.haut + bord.bas : 0),
    vignette,
    remplir: plein || Boolean(hauteurImposee),
  }) : null;

  const ecran = d && (
    <div style={{ width: d.largeurAffichee, height: d.hauteurAffichee, overflow: 'hidden', position: 'relative', borderRadius: coque ? 22 : undefined, background: '#fff' }}>
      {visible
        ? <Iframe key={`${appareil}|${d.largeur}`} largeur={d.largeur} hauteurVue={d.hauteurVue} echelle={d.echelle} defile={!vignette} mobile={mobile} titre={titre}>{children}</Iframe>
        : <div aria-hidden="true" className="h-full w-full bg-neutral-100" />}
    </div>
  );

  return (
    <div ref={boite} className="w-full min-w-0" style={vignette ? { height: vignette } : undefined}>
      {d && (bord ? (
        <div className="mx-auto w-fit" style={{ padding: `${bord.haut}px ${bord.cote}px ${bord.bas}px`, borderRadius: 34, background: '#1c1c1e', boxShadow: '0 0 0 1px rgb(0 0 0 / 0.5), 0 18px 40px -20px rgb(0 0 0 / 0.45)', position: 'relative' }}>
          <span aria-hidden="true" style={{ position: 'absolute', top: 10, left: '50%', width: 74, height: 11, marginLeft: -37, borderRadius: 999, background: '#000', boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / 0.06)' }} />
          {ecran}
        </div>
      ) : <div className="mx-auto" style={{ width: d.largeurAffichee }}>{ecran}</div>)}
    </div>
  );
}
