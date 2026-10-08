'use client';

// Repère « ce qui est évalué » (retour de Paul du 2026-10-08 : « montrer direct avec un encadré ou autre ce qui est évalué,
// parfois on ne sait pas trop ») et pilotage des menus dans les aperçus (« difficile de noter les menus sans pouvoir les
// afficher »). Table pure dimension / clé → libellé et sélecteurs : packages/core/src/reperes.ts.
//
// - BandeauEvaluation : « On compare : … » (duels) ou « Vous notez : … » (tuiles), valeurs A / B, bouton « Masquer le repère » (h).
// - PiloteApercu : enveloppe un ou plusieurs aperçus (iframes de CadreApercu) ; dans chaque document d'aperçu, un calque fixe
//   (pointer-events: none) dessine un contour animé, couleur de l'admin (encre ardoise + halo blanc, jamais une couleur du site),
//   autour des éléments visés, défile vers la zone, et pilote le menu : état ouvert (classe mn-ouvert posée sur la racine .ap,
//   comme le script du site SCRIPT_MENU), bouton « Menu » cliquable, rubrique active (aria-current), survol simulé (règles
//   :hover des menus recopiées sur [data-survol-simule]), défilement imposé (barre collante). Rien n'est ajouté au site publié.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { appliquerSurfaces, cssSurfaces, mesurerSurfaces, type Repere } from '@plateforme/core';

const CLE_MASQUE = 'repere:masque';

/** Repère affiché ou masqué (touche h, préférence gardée dans ce navigateur) */
export function useRepereVisible(): [boolean, () => void] {
  const [visible, setVisible] = useState(true);
  useEffect(() => { try { setVisible(localStorage.getItem(CLE_MASQUE) !== '1'); } catch { /* stockage indisponible */ } }, []);
  const basculer = useCallback(() => setVisible((v) => {
    try { localStorage.setItem(CLE_MASQUE, v ? '1' : '0'); } catch { /* stockage indisponible */ }
    return !v;
  }), []);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)))) return;
      if (e.key === 'h' || e.key === 'H') { e.preventDefault(); basculer(); }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [basculer]);
  return [visible, basculer];
}

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

/** Bandeau au-dessus des aperçus : ce qui est évalué, en langage simple */
export function BandeauEvaluation({ prefixe, repere, valeurs, visible, onBasculer, children }: {
  prefixe: 'On compare' | 'Vous notez';
  repere: Repere;
  valeurs?: [string, string] | null;
  visible: boolean;
  onBasculer: () => void;
  children?: ReactNode;
}) {
  const encadre = repere.selecteurs.length > 0;
  return (
    <div role="note" aria-label="Ce qui est évalué" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border-2 border-slate-900 bg-white px-3 py-2.5">
      <p className="min-w-0 flex-[1_1_16rem] text-base leading-snug text-slate-900">
        <span className="mr-1.5 inline-block rounded bg-slate-900 px-1.5 py-0.5 align-[1px] text-xs font-bold uppercase tracking-wide text-white">{prefixe}</span>
        {repere.ensemble && !repere.zones.length && prefixe === 'On compare' && repere.libelle.startsWith('tout le thème')
          ? <strong>Thème complet : jugez l’ensemble</strong>
          : <strong className="first-letter:uppercase">{repere.libelle}</strong>}
        {repere.detail && <span className="text-sm text-slate-600"> · {repere.detail}</span>}
        {valeurs && <span className="mt-0.5 block text-sm text-slate-700"><strong>A</strong> : {valeurs[0]} <span aria-hidden="true">·</span> <strong>B</strong> : {valeurs[1]}</span>}
      </p>
      {children}
      {encadre && (
        <button type="button" onClick={onBasculer} aria-pressed={!visible} className={`min-h-11 shrink-0 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 ${focus}`}>
          {visible ? 'Masquer le repère' : 'Afficher le repère'} <kbd className="ml-1 hidden rounded bg-slate-100 px-1.5 text-xs md:inline">h</kbd>
        </button>
      )}
    </div>
  );
}

export type PilotageMenu = {
  /** Menu du téléphone ouvert (panneau, tiroir) */
  ouvert?: boolean;
  /** Bouton « Menu » de l'aperçu cliquable : demande l'inverse de `ouvert` */
  onBascule?: (ouvert: boolean) => void;
  /** Rubrique courante (aria-current sur le premier lien du menu, comme sur une page interne du site) */
  rubriqueActive?: boolean;
  /** Survol simulé sur le deuxième lien */
  survol?: boolean;
};

