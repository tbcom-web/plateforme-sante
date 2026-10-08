'use client';

// Bloc focalisé (retour de Paul du 2026-10-08 : « la comparaison de tailles et casse est difficile avec autant de contenu ») :
// le SEUL contenu touché par le réglage (packages/core/src/focal.ts : blocFocal), rendu à la largeur réelle de l'appareil (iframe,
// CadreApercu) avec la même feuille que le site (cssHabillage), mêmes fond, largeur, police et couleurs pour A et B.
// ComparaisonFocale : A au-dessus de B (écart vertical), même alignement à gauche et même marge haute (lignes de base alignées) ;
// « Superposer » : A et B au même endroit, bascule instantanée (Espace, ou clic maintenu) ; « Règle » : graduations en marge.
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  attributsHabillage, cssHabillage, detailsPourCle, gamme, lireCleCombinaison, typoPourCle, graisseTitres, HABILLAGE_PAR_DEFAUT, modeleIntegre, normaliserHabillage, pairePolices, POLICES,
  tailleH1Focal, tailleH2Focal, variablesCharte, variablesGabarit, type BlocFocal as Bloc, type ReglagesDetails, type ReglagesTypo,
} from '@plateforme/core';
import CadreApercu from './CadreApercu';
import './polices-studio';
import '@fontsource-variable/inter';
import '@fontsource-variable/geist';

export type ReglagesFocal = { police: string; typo?: Partial<ReglagesTypo> | null; details?: Partial<ReglagesDetails> | null; gamme?: string | null; couleur?: string | null };

/** Réglages montrés par une clé de tuile (typo:<axe>:<v>, typo:police:<p>, typo:combinaison:<p>.<g>, details:<élément>:<v>) */
export function reglagesDeCle(cle: string): ReglagesFocal {
  const base = HABILLAGE_PAR_DEFAUT;
  const c = lireCleCombinaison(cle);
  if (c) return { police: c.police, typo: base.typo, gamme: c.gamme };
  if (cle.startsWith('details:')) return { police: 'didone', typo: base.typo, details: detailsPourCle(base.details, cle), gamme: 'cobalt-abricot' };
  const t = typoPourCle(base.typo, cle);
  return { police: t.police ?? 'didone', typo: t.typo, gamme: 'cobalt-abricot' };
}

const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

/** Hauteur du contenu (px de l'appareil) : le cadre est ajusté au bloc */
function hauteurBloc(bloc: Bloc, r: ReglagesFocal, mobile: boolean): number {
  const h1 = tailleH1Focal(r.typo, mobile, bloc.grand);
  const lignesH1 = mobile ? 3 : 2;
  const parElement: Record<string, number> = { surtitre: 34, h1: Math.round(h1 * 1.12 * lignesH1) + 14, h2: Math.round(tailleH2Focal(r.typo, mobile) * 1.2 * (mobile ? 2 : 1)) + 14, texte2: mobile ? 90 : 64, bouton: 70, paragraphe3: mobile ? 150 : 104, carte: mobile ? 330 : 300 };
  return (mobile ? 56 : 88) + bloc.elements.reduce((s, e) => s + (parElement[e] ?? 60), 0);
}

