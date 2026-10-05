'use client';

// Studio portrait : détourage, cadrage tête-épaules, retouche sobre et fond aux couleurs du site, dans le navigateur.
// Composant chargé à la demande (React.lazy depuis PortraitPraticien) : MediaPipe n'est téléchargé qu'à l'ouverture.
// Étapes : 1. conseils et choix de la photo ; 2. préparation (détourage, visage, retouche) ; 3. réglages (style de fond,
// cadrage au doigt, avant/après) ; 4. envoi des images finales. Rien n'est envoyé avant « Utiliser ce portrait ».
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CONSEILS_PHOTO_PORTRAIT } from '@plateforme/core';
import {
  deplacer, palettePortrait, REGLAGE_NEUTRE, SEUIL_DETOURAGE, STYLES_PORTRAIT, styleDetoure, zoomer,
  ZOOM_MAX, ZOOM_MIN, type PortraitStudio, type Reglage, type StylePortrait,
} from '@plateforme/core/portrait';
import { composer, preparer, reprendre, type Atelier, type Etape } from '@/lib/portrait/atelier';
import { studioPossible } from '@/lib/portrait/moteur';
import { enregistrerPortrait, type ResultatStudio } from '@/lib/portrait/envoi';

export type PropsStudio = {
  /** null : démonstration, rien n'est envoyé */
  siteId: string | null;
  praticienId: string;
  /** Nom affiché (« Camille Rousseau ») */
  nom: string;
  theme: { couleur: string; gamme?: string | null };
  /** Portrait existant : reprise sans refaire le détourage */
  initial?: PortraitStudio;
  onFermer: () => void;
  onValider: (r: ResultatStudio) => void;
};

const ETAPES: Record<Etape, string> = {
  lecture: 'Lecture de la photo…',
  outils: 'Préparation du studio… (premier chargement : quelques secondes)',
  detourage: 'Détourage de la silhouette…',
  retouche: 'Retouche de la lumière et des couleurs…',
};
const ORDRE: Etape[] = ['lecture', 'outils', 'detourage', 'retouche'];
const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const bouton = `inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold ${focus}`;
const LARGEUR_APERCU = 480;