type Props = {
  children: ReactNode;
  /** Sélecteurs CSS des éléments à encadrer (reperes.ts) ; vide : aucun encadré */
  selecteurs?: readonly string[];
  /** Repère affiché */
  visible?: boolean;
  /** Défilement : vers le premier élément encadré (« repere »), à une hauteur fixe (px du document), ou aucun */
  defiler?: 'repere' | number | null;
  menu?: PilotageMenu;
  /** Change à chaque nouvel élément évalué : le défilement est rejoué */
  cle?: string;
  className?: string;
  /** État réel du menu dans l'aperçu : barre collante (sticky / fixed) ou non (planche des menus, « Après défilement ») */
  onMenuCollant?: (collant: boolean) => void;
};

const ETIQUETTE = 'Évalué ici';
const STYLE_CALQUE = `[data-pilote-calque]{position:fixed;inset:0;pointer-events:none;z-index:2147483000;overflow:hidden}
[data-pilote-calque][hidden]{display:none}
[data-pilote-boite]{position:fixed;box-sizing:border-box;border:calc(3px * var(--k,1)) solid #0f172a;border-radius:calc(6px * var(--k,1));box-shadow:0 0 0 calc(2px * var(--k,1)) #fff,inset 0 0 0 calc(2px * var(--k,1)) #fff;animation:pilote-pouls 1.8s ease-in-out infinite}
[data-pilote-boite]::before{content:"";position:absolute;inset:calc(-6px * var(--k,1));border:calc(2px * var(--k,1)) dashed rgb(15 23 42 / .55);border-radius:calc(9px * var(--k,1))}
[data-pilote-etiquette]{position:absolute;left:calc(-3px * var(--k,1));top:calc(-3px * var(--k,1));transform:translateY(-100%);background:#0f172a;color:#fff;font:700 calc(12px * var(--k,1))/1.2 system-ui,sans-serif;padding:calc(3px * var(--k,1)) calc(7px * var(--k,1));border-radius:calc(4px * var(--k,1)) calc(4px * var(--k,1)) 0 0;white-space:nowrap}
[data-pilote-boite][data-bas] [data-pilote-etiquette]{top:auto;bottom:calc(-3px * var(--k,1));transform:translateY(100%);border-radius:0 0 calc(4px * var(--k,1)) calc(4px * var(--k,1))}
@keyframes pilote-pouls{0%,100%{opacity:1}50%{opacity:.55}}
@media (prefers-reduced-motion:reduce){[data-pilote-boite]{animation:none}}`;

/** Règles :hover des menus (mn-*), recopiées sur [data-survol-simule] (survol simulé, sans souris) */
function cssSurvolSimule(doc: Document): string {
  const sortie: string[] = [];
  const parcourir = (regles: CSSRuleList, enveloppe: (s: string) => string) => {
    for (const r of Array.from(regles)) {
      if (r instanceof doc.defaultView!.CSSMediaRule) parcourir(r.cssRules, (s) => enveloppe(`@media ${r.conditionText}{${s}}`));
      else if (r instanceof doc.defaultView!.CSSStyleRule && r.selectorText.includes(':hover') && /mn-|ap-entete/.test(r.selectorText)) {
        const sel = r.selectorText.split(',').filter((s) => s.includes(':hover')).map((s) => s.replace(/:hover/g, '[data-survol-simule]')).join(',');
        sortie.push(enveloppe(`${sel}{${r.style.cssText}}`));
      }
    }
  };
  for (const f of Array.from(doc.styleSheets)) {
    try { parcourir(f.cssRules, (s) => s); } catch { /* feuille d'une autre origine */ }
  }
  return sortie.join('\n');
}

type EtatDoc = { defile: boolean; essais: number; cle: string; survol: string | null };