/** Le bloc seul, à la largeur réelle de l'appareil */
export default function BlocFocal({ bloc, reglages: r, mobile = false, regle = false, echelle = mobile ? 1 : 0.78 }: { bloc: Bloc; reglages: ReglagesFocal; mobile?: boolean; regle?: boolean; echelle?: number }) {
  const base = HABILLAGE_PAR_DEFAUT;
  const h = normaliserHabillage({ typo: { ...base.typo, ...(r.typo ?? {}) }, details: { ...base.details, ...(r.details ?? {}) } });
  const p = pairePolices(r.police) ?? pairePolices('didone')!;
  const g = gamme(r.gamme ?? '');
  const couleur = g?.accent ?? r.couleur ?? '#2d5bff';
  const m = modeleIntegre('tableau');
  const style = {
    ...variablesCharte(), ...variablesGabarit(m, { couleur, gamme: g?.id ?? null }),
    '--rayon': '18px', '--rayon-bouton': '999px', '--police-titres': (POLICES as Record<string, string>)[p.titres], '--police-texte': (POLICES as Record<string, string>)[p.texte],
    '--graisse-titres': String(graisseTitres(p.id, h.typo) ?? p.graisse),
    background: 'var(--g-page)', color: 'var(--g-encre)', fontFamily: 'var(--police-texte)', fontSize: mobile ? 17 : 18, lineHeight: 1.6, minHeight: '100vh', position: 'relative',
  } as CSSProperties;
  const titre: CSSProperties = { fontFamily: 'var(--police-titres)', fontWeight: 'var(--graisse-titres)' as unknown as number, margin: 0, lineHeight: 1.08, letterSpacing: '-0.02em' };
  const css = cssHabillage(h, { police: p.id, gabarit: 'tableau' });
  const contenu: Record<string, ReactNode> = {
    surtitre: <span key="s" className="td-sur" style={{ fontWeight: 600, fontSize: 16, color: 'var(--g-accent-texte)' }}>Pédicure-podologue · Lyon</span>,
    h1: <p key="h1" className="ap-h1" style={{ ...titre, fontSize: tailleH1Focal(h.typo, mobile, bloc.grand) }}>Cabinet de <span className="ap-mot">pédicurie-podologie</span> <span className="ap-pale">à Lyon</span></p>,
    h2: <h2 key="h2" className="ap-h2" style={{ ...titre, fontSize: tailleH2Focal(h.typo, mobile) }}>Une prise en charge du pied, à tout âge.</h2>,
    texte2: <p key="t" style={{ margin: 0, maxWidth: '34em', color: 'var(--g-encre-douce)' }}>Bilan podologique, semelles orthopédiques sur mesure et soins de pédicurie, pour toute la famille.</p>,
    bouton: <span key="b" className="td-bouton" style={{ justifySelf: 'start', display: 'inline-flex', alignItems: 'center', minHeight: 52, padding: '0 24px', borderRadius: 'var(--rayon-bouton)', background: 'var(--g-plein)', color: 'var(--g-plein-texte)', fontWeight: 650 }}>Prendre rendez-vous</span>,
    paragraphe3: <p key="p" style={{ margin: 0, maxWidth: '36em' }}>Chaque consultation commence par un échange et un examen de la marche et des appuis. Nous proposons ensuite des soins adaptés : semelles, conseils de chaussage, suivi régulier pour les pieds fragiles.</p>,
    carte: (
      <div key="c" className="eff-carte" style={{ maxWidth: 380, borderRadius: 'var(--rayon)', background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 1px var(--g-ligne)', overflow: 'hidden' }}>
        <div className="eff-visuel" style={{ aspectRatio: '16 / 9', background: 'var(--g-aplat)' }} />
        <div style={{ padding: 20 }}><strong style={{ fontFamily: 'var(--police-titres)', fontSize: 22 }}>Semelles orthopédiques</strong><p style={{ margin: '6px 0 0', color: 'var(--g-encre-douce)', fontSize: 16 }}>Examen, moulage et suivi.</p></div>
      </div>
    ),
  };
  const hauteur = Math.round(hauteurBloc(bloc, r, mobile) * echelle);
  return (
    <CadreApercu appareil={mobile ? 'mobile' : 'bureau'} hauteur={hauteur} titre={`Bloc ${mobile ? 'téléphone' : 'ordinateur'}`}>
      <div className="ap" {...attributsHabillage(h)} data-registre="ligne" style={style}>
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
        {regle && <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, backgroundImage: 'repeating-linear-gradient(to bottom, rgb(15 23 42 / .55) 0 1px, transparent 1px 8px), repeating-linear-gradient(to bottom, rgb(15 23 42 / .9) 0 1px, transparent 1px 40px)', backgroundSize: '6px 100%, 14px 100%', backgroundRepeat: 'no-repeat' }} />}
        <section className="ap-section eff-section" style={{ padding: mobile ? '28px 20px' : '44px 72px', display: 'grid', gap: 14, alignContent: 'start' }}>
          {bloc.elements.map((e) => contenu[e])}
        </section>
      </div>
    </CadreApercu>
  );
}

/** A et B : l'un au-dessus de l'autre, ou superposés (bascule instantanée) */
export function ComparaisonFocale({ bloc, a, b, mobile, regle, superposer }: { bloc: Bloc; a: ReglagesFocal; b: ReglagesFocal; mobile: boolean; regle: boolean; superposer: boolean }) {
  const [montreB, setMontreB] = useState(false);
  useEffect(() => {
    if (!superposer) return;
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== ' ' || (t && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(t.tagName))) return;
      e.preventDefault();
      setMontreB((x) => !x);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [superposer]);
  const etiquette = (l: string) => <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-800 text-sm font-bold text-white">{l}</span>;
  if (!superposer) {
    return (
      <div className="grid min-w-0 gap-3">
        {([['A', a], ['B', b]] as const).map(([l, r]) => (
          <figure key={l} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
            {etiquette(l)}
            <div className={`min-w-0 overflow-hidden ring-1 ring-black/10 ${mobile ? 'mx-auto w-full max-w-[400px] rounded-[18px]' : 'rounded-xl'}`}><BlocFocal bloc={bloc} reglages={r} mobile={mobile} regle={regle} /></div>
          </figure>
        ))}
      </div>
    );
  }
  return (
    <div className="grid min-w-0 gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onMouseDown={() => setMontreB(true)} onMouseUp={() => setMontreB(false)} onMouseLeave={() => setMontreB(false)} onTouchStart={() => setMontreB(true)} onTouchEnd={() => setMontreB(false)}
          onClick={(e) => e.preventDefault()} className={`min-h-11 rounded-lg border border-slate-300 bg-white px-3 font-semibold ${focus}`}>Maintenir pour voir B</button>
        <span className="text-neutral-600">ou touche Espace pour basculer</span>
        <span className="ml-auto flex items-center gap-2 font-semibold" aria-live="polite">{etiquette(montreB ? 'B' : 'A')} affiché</span>
      </div>
      <div className={`relative min-w-0 overflow-hidden ring-1 ring-black/10 ${mobile ? 'mx-auto w-full max-w-[400px] rounded-[18px]' : 'rounded-xl'}`}>
        <div style={{ visibility: montreB ? 'hidden' : 'visible' }}><BlocFocal bloc={bloc} reglages={a} mobile={mobile} regle={regle} /></div>
        <div style={{ position: 'absolute', inset: 0, visibility: montreB ? 'visible' : 'hidden' }}><BlocFocal bloc={bloc} reglages={b} mobile={mobile} regle={regle} /></div>
      </div>
    </div>
  );
}
