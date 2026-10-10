'use client';

// CHOIX D'IMAGES EN SITUATION (décision de Paul du 2026-10-10 : « juste choisir les photos en passant sur l'image du site et laisser
// à l'admin la possibilité de remplacer avec la roulette la photo qui va bien. Idem pour l'illustration du haut »).
// Enveloppe un aperçu de site rendu dans une iframe (CadreApercu) : au SURVOL (ordinateur) ou au TOUCHER (téléphone) d'une photo ou
// de l'illustration du haut, un petit contrôle apparaît SUR l'image : ‹ › (ou molette de la souris sur le contrôle, et sur l'image
// une fois le contrôle épinglé ; ← → au clavier) pour faire défiler les candidates une à une DANS la page (aperçu instantané, images
// voisines préchargées), puis « Choisir » (ou « Garder » l'image actuelle). Après un choix de photo, contrôle léger du contraste
// du texte posé dessus (chaine-images.ts, controleContraste) : mesuré si l'image le permet, sinon signalé au testeur.
// Générique (aucune dépendance à la chaîne) : réutilisable dans l'éditeur du praticien (/mon-site/personnaliser) avec ses propres
// emplacements, candidates et enregistrement. Rien n'est caché derrière le survol seul : le toucher ouvre le même contrôle.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { controleContraste } from '@plateforme/core/chaine-images';

export type CandidateSituation = { image: string; libelle?: string; note?: number | null; valide?: boolean };
export type EmplacementSituation = {
  id: string;
  libelle: string;
  /** « photo » : <img> dont l'adresse est l'image actuelle ; « illustration » : illustration du haut (classe heros-theme--*) */
  type: 'photo' | 'illustration';
  /** Image actuellement affichée (adresse de la photo ou sujet de l'illustration) */
  actuelle: string | null;
  /** Image enregistrée (préférence) : « Garder » quand on revient dessus */
  enregistree: string | null;
  candidates: CandidateSituation[];
};