/** Aperçu(s) piloté(s) : repère, défilement, menu ouvert / survolé / rubrique active */
export default function PiloteApercu({ children, selecteurs = [], visible = true, defiler = 'repere', menu, cle = '', className, onMenuCollant }: Props) {
  const racine = useRef<HTMLDivElement>(null);
  const options = useRef({ selecteurs, visible, defiler, menu, cle, onMenuCollant });
  options.current = { selecteurs, visible, defiler, menu, cle, onMenuCollant };
  const etats = useRef(new WeakMap<Document, EtatDoc>());

  useEffect(() => {
    const ecoutes = new Map<Document, () => void>();
    const brancher = (doc: Document) => {
      if (ecoutes.has(doc)) return;
      const clic = (e: MouseEvent) => {
        const m = options.current.menu;
        if (!m?.onBascule) return;
        const t = e.target as Element | null;
        if (t?.closest?.('.mn-burger, .ap-menu')) { e.preventDefault(); m.onBascule(!m.ouvert); }
      };
      const defile = () => maj(doc);
      doc.addEventListener('click', clic, true);
      doc.defaultView?.addEventListener('scroll', defile, { passive: true });
      ecoutes.set(doc, () => { doc.removeEventListener('click', clic, true); doc.defaultView?.removeEventListener('scroll', defile); });
    };
    const maj = (doc: Document) => {
      const o = options.current;
      const win = doc.defaultView;
      if (!win || !doc.body) return;
      let et = etats.current.get(doc);
      if (!et || et.cle !== o.cle) { et = { defile: false, essais: 0, cle: o.cle, survol: null }; etats.current.set(doc, et); }
      // Feuille et calque
      let style = doc.head.querySelector<HTMLStyleElement>('style[data-pilote]');
      if (!style) { style = doc.createElement('style'); style.setAttribute('data-pilote', ''); doc.head.appendChild(style); }
      if (o.menu?.survol && et.survol === null) et.survol = cssSurvolSimule(doc);
      const css = STYLE_CALQUE + (o.menu?.survol ? `\n${et.survol ?? ''}` : '');
      if (style.textContent !== css) style.textContent = css;
      let calque = doc.body.querySelector<HTMLDivElement>(':scope > [data-pilote-calque]');
      if (!calque) { calque = doc.createElement('div'); calque.setAttribute('data-pilote-calque', ''); calque.setAttribute('aria-hidden', 'true'); doc.body.appendChild(calque); }
      // Échelle de l'iframe (réduite par transform) : traits épaissis d'autant pour rester lisibles
      const iframe = win.frameElement as HTMLElement | null;
      const k = iframe && iframe.getBoundingClientRect().width > 0 ? iframe.offsetWidth / iframe.getBoundingClientRect().width : 1;
      calque.style.setProperty('--k', String(Math.min(4, Math.max(1, k))));
      // Menu : état ouvert, rubrique active, survol simulé
      const ap = doc.querySelector('.ap');
      if (ap && o.menu) {
        ap.classList.toggle('mn-ouvert', Boolean(o.menu.ouvert));
        const burger = doc.querySelector('.mn-burger, .ap-menu');
        if (burger) { burger.setAttribute('aria-expanded', String(Boolean(o.menu.ouvert))); const txt = burger.lastElementChild; if (txt && txt.textContent !== (o.menu.ouvert ? 'Fermer' : 'Menu')) txt.textContent = o.menu.ouvert ? 'Fermer' : 'Menu'; }
        const liens = Array.from(doc.querySelectorAll('.mn-lien'));
        if (o.menu.rubriqueActive && liens[0] && !doc.querySelector('.mn-lien[aria-current]')) liens[0].setAttribute('aria-current', 'page');
        liens.forEach((l, i) => l.toggleAttribute('data-survol-simule', Boolean(o.menu?.survol) && i === 1));
      }
      // Barre de menu collante ? (position calculée de l'en-tête, comme sur le site)
      if (o.onMenuCollant) {
        const e = doc.querySelector('.mn-entete, .ap-entete');
        if (e) { const pos = win.getComputedStyle(e).position; o.onMenuCollant(pos === 'sticky' || pos === 'fixed'); }
      }
      // Éléments visés
      let cibles: Element[] = [];
      if (o.selecteurs.length) { try { cibles = Array.from(doc.body.querySelectorAll(o.selecteurs.join(','))).filter((x) => !x.closest('[data-pilote-calque]')); } catch { cibles = []; } }
      // Défilement (une fois par élément évalué, quand la page est assez haute)
      if (!et.defile && o.defiler !== null && o.defiler !== undefined) {
        et.essais++;
        const haut = doc.documentElement.scrollHeight;
        if (typeof o.defiler === 'number') {
          if (haut >= o.defiler + win.innerHeight || et.essais > 12) { win.scrollTo(0, o.defiler); et.defile = true; }
        } else if (cibles.length) {
          const r = cibles.map((x) => x.getBoundingClientRect()).find((x) => x.width > 0 && x.height > 0);
          if (r) { win.scrollTo(0, Math.max(0, r.top + win.scrollY - Math.min(120, win.innerHeight * 0.15))); et.defile = true; }
        } else if (et.essais > 12) et.defile = true;
      }
      // Boîtes
      calque.hidden = !o.visible || !cibles.length;
      if (calque.hidden) { calque.replaceChildren(); return; }
      const rects = cibles.map((x) => x.getBoundingClientRect()).filter((r) => r.width > 2 && r.height > 2).slice(0, 40);
      while (calque.children.length > rects.length) calque.lastElementChild!.remove();
      rects.forEach((r, i) => {
        let b = calque!.children[i] as HTMLElement | undefined;
        if (!b) { b = doc.createElement('div'); b.setAttribute('data-pilote-boite', ''); calque!.appendChild(b); }
        // Marge autour de l'élément : le trait ne touche jamais le texte encadré
        const m = 5 * Math.min(4, Math.max(1, k));
        Object.assign(b.style, { left: `${r.left - m}px`, top: `${r.top - m}px`, width: `${r.width + 2 * m}px`, height: `${r.height + 2 * m}px` });
        const avecEtiquette = i === 0;
        b.toggleAttribute('data-bas', r.top < 28 * k);
        const e = b.firstElementChild;
        if (avecEtiquette && !e) { const s = doc.createElement('span'); s.setAttribute('data-pilote-etiquette', ''); s.textContent = ETIQUETTE; b.appendChild(s); }
        if (!avecEtiquette && e) e.remove();
      });
    };
    const tick = () => {
      const r = racine.current;
      if (!r) return;
      for (const f of Array.from(r.querySelectorAll('iframe'))) {
        const doc = f.contentDocument;
        if (!doc?.body?.hasAttribute('data-cadre-apercu')) continue;
        brancher(doc);
        maj(doc);
      }
    };
    tick();
    const t = setInterval(tick, 250);
    return () => { clearInterval(t); for (const f of ecoutes.values()) f(); ecoutes.clear(); };
  }, []);

  // Changement d'options : application immédiate
  useEffect(() => {
    const r = racine.current;
    if (!r) return;
    for (const f of Array.from(r.querySelectorAll('iframe'))) f.contentWindow?.dispatchEvent(new Event('scroll'));
  }, [selecteurs, visible, defiler, menu?.ouvert, menu?.survol, menu?.rubriqueActive, cle]);

  return <div ref={racine} className={className ?? 'min-w-0'}>{children}</div>;
}