export default function StudioPortrait({ siteId, praticienId, nom, theme, initial, onFermer, onValider }: PropsStudio) {
  const [etat, setEtat] = useState<'choix' | 'preparation' | 'edition' | 'envoi'>(initial?.source ? 'preparation' : 'choix');
  const [etape, setEtape] = useState<Etape>('lecture');
  const [atelier, setAtelier] = useState<Atelier | null>(null);
  const [style, setStyle] = useState<StylePortrait>(initial?.style ?? 'degrade');
  const [ombre, setOmbre] = useState(initial?.ombre ?? false);
  const [retouche, setRetouche] = useState(initial ? initial.retouche !== null : true);
  const [reglage, setReglage] = useState<Reglage>(initial?.reglage ?? REGLAGE_NEUTRE);
  const [refus, setRefus] = useState(false);
  const [avant, setAvant] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const entree = useRef<HTMLInputElement>(null);
  const apercu = useRef<HTMLCanvasElement>(null);
  const pastille = useRef<HTMLCanvasElement>(null);
  const vignettes = useRef<Record<string, HTMLCanvasElement | null>>({});
  const titre = useRef<HTMLHeadingElement>(null);
  const palette = useMemo(() => palettePortrait({ couleur: theme.couleur, gamme: theme.gamme }), [theme.couleur, theme.gamme]);
  // Portrait repris : lu une seule fois à l'ouverture
  const [reprise] = useState(initial);
  const possible = useMemo(() => studioPossible(), []);

  const detourageOk = Boolean(atelier?.detouree) && !refus;
  const douteux = atelier?.score !== null && atelier?.score !== undefined && atelier.score < SEUIL_DETOURAGE;

  // Fermeture au clavier, défilement de la page bloqué, focus sur le titre
  useEffect(() => {
    const avantDefil = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    titre.current?.focus();
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape' && etat !== 'envoi') onFermer(); };
    addEventListener('keydown', touche);
    return () => { document.body.style.overflow = avantDefil; removeEventListener('keydown', touche); };
  }, [onFermer, etat]);

  // Reprise d'un portrait enregistré : fichiers relus, pas de nouveau détourage
  useEffect(() => {
    if (!reprise?.source) return;
    let actif = true;
    reprendre(reprise.source, reprise.detouree, reprise.retouche, reprise.ancre)
      .then((a) => { if (actif) { setAtelier(a); setEtat('edition'); } })
      .catch(() => { if (actif) { setErreur('Le portrait enregistré n’a pas pu être relu. Choisissez une nouvelle photo.'); setEtat('choix'); } });
    return () => { actif = false; };
  }, [reprise]);

  const choisir = async (f: File) => {
    if (!f.type.startsWith('image/') && !/\.(heic|heif)$/i.test(f.name)) return setErreur('Ce fichier n’est pas une image.');
    setErreur(null);
    setEtat('preparation');
    setRefus(false);
    setReglage(REGLAGE_NEUTRE);
    try {
      const a = await preparer(f, setEtape, possible);
      setAtelier(a);
      const sans = !a.detouree || (a.score ?? 0) < SEUIL_DETOURAGE;
      setStyle((s) => (sans && styleDetoure(s) ? 'flou' : !sans && !initial ? 'degrade' : s));
      setEtat('edition');
    } catch {
      setErreur('Cette photo n’a pas pu être lue. Essayez une photo au format JPEG ou PNG.');
      setEtat('choix');
    }
  };

  const options = useCallback((o: { style?: StylePortrait } = {}) => ({
    style: o.style ?? style, ombre, retouche, palette, reglage, sansDetourage: !detourageOk,
  }), [style, ombre, retouche, palette, reglage, detourageOk]);

  // Aperçu principal (4:5) et pastille ronde (carré), redessinés à chaque réglage
  useEffect(() => {
    if (!atelier || etat !== 'edition') return;
    const id = requestAnimationFrame(() => {
      const c = composer(atelier, { ...options(), format: 'portrait', largeur: LARGEUR_APERCU, avant });
      const cible = apercu.current;
      if (cible) { cible.width = c.width; cible.height = c.height; cible.getContext('2d')!.drawImage(c, 0, 0); }
      const p = composer(atelier, { ...options(), format: 'carre', largeur: 128, avant });
      if (pastille.current) { pastille.current.width = 128; pastille.current.height = 128; pastille.current.getContext('2d')!.drawImage(p, 0, 0); }
    });
    return () => cancelAnimationFrame(id);
  }, [atelier, etat, options, avant]);

  // Vignettes des styles (couleurs du site appliquées en direct), légèrement différées
  useEffect(() => {
    if (!atelier || etat !== 'edition') return;
    const t = setTimeout(() => {
      for (const s of STYLES_PORTRAIT) {
        const cible = vignettes.current[s.id];
        if (!cible || (styleDetoure(s.id) && !detourageOk)) continue;
        const c = composer(atelier, { ...options({ style: s.id }), format: 'portrait', largeur: 96 });
        cible.width = c.width; cible.height = c.height;
        cible.getContext('2d')!.drawImage(c, 0, 0);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [atelier, etat, options, detourageOk]);

  // Gestes sur l'aperçu : glisser pour déplacer, pincer ou molette pour zoomer
  const pointeurs = useRef(new Map<number, { x: number; y: number }>());
  useEffect(() => {
    const c = apercu.current;
    if (!c || !atelier) return;
    // Pincement au pavé tactile (molette + Ctrl) : zoom ; la molette seule fait défiler la fenêtre
    const molette = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setReglage((r) => zoomer(r, Math.exp(-e.deltaY * 0.01)));
    };
    c.addEventListener('wheel', molette, { passive: false });
    return () => c.removeEventListener('wheel', molette);
  }, [atelier, etat]);
  const surPointeur = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!atelier) return;
    const p = pointeurs.current;
    const precedent = p.get(e.pointerId);
    if (e.type === 'pointerdown') { e.currentTarget.setPointerCapture(e.pointerId); p.set(e.pointerId, { x: e.clientX, y: e.clientY }); return; }
    if (e.type !== 'pointermove') { p.delete(e.pointerId); return; }
    if (!precedent) return;
    const largeur = e.currentTarget.getBoundingClientRect().width;
    if (p.size === 1) {
      setReglage((r) => deplacer('portrait', atelier.ancre, r, e.clientX - precedent.x, e.clientY - precedent.y, largeur, atelier.l, atelier.h));
    } else if (p.size === 2) {
      const autre = [...p.entries()].find(([id]) => id !== e.pointerId)?.[1];
      if (autre) {
        const d0 = Math.hypot(precedent.x - autre.x, precedent.y - autre.y);
        const d1 = Math.hypot(e.clientX - autre.x, e.clientY - autre.y);
        if (d0 > 10) setReglage((r) => zoomer(r, d1 / d0));
      }
    }
    p.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const valider = async () => {
    if (!atelier) return;
    setEtat('envoi');
    setErreur(null);
    try {
      const r = await enregistrerPortrait(siteId, praticienId, atelier, options(), theme, setMessage);
      onValider(r);
    } catch {
      setErreur('Envoi impossible. Vérifiez la connexion et réessayez.');
      setEtat('edition');
    }
  };

  const indexEtape = ORDRE.indexOf(etape);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="studio-titre">
      <div className="flex max-h-full w-full max-w-4xl flex-col overflow-y-auto bg-white shadow-xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-neutral-100 bg-white px-4 py-2">
          <h2 id="studio-titre" ref={titre} tabIndex={-1} className="text-base font-semibold outline-none">Studio portrait{nom ? ` · ${nom}` : ''}</h2>
          <button type="button" onClick={onFermer} disabled={etat === 'envoi'} className={`${bouton} text-neutral-700 hover:bg-neutral-100`}>Fermer</button>
        </div>

        <div className="grid gap-5 p-4 sm:p-6">
          {erreur && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{erreur}</p>}

          {etat === 'choix' && (
            <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
              <div className="grid gap-3">
                <p className="text-sm text-neutral-700">
                  Une photo prise au téléphone suffit. Le studio la cadre, corrige la lumière et peut remplacer le fond par les couleurs de votre site.
                  Tout se fait sur cet appareil : la photo n’est envoyée qu’une fois le portrait validé.
                </p>
                {!possible && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Ce navigateur ne permet pas le détourage : seuls le recadrage, la retouche et le fond flouté seront proposés.</p>}
                <button type="button" onClick={() => entree.current?.click()} className={`${bouton} bg-teal-800 text-white hover:bg-teal-900`}>
                  Prendre ou choisir une photo
                </button>
                <input ref={entree} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) choisir(f); e.target.value = ''; }} />
              </div>
              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="mb-2 text-sm font-semibold">Pour une belle photo</p>
                <ul className="grid gap-2 text-sm text-neutral-700">
                  {CONSEILS_PHOTO_PORTRAIT.map((c) => <li key={c.titre}><span className="font-medium text-neutral-900">{c.titre}.</span> {c.conseil}</li>)}
                </ul>
              </div>
            </div>
          )}

          {etat === 'preparation' && (
            <div className="grid gap-3 py-10 text-center" aria-live="polite">
              <p className="text-sm font-medium">{ETAPES[etape]}</p>
              <div className="mx-auto h-2 w-full max-w-sm overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={indexEtape + 1}>
                <div className="h-full rounded-full bg-teal-700 transition-all duration-500" style={{ width: `${((indexEtape + 1) / ORDRE.length) * 100}%` }} />
              </div>
              <p className="text-xs text-neutral-500">La photo reste sur cet appareil pendant le traitement.</p>
            </div>
          )}

          {(etat === 'edition' || etat === 'envoi') && atelier && (
            <div className="grid gap-6 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
              <div className="grid content-start gap-3">
                <canvas
                  ref={apercu}
                  width={LARGEUR_APERCU}
                  height={600}
                  onPointerDown={surPointeur}
                  onPointerMove={surPointeur}
                  onPointerUp={surPointeur}
                  onPointerCancel={surPointeur}
                  className="aspect-[4/5] w-full cursor-grab touch-none select-none rounded-xl bg-neutral-100 active:cursor-grabbing"
                  aria-label={`Aperçu du portrait${avant ? ' (photo d’origine)' : ''}. Glisser pour déplacer, pincer pour zoomer.`}
                  role="img"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onPointerDown={() => setAvant(true)}
                    onPointerUp={() => setAvant(false)}
                    onPointerLeave={() => setAvant(false)}
                    onPointerCancel={() => setAvant(false)}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setAvant(true); } }}
                    onKeyUp={() => setAvant(false)}
                    aria-pressed={avant}
                    className={`${bouton} select-none bg-neutral-100 text-neutral-800 hover:bg-neutral-200`}
                    style={{ touchAction: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                  >
                    {avant ? 'Photo d’origine' : 'Maintenir : avant'}
                  </button>
                  <button type="button" onClick={() => setReglage(REGLAGE_NEUTRE)} className={`${bouton} text-neutral-700 hover:bg-neutral-100`}>Recentrer</button>
                </div>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Zoom</span>
                  <input type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.01} value={reglage.zoom} onChange={(e) => setReglage((r) => ({ ...r, zoom: Number(e.target.value) }))} className="h-11 w-full accent-teal-800" />
                </label>
                <p className="text-xs text-neutral-500">Glissez la photo pour la déplacer ; pincez ou utilisez le curseur pour zoomer.</p>
              </div>

              <div className="grid content-start gap-5">
                {douteux && !refus && atelier.detouree && (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Le détourage semble imparfait sur cette photo. Le fond flouté ou l’original amélioré donneront un résultat plus naturel.
                  </p>
                )}
                {!atelier.detouree && (
                  <p className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700">Détourage indisponible pour cette photo : fond flouté ou original amélioré.</p>
                )}
                <fieldset className="grid gap-2">
                  <legend className="mb-2 text-sm font-semibold">Fond</legend>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 md:grid-cols-3 lg:grid-cols-6">
                    {STYLES_PORTRAIT.map((s) => {
                      const indispo = styleDetoure(s.id) && !detourageOk;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          disabled={indispo || etat === 'envoi'}
                          onClick={() => setStyle(s.id)}
                          aria-pressed={style === s.id}
                          className={`grid gap-1 rounded-xl p-1.5 text-center text-xs font-medium ring-1 disabled:opacity-40 ${focus} ${style === s.id ? 'bg-teal-50 ring-2 ring-teal-700' : 'ring-neutral-200 hover:bg-neutral-50'}`}
                        >
                          <canvas ref={(el) => { vignettes.current[s.id] = el; }} width={96} height={120} className="aspect-[4/5] w-full rounded-lg bg-neutral-100" aria-hidden="true" />
                          <span className="min-h-8 leading-tight">{s.nom}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-neutral-600">{STYLES_PORTRAIT.find((s) => s.id === style)?.description} Les couleurs suivent celles du site.</p>
                </fieldset>

                <div className="grid gap-2 text-sm">
                  <label className="flex min-h-11 items-center gap-3">
                    <input type="checkbox" className="size-5 accent-teal-800" checked={retouche} onChange={(e) => setRetouche(e.target.checked)} />
                    Retouche automatique (lumière, couleurs, netteté)
                  </label>
                  <label className={`flex min-h-11 items-center gap-3 ${!detourageOk || !styleDetoure(style) ? 'opacity-50' : ''}`}>
                    <input type="checkbox" className="size-5 accent-teal-800" checked={ombre} disabled={!detourageOk || !styleDetoure(style)} onChange={(e) => setOmbre(e.target.checked)} />
                    Ombre douce derrière la silhouette
                  </label>
                  {atelier.detouree && (
                    <label className="flex min-h-11 items-center gap-3">
                      <input type="checkbox" className="size-5 accent-teal-800" checked={refus} onChange={(e) => { setRefus(e.target.checked); if (e.target.checked && styleDetoure(style)) setStyle('flou'); }} />
                      Ne pas utiliser le détourage
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-4 rounded-xl bg-neutral-50 p-3">
                  <canvas ref={pastille} width={128} height={128} className="size-16 shrink-0 rounded-full bg-neutral-200" aria-hidden="true" />
                  <p className="text-xs text-neutral-600">Aperçu de la pastille ronde (liste des praticiens). La fiche praticien utilise le format vertical.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
                  <button type="button" onClick={valider} disabled={etat === 'envoi'} className={`${bouton} bg-teal-800 text-white hover:bg-teal-900 disabled:opacity-60`}>
                    {etat === 'envoi' ? (message ?? 'Envoi…') : 'Utiliser ce portrait'}
                  </button>
                  <button type="button" onClick={() => entree.current?.click()} disabled={etat === 'envoi'} className={`${bouton} text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-50`}>
                    Autre photo
                  </button>
                  <input ref={entree} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) choisir(f); e.target.value = ''; }} />
                </div>
                <p className="text-xs text-neutral-500">Portrait fidèle : la retouche corrige la lumière et les couleurs, jamais les traits ni la peau. Les informations de localisation de la photo sont supprimées.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