type Props = {
  emplacements: EmplacementSituation[];
  /** Aperçu instantané d'une candidate (null = revenir à l'image enregistrée) */
  onApercu: (emplacement: string, image: string | null) => void;
  /** Choix définitif ; message affiché dans le contrôle */
  onChoisir: (emplacement: string, image: string) => Promise<{ ok: boolean; message: string }>;
  children: ReactNode;
  desactive?: boolean;
  className?: string;
};

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const sansRequete = (u: string) => u.replace(/[?#].*$/, '');
const nomFichier = (u: string) => sansRequete(u).split('/').pop() ?? u;
/** Même photo (adresse exacte, sans paramètres, ou même fichier) */
const memePhoto = (a: string, b: string) => a === b || sansRequete(a) === sansRequete(b) || (nomFichier(a).length > 6 && nomFichier(a) === nomFichier(b));

type Actif = { id: string; el: Element; epingle: boolean };
type Contraste = { texte: string; ok: boolean | null };

export default function ChoixImagesSituation({ emplacements, onApercu, onChoisir, children, desactive, className }: Props) {
  const racine = useRef<HTMLDivElement>(null);
  const [controle, setControle] = useState<HTMLDivElement | null>(null);
  const [actif, setActif] = useState<Actif | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number; l: number; h: number } | null>(null);
  const [index, setIndex] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const [contraste, setContraste] = useState<Contraste | null>(null);
  const [enCours, setEnCours] = useState(false);
  const refs = useRef({ emplacements, actif, index, desactive });
  refs.current = { emplacements, actif, index, desactive };
  const cacher = useRef<number | null>(null);
  const surControle = useRef(false);
  const glisse = useRef<number | null>(null);

  const iframe = () => racine.current?.querySelector('iframe') ?? null;

  /** Emplacement de l'élément touché ou survolé dans l'aperçu */
  const trouverUn = useCallback((e: Element | null): { id: string; el: Element } | null => {
    if (!e || typeof e.closest !== 'function') return null;
    const ill = e.closest('[class*="heros-theme--"]');
    if (ill) { const x = refs.current.emplacements.find((m) => m.type === 'illustration' && m.candidates.length); if (x) return { id: x.id, el: ill }; }
    const img = e.closest('img');
    const src = img?.getAttribute('src');
    if (img && src) { const x = refs.current.emplacements.find((m) => m.type === 'photo' && m.actuelle && m.candidates.length && memePhoto(m.actuelle, src)); if (x) return { id: x.id, el: img }; }
    return null;
  }, []);
  /** Élément visé : la cible, sinon ce qui est SOUS elle au même point (voile, dégradé ou lien posé sur la photo) */
  const trouver = useCallback((t: EventTarget | null, x?: number, y?: number): { id: string; el: Element } | null => {
    const direct = trouverUn(t as Element | null);
    if (direct || x === undefined || y === undefined) return direct;
    const d = (t as Element | null)?.ownerDocument;
    for (const e of d?.elementsFromPoint(x, y) ?? []) { const r = trouverUn(e); if (r) return r; }
    return null;
  }, [trouverUn]);

  const indexCourant = (m: EmplacementSituation, idx: Record<string, number>) => {
    if (idx[m.id] !== undefined) return idx[m.id];
    const i = m.candidates.findIndex((c) => m.actuelle && (m.type === 'photo' ? memePhoto(c.image, m.actuelle) : c.image === m.actuelle));
    return i < 0 ? 0 : i;
  };

  const fermer = useCallback(() => {
    const a = refs.current.actif;
    if (a) {
      const m = refs.current.emplacements.find((x) => x.id === a.id);
      // Défilé sans choisir : retour à l'image enregistrée
      if (m && refs.current.index[a.id] !== undefined) onApercu(a.id, null);
      setIndex((l) => { const n = { ...l }; delete n[a.id]; return n; });
    }
    setActif(null); setMessage(''); setContraste(null);
  }, [onApercu]);

  const pas = useCallback((d: number) => {
    const a = refs.current.actif;
    const m = a && refs.current.emplacements.find((x) => x.id === a.id);
    if (!a || !m || !m.candidates.length) return;
    const i = (indexCourant(m, refs.current.index) + d + m.candidates.length) % m.candidates.length;
    setIndex((l) => ({ ...l, [m.id]: i }));
    setActif({ ...a, epingle: true });
    setMessage(''); setContraste(null);
    onApercu(m.id, m.candidates[i].image);
  }, [onApercu]);

  // Liaison au document de l'iframe (recréée à chaque changement de page ou d'appareil) : survol, toucher, molette, clavier
  useEffect(() => {
    let doc: Document | null = null;
    const survol = (ev: PointerEvent) => {
      if (refs.current.desactive || ev.pointerType === 'touch') return;
      const t = trouver(ev.target, ev.clientX, ev.clientY);
      const a = refs.current.actif;
      if (t) {
        if (cacher.current) { window.clearTimeout(cacher.current); cacher.current = null; }
        if (!a || (!a.epingle && a.el !== t.el)) setActif({ ...t, epingle: false });
        else if (a.id === t.id && a.el !== t.el) setActif({ ...a, el: t.el });
      } else if (a && !a.epingle && !cacher.current) {
        cacher.current = window.setTimeout(() => { cacher.current = null; if (!surControle.current && refs.current.actif && !refs.current.actif.epingle) setActif(null); }, 500);
      }
    };
    const toucher = (ev: PointerEvent) => {
      if (refs.current.desactive) return;
      const t = trouver(ev.target, ev.clientX, ev.clientY);
      const a = refs.current.actif;
      if (t) setActif({ ...t, epingle: ev.pointerType === 'touch' || Boolean(a && a.id === t.id) });
      else if (a) fermer();
    };
    const molette = (ev: WheelEvent) => {
      const a = refs.current.actif;
      if (!a?.epingle) return;
      const t = trouver(ev.target, ev.clientX, ev.clientY);
      if (!t || t.id !== a.id) return;
      ev.preventDefault();
      pas(ev.deltaY > 0 || ev.deltaX > 0 ? 1 : -1);
    };
    const clavier = (ev: KeyboardEvent) => {
      if (!refs.current.actif) return;
      const cible = ev.target as HTMLElement | null;
      if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;
      if (ev.key === 'ArrowRight') { ev.preventDefault(); pas(1); }
      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); pas(-1); }
      else if (ev.key === 'Escape') fermer();
    };
    const lier = () => {
      const f = iframe();
      const d = f?.contentDocument ?? null;
      if (d === doc || !d?.body) return;
      delier();
      doc = d;
      d.addEventListener('pointermove', survol, { passive: true });
      d.addEventListener('pointerdown', toucher, { passive: true });
      d.addEventListener('wheel', molette, { passive: false });
      d.addEventListener('keydown', clavier);
    };
    const delier = () => {
      if (!doc) return;
      doc.removeEventListener('pointermove', survol);
      doc.removeEventListener('pointerdown', toucher);
      doc.removeEventListener('wheel', molette);
      doc.removeEventListener('keydown', clavier);
      doc = null;
    };
    lier();
    const id = window.setInterval(lier, 600);
    window.addEventListener('keydown', clavier);
    return () => { window.clearInterval(id); delier(); window.removeEventListener('keydown', clavier); };
  }, [trouver, pas, fermer]);

  // Molette sur le contrôle lui-même (écouteur non passif : la page ne défile pas)
  useEffect(() => {
    const c = controle;
    if (!c) return;
    const m = (ev: WheelEvent) => { ev.preventDefault(); pas(ev.deltaY > 0 || ev.deltaX > 0 ? 1 : -1); };
    c.addEventListener('wheel', m, { passive: false });
    return () => c.removeEventListener('wheel', m);
  }, [controle, pas]);

  // Position du contrôle sur l'image (iframe réduite par transform : échelle = largeur affichée / largeur réelle)
  useEffect(() => {
    if (!actif) { setPos(null); return; }
    let raf = 0;
    const suivre = () => {
      const f = iframe(), r0 = racine.current?.getBoundingClientRect();
      let el = actif.el;
      if (!el.isConnected && f?.contentDocument) {
        // Image remplacée par le rendu (nouvelle candidate) : même emplacement retrouvé
        const m = refs.current.emplacements.find((x) => x.id === actif.id);
        const n = m?.type === 'illustration' ? f.contentDocument.querySelector('[class*="heros-theme--"]') : Array.from(f.contentDocument.querySelectorAll('img')).find((i) => m?.actuelle && memePhoto(m.actuelle, i.getAttribute('src') ?? ''));
        if (n) { setActif((a) => (a ? { ...a, el: n } : a)); return; }
      }
      if (f && r0 && el.isConnected) {
        const fr = f.getBoundingClientRect(), e = el.getBoundingClientRect();
        const k = f.offsetWidth ? fr.width / f.offsetWidth : 1;
        const x = Math.max(fr.left, fr.left + e.left * k) - r0.left, y = Math.max(fr.top, fr.top + e.top * k) - r0.top;
        const l = Math.min(fr.right, fr.left + e.right * k) - r0.left - x, h = Math.min(fr.bottom, fr.top + e.bottom * k) - r0.top - y;
        setPos((p) => (p && Math.abs(p.x - x) < 0.5 && Math.abs(p.y - y) < 0.5 && Math.abs(p.l - l) < 0.5 && Math.abs(p.h - h) < 0.5 ? p : { x, y, l, h }));
      }
      raf = window.requestAnimationFrame(suivre);
    };
    suivre();
    return () => window.cancelAnimationFrame(raf);
  }, [actif]);

  const m = actif ? emplacements.find((x) => x.id === actif.id) ?? null : null;
  const i = m ? indexCourant(m, index) : 0;
  const c = m?.candidates[i] ?? null;

  // Préchargement des candidates voisines (aperçu instantané)
  useEffect(() => {
    if (!m || m.type !== 'photo') return;
    for (const d of [1, -1, 2]) { const x = m.candidates[(i + d + m.candidates.length) % m.candidates.length]; if (x) { const im = new Image(); im.src = x.image; } }
  }, [m, i]);

  /** Contrôle léger : texte posé sur la photo choisie (titre du premier écran…) contre la couleur moyenne de la photo */
  const mesurerContraste = async (el: Element, src: string) => {
    const d = el.ownerDocument, r = el.getBoundingClientRect();
    const pile = d.elementsFromPoint(r.left + r.width / 2, r.top + r.height * 0.4);
    const k = pile.indexOf(el);
    const texte = (k > 0 ? pile.slice(0, k) : []).find((x) => Array.from(x.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 2));
    if (!texte) { setContraste(null); return; }
    const couleur = (d.defaultView ?? window).getComputedStyle(texte).color.match(/[\d.]+/g)?.slice(0, 3).map(Number) as [number, number, number] | undefined;
    try {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      await new Promise((ok, ko) => { im.onload = ok; im.onerror = ko; im.src = src; });
      const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
      const cx = cv.getContext('2d')!; cx.drawImage(im, 0, 0, 16, 16);
      const px = cx.getImageData(0, 0, 16, 16).data;
      let rr = 0, gg = 0, bb = 0;
      for (let j = 0; j < px.length; j += 4) { rr += px[j]; gg += px[j + 1]; bb += px[j + 2]; }
      const n = px.length / 4;
      const res = controleContraste(couleur ?? [255, 255, 255], [rr / n, gg / n, bb / n]);
      setContraste({ ok: res.ok, texte: `Contraste du texte sur la photo : ${String(res.ratio).replace('.', ',')}:1${res.ok ? '' : ' — à revoir, le testeur le revérifiera'}` });
    } catch {
      setContraste({ ok: null, texte: 'Texte posé sur cette photo : contraste non mesurable ici, le testeur le revérifiera.' });
    }
  };

  const choisir = async () => {
    if (!m || !c || !actif) return;
    if (m.enregistree && (m.type === 'photo' ? memePhoto(c.image, m.enregistree) : c.image === m.enregistree)) { setIndex((l) => { const n = { ...l }; delete n[m.id]; return n; }); setActif(null); return; }
    setEnCours(true);
    const r = await onChoisir(m.id, c.image);
    setEnCours(false);
    setMessage(r.message);
    if (m.type === 'photo') void mesurerContraste(actif.el, c.image);
    if (r.ok) setIndex((l) => { const n = { ...l }; delete n[m.id]; return n; });
  };

  const garder = Boolean(m && c && m.enregistree && (m.type === 'photo' ? memePhoto(c.image, m.enregistree) : c.image === m.enregistree));
  const largeur = pos ? Math.max(230, Math.min(pos.l, 340)) : 260;
  const limite = racine.current?.clientWidth ?? 0;

  return (
    <div ref={racine} className={`relative ${className ?? ''}`} data-choix-images={emplacements.map((e) => `${e.id}:${e.candidates.length}`).join(' ')}>
      {children}
      {actif && m && c && pos && !desactive && (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute rounded-md ring-2 ring-teal-500/80" style={{ left: pos.x, top: pos.y, width: Math.max(0, pos.l), height: Math.max(0, pos.h) }} />
          <div
            ref={setControle}
            role="group"
            aria-label={`${m.libelle} : choisir une autre image`}
            data-controle-image={m.id}
            onPointerEnter={() => { surControle.current = true; if (cacher.current) { window.clearTimeout(cacher.current); cacher.current = null; } }}
            onPointerLeave={() => { surControle.current = false; }}
            onPointerDown={(e) => { if (!actif.epingle) setActif({ ...actif, epingle: true }); if (e.pointerType !== 'mouse' && !(e.target as HTMLElement).closest('button')) glisse.current = e.clientX; }}
            /* Au doigt : glisser sur le contrôle fait défiler les candidates (comme ‹ ›) */
            onPointerUp={(e) => { const x0 = glisse.current; glisse.current = null; if (x0 !== null && Math.abs(e.clientX - x0) > 36) pas(e.clientX < x0 ? 1 : -1); }}
            onPointerCancel={() => { glisse.current = null; }}
            className="absolute z-20 grid touch-pan-y gap-1 rounded-xl bg-white/95 p-1.5 text-xs text-neutral-900 shadow-lg ring-1 ring-black/10 backdrop-blur"
            style={{ left: Math.max(4, Math.min(pos.x + 8, limite - largeur - 4)), top: Math.max(4, pos.y + 8), width: largeur }}
          >
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => pas(-1)} aria-label="Image précédente" className={`grid size-11 shrink-0 place-items-center rounded-lg border border-neutral-300 bg-white text-lg ${focus}`}>‹</button>
              <span className="flex min-w-0 flex-1 items-center gap-1.5" aria-live="polite">
                {m.type === 'photo'
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={c.image} alt="" className="size-9 shrink-0 rounded object-cover ring-1 ring-black/10" />
                  : <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded bg-teal-50 text-base">✎</span>}
                <span className="min-w-0 leading-tight">
                  <span className="block truncate font-semibold">{m.libelle}</span>
                  <span className="block truncate text-neutral-600" data-position={`${i + 1}/${m.candidates.length}`}>{i + 1} / {m.candidates.length}{c.libelle ? ` · ${c.libelle}` : ''}{c.valide === false ? ' · à valider' : c.note ? ` · ${'★'.repeat(Math.round(c.note))}` : ''}</span>
                </span>
              </span>
              <button type="button" onClick={() => pas(1)} aria-label="Image suivante" className={`grid size-11 shrink-0 place-items-center rounded-lg border border-neutral-300 bg-white text-lg ${focus}`}>›</button>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" disabled={enCours} onClick={choisir} className={`min-h-11 flex-1 rounded-lg bg-teal-800 px-2 font-semibold text-white disabled:opacity-60 ${focus}`} data-action="choisir-image">{garder ? 'Garder' : 'Choisir'}</button>
              <button type="button" onClick={fermer} aria-label="Fermer" className={`grid size-11 place-items-center rounded-lg border border-neutral-300 bg-white ${focus}`}>✕</button>
            </div>
            <p className="px-0.5 text-[11px] text-neutral-600">{m.candidates.length > 1 ? 'Glisser ici, molette ou ← → pour défiler' : 'Seule image possible pour ce profil'}</p>
            {message && <p role="status" className="px-0.5 text-[11px] font-medium text-teal-900">{message}</p>}
            {contraste && <p role="status" className={`px-0.5 text-[11px] ${contraste.ok === false ? 'font-semibold text-orange-800' : 'text-neutral-700'}`} data-contraste={contraste.ok === null ? 'inconnu' : contraste.ok ? 'ok' : 'faible'}>{contraste.texte}</p>}
          </div>
        </>
      )}
    </div>
  );
}
