'use client';

// Spécimen d'une typographie ou d'un détail (tuiles « Typographies » et « Détails » de /admin/retours) : surtitre, titre, un
// intertitre, un paragraphe, un bouton, une carte illustrée et une citation, rendus à la largeur réelle de l'appareil (iframe,
// CadreApercu : ordinateur 1280 px, téléphone 390 px) avec la même feuille CSS que le site publié (cssHabillage) et les couleurs
// d'un gabarit de démonstration (tableau, gamme Cobalt & abricot). Le texte reste en casse normale dans le source.
import type { CSSProperties } from 'react';
import {
  attributsHabillage, cssHabillage, detailsPourCle, gamme, modeleIntegre, normaliserHabillage, pairePolices, POLICES, typoPourCle,
  variablesCharte, variablesGabarit, HABILLAGE_PAR_DEFAUT, graisseTitres, facteurChasse, facteurTitres,
} from '@plateforme/core';
import CadreApercu from './CadreApercu';
import './polices-studio';
import '@fontsource-variable/inter';
import '@fontsource-variable/geist';

export default function SpecimenHabillage({ cle, mobile = false, vignette }: { cle: string; mobile?: boolean; vignette?: number }) {
  const [type] = cle.split(':');
  const base = HABILLAGE_PAR_DEFAUT;
  const t = type === 'typo' ? typoPourCle(base.typo, cle) : { typo: base.typo };
  const police = t.police ?? 'didone';
  const h = normaliserHabillage({ typo: t.typo, details: type === 'details' ? detailsPourCle(base.details, cle) : base.details });
  const p = pairePolices(police)!;
  const m = modeleIntegre('tableau');
  const g = gamme('cobalt-abricot');
  const style = {
    ...variablesCharte(), ...variablesGabarit(m, { couleur: g?.accent ?? '#2d5bff', gamme: g?.id ?? null }),
    '--rayon': '18px', '--rayon-bouton': '999px', '--police-titres': (POLICES as Record<string, string>)[p.titres], '--police-texte': (POLICES as Record<string, string>)[p.texte],
    '--graisse-titres': String(graisseTitres(police, h.typo) ?? p.graisse), '--mot-long': String(Math.round(20 * facteurChasse(h.typo))),
    background: 'var(--g-page)', color: 'var(--g-encre)', fontFamily: 'var(--police-texte)', fontSize: mobile ? 17 : 18, lineHeight: 1.6, minHeight: '100vh',
  } as CSSProperties;
  const titre: CSSProperties = { fontFamily: 'var(--police-titres)', fontWeight: 'var(--graisse-titres)' as unknown as number, margin: 0, lineHeight: 1.08, letterSpacing: '-0.02em' };
  const taille = Math.min(mobile ? 40 : 72, (mobile ? 330 : 1100) / (20 * 0.58 * facteurChasse(h.typo))) * facteurTitres(h.typo);
  const css = cssHabillage(h, { police, gabarit: 'tableau' });
  return (
    <CadreApercu appareil={mobile ? 'mobile' : 'bureau'} vignette={vignette} titre={`Spécimen ${mobile ? 'téléphone' : 'ordinateur'}`}>
      <div className="ap" {...attributsHabillage(h)} data-registre="ligne" style={style}>
        {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
        <section className="ap-section eff-section" style={{ padding: mobile ? '36px 20px' : '64px 72px' }}>
          <div className="td-tete" style={{ display: 'grid', gap: 14, maxWidth: 980 }}>
            <span className="td-sur" style={{ fontWeight: 600, fontSize: 16, color: 'var(--g-accent-texte)' }}>Pédicure-podologue · Lyon</span>
            <p className="ap-h1" style={{ ...titre, fontSize: taille }}>Cabinet de pédicurie-podologie <span className="ap-pale">à Lyon</span></p>
            <p style={{ margin: 0, maxWidth: '34em', color: 'var(--g-encre-douce)' }}>Bilan podologique, semelles orthopédiques sur mesure et soins de pédicurie, pour toute la famille, sur rendez-vous.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <span className="td-bouton" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 52, padding: '0 24px', borderRadius: 'var(--rayon-bouton)', background: 'var(--g-plein)', color: 'var(--g-plein-texte)', fontWeight: 650 }}>Prendre rendez-vous</span>
              <span className="g-bulle" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 16px', borderRadius: 999, background: 'var(--g-bulle)', color: 'var(--g-bulle-texte)', fontWeight: 600, fontSize: 15 }}>Semelles</span>
            </div>
          </div>
        </section>
        <section className="ap-section eff-section" style={{ padding: mobile ? '36px 20px' : '56px 72px' }}>
          <div className="td-tete" style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
            <span className="td-sur" style={{ fontWeight: 600, fontSize: 16, color: 'var(--g-accent-texte)' }}>Nos soins</span>
            <h2 className="ap-h2" style={{ ...titre, fontSize: mobile ? 30 : 42 }}>Une prise en charge du pied, à tout âge.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 22, alignItems: 'start' }}>
            <div className="eff-carte" style={{ borderRadius: 'var(--rayon)', background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 1px var(--g-ligne)', overflow: 'hidden' }}>
              <div className="eff-visuel" style={{ aspectRatio: '16 / 9', background: 'var(--g-aplat)' }} />
              <div style={{ padding: 20 }}><strong style={{ fontFamily: 'var(--police-titres)', fontSize: 22 }}>Semelles orthopédiques</strong><p style={{ margin: '6px 0 0', color: 'var(--g-encre-douce)', fontSize: 16 }}>Examen, moulage et suivi.</p></div>
            </div>
            <blockquote className="td-encadre" style={{ margin: 0, padding: 22, borderRadius: 'var(--rayon)', background: 'var(--g-doux)' }}>Consultez dès qu’une douleur au pied gêne la marche ou le sport : un bilan suffit souvent à soulager.</blockquote>
          </div>
        </section>
      </div>
    </CadreApercu>
  );
}