/**
 * Répartition des surfaces dans les aperçus (duels « Contrastes et fonds », tuile du même nom ; surfaces.ts) : couleurs --g-*
 * lues sur la racine .ap de chaque aperçu, feuille cssSurfaces injectée (vide si la répartition n'est pas conforme AA).
 */
export function StyleSurfaces({ id, children, onMesure }: { id: string | null | undefined; children: ReactNode; onMesure?: (m: { ratio: number; conforme: boolean }) => void }) {
  const racine = useRef<HTMLDivElement>(null);
  const rappel = useRef(onMesure);
  rappel.current = onMesure;
  useEffect(() => {
    if (!id) return;
    const tick = () => {
      for (const f of Array.from(racine.current?.querySelectorAll('iframe') ?? [])) {
        const doc = f.contentDocument;
        const ap = doc?.querySelector('.ap');
        if (!doc || !ap) continue;
        let st = doc.head.querySelector<HTMLStyleElement>('style[data-surfaces]');
        if (st?.dataset.surfaces === id) continue;
        const cs = doc.defaultView!.getComputedStyle(ap);
        const c: Record<string, string> = {};
        for (const k of CLES_SURFACES) { const v = cs.getPropertyValue(`--g-${k}`).trim(); if (v) c[k] = v; }
        if (!c.page) continue;
        if (!st) { st = doc.createElement('style'); doc.head.appendChild(st); }
        st.dataset.surfaces = id;
        st.textContent = cssSurfaces(c, id);
        const m = mesurerSurfaces(appliquerSurfaces(c, id));
        rappel.current?.({ ratio: m.ratio, conforme: m.conforme });
      }
    };
    tick();
    const t = setInterval(tick, 400);
    return () => clearInterval(t);
  }, [id]);
  return <div ref={racine} className="min-w-0">{children}</div>;
}
const CLES_SURFACES = ['page', 'carte', 'doux', 'bulle', 'bulle-texte', 'accent-texte', 'plein', 'plein-texte', 'plein-bord', 'encre', 'encre-douce', 'aplat', 'aplat-texte', 'aplat-doux', 'figure'] as const;
