'use client';

// Aperçu des gabarits autres que « classique » (tableau, village : packages/core/src/modeles.ts, GABARITS), rendu par
// ApercuTheme : mêmes règles que le générateur (apps/sites/src/components/gabarits/*) — premier écran « bento » ou « plan »,
// soins en bulles ou en liste, informations pratiques, questions en accordéon — et mêmes couleurs dérivées de la couleur du
// cabinet avec garde-fous de contraste (couleursGabarit). Le plan est ici schématique (le site publié dessine les vraies rues
// d'OpenStreetMap au build).
import type { CSSProperties, ReactNode } from 'react';
import { gabaritModele, pictoSoin, svgDessin, svgPicto, type ModeleManifeste, type NomDessin, type SiteDraft } from '@plateforme/core';
import type { SoinCatalogue } from '@/lib/sites';

type Props = {
  draft: SiteDraft;
  modele: ModeleManifeste;
  soins: SoinCatalogue[];
  mobile: boolean;
  vue: 'accueil' | 'soin';
  marque: ReactNode;
  nomCabinet: string;
  titre: string;
  ville: string;
  /** Dessin d'un soin (jeu visuel de la spécialité) */
  dessinSoin: (slug: string) => NomDessin;
};

const PUBLICS: [RegExp, string][] = [[/enfant/, 'Enfants'], [/sport/, 'Sportifs'], [/diab/, 'Diabétiques'], [/senior|chute/, 'Seniors']];

export default function ApercuGabarit({ draft: d, modele: m, soins, mobile, vue, marque, nomCabinet, titre, ville, dessinSoin }: Props) {
  const village = gabaritModele(m) === 'village';
  const lieu = d.lieux[0];
  const tel = d.cabinet.telephone || '00 00 00 00 00';
  const enLigne = d.rdv.mode !== 'telephone';
  const noms = d.praticiens.map((p) => [p.prenom, p.nom].filter(Boolean).join(' ')).filter(Boolean);
  const phrase = noms.length ? `${noms.join(' et ')}, ${titre.toLowerCase()}${noms.length > 1 ? 's' : ''}, ${noms.length > 1 ? 'accueillent leurs' : 'accueille ses'} patients à ${ville}.` : `Votre cabinet à ${ville}.`;
  const adresse = `${lieu?.adresse || 'Adresse du cabinet'}, ${lieu?.codePostal ?? ''} ${lieu?.ville || ville}`;
  const horaires = lieu?.horaires ?? [];
  const jour = horaires[0];
  const pourQui = soins.flatMap((s) => { const p = PUBLICS.find(([re]) => re.test(s.slug)); return p ? [p[1]] : []; });
  const picto = (slug: string, taille = 24) => <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center' }} dangerouslySetInnerHTML={{ __html: svgPicto(pictoSoin(slug) ?? 'pied-dessus', { taille }) ?? '' }} />;
  const carte: CSSProperties = village ? { background: 'var(--g-doux)', borderRadius: 'var(--rayon)', padding: mobile ? 22 : 30 } : { background: 'var(--g-carte)', borderRadius: 'var(--rayon)', padding: mobile ? 22 : 32, boxShadow: 'inset 0 0 0 1px var(--g-ligne)' };
  const bouton = (plein: boolean): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 52, padding: '0 22px', borderRadius: 'var(--rayon-bouton)', fontWeight: 650, fontSize: 16, background: plein ? 'var(--g-plein)' : 'var(--g-carte)', color: plein ? 'var(--g-plein-texte)' : 'var(--g-encre)', boxShadow: `inset 0 0 0 2px ${plein ? 'var(--g-plein-bord)' : 'var(--g-ligne)'}` });
  const bulle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '6px 18px 6px 8px', borderRadius: 999, background: 'var(--g-bulle)', color: 'var(--g-bulle-texte)', fontWeight: 600, fontSize: 16 };
  const rond: CSSProperties = { width: 34, height: 34, borderRadius: '50%', background: 'var(--g-carte)', color: 'var(--g-encre)', display: 'grid', placeItems: 'center' };
  const cadre: CSSProperties = { width: `min(${village ? 880 : 1180}px, 100% - ${village ? 40 : 32}px)`, marginInline: 'auto' };
  const h1: CSSProperties = { fontSize: mobile ? 40 : village ? 56 : 60, lineHeight: 1.1, letterSpacing: village ? '-0.015em' : '-0.035em' };
  const h2: CSSProperties = { fontSize: mobile ? 30 : 40, lineHeight: 1.15 };
  const sur: CSSProperties = { fontWeight: 600, color: 'var(--g-accent-texte)', margin: '0 0 10px', fontSize: 16 };
  const plan = (
    <div style={{ aspectRatio: '4 / 3', borderRadius: 'var(--rayon)', background: 'var(--g-plan-fond)', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 12, boxShadow: 'inset 0 0 0 1px var(--g-ligne)' }}>
      <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--g-plan-point)', boxShadow: '0 0 0 6px var(--g-plan-rue)' }} />
      <span style={{ fontWeight: 650, textAlign: 'center' }}>{lieu?.adresse || 'Adresse du cabinet'}<br />{lieu?.codePostal} {lieu?.ville || ville}</span>
      <span style={{ fontSize: 13, color: 'var(--g-encre-douce)' }}>Plan schématique (rues réelles sur le site publié)</span>
    </div>
  );
  const titreH1 = <h1 className="ap-h1" style={h1}>Cabinet de {d.pays === 'FR' ? 'pédicurie-podologie' : 'podologie'} à {ville}</h1>;

  const entete = (
    <header style={{ padding: '12px 0 4px', borderBottom: village ? '1px solid var(--g-ligne)' : undefined }}>
      <div style={{ ...cadre, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 64, ...(village ? {} : { background: 'var(--g-carte)', borderRadius: 999, padding: '8px 8px 8px 14px', boxShadow: 'inset 0 0 0 1px var(--g-ligne)' }) }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{marque}<strong style={{ fontFamily: 'var(--police-titres)', fontSize: 18 }}>{nomCabinet}</strong></span>
        {!mobile && !village && <span style={{ display: 'flex', gap: 22, fontWeight: 600, fontSize: 15 }}>{['Soins', 'Le cabinet', 'Accès'].map((l) => <span key={l}>{l}</span>)}</span>}
        {village ? <span style={{ fontWeight: 750, fontSize: 20 }}>☏ {mobile ? 'Appeler' : tel}</span> : !mobile && <span style={{ ...bouton(true), minHeight: 46, background: 'var(--g-vif)', color: 'var(--g-vif-texte)', boxShadow: 'none' }}>{enLigne ? 'Rendez-vous' : 'Appeler'}</span>}
      </div>
      {(village || mobile) && <nav style={{ ...cadre, display: 'flex', flexWrap: 'wrap', gap: village ? '4px 20px' : 6, padding: '10px 0 8px' }}>{['Soins', 'Le cabinet', 'Accès'].map((l) => <span key={l} style={village ? { textDecoration: 'underline', fontWeight: 600 } : { padding: '10px 12px', borderRadius: 999, background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 1px var(--g-ligne)', fontWeight: 600, fontSize: 15 }}>{l}</span>)}</nav>}
    </header>
  );

  // Premier écran (règles de clarté) : qui, où, soins principaux, Rendez-vous / Appeler ; tableau = carte en aplat de la couleur
  // du cabinet et illustration sur fond « duo » ; village = notice (lignes) et deux gros boutons.
  const pid = (id: string) => <span aria-hidden="true" style={{ color: 'var(--g-accent-texte)', display: 'grid' }} dangerouslySetInnerHTML={{ __html: svgPicto(id, { taille: 26 }) ?? '' }} />;
  const ligne: CSSProperties = { display: 'grid', gridTemplateColumns: '30px 1fr', gap: 12, alignItems: 'start' };
  const principaux = soins.slice(0, 3).map((s) => s.titre_court.toLowerCase()).join(', ');
  const premier = village ? (
    <section style={{ background: 'var(--g-aplat)' }}><div style={{ ...cadre, display: 'grid', gap: 18, paddingBlock: mobile ? 28 : 48 }}>
      {titreH1}
      <div style={{ display: 'grid', gap: 8 }}>
        <span style={ligne}>{pid('rendez-vous')}{noms.length ? `${noms.join(' et ')}, ${titre.toLowerCase()}` : 'Vos praticiens'}</span>
        <span style={ligne}>{pid('itineraire')}{adresse}</span>
        {principaux && <span style={ligne}>{pid('bilan')}{principaux.charAt(0).toUpperCase() + principaux.slice(1)}.</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <span style={{ display: 'grid', placeItems: 'center', minHeight: 64, borderRadius: 'var(--rayon)', background: 'var(--g-plein)', color: 'var(--g-plein-texte)', fontWeight: 700 }}>{enLigne ? 'Prendre rendez-vous' : 'Appeler le cabinet'}</span>
        {enLigne && <span style={{ display: 'grid', placeItems: 'center', minHeight: 64, borderRadius: 'var(--rayon)', background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 2px var(--g-encre)', fontWeight: 700 }}>Appeler le {tel}</span>}
      </div>
    </div></section>
  ) : (
    <section style={{ ...cadre, display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.45fr 1fr', gap: 16, paddingTop: 14 }}>
      <div style={{ borderRadius: 'var(--rayon)', background: mobile ? 'var(--g-aplat)' : 'var(--g-carte)', boxShadow: mobile ? 'none' : 'inset 0 0 0 1px var(--g-ligne)', color: 'var(--g-encre)', padding: mobile ? 26 : 48, display: 'grid', gap: 16, justifyItems: 'start' }}>
        <span style={{ padding: '6px 14px', borderRadius: 999, background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 1px var(--g-ligne)', fontSize: 14, fontWeight: 600 }}>● {titre} · {ville}</span>
        <h1 className="ap-h1" style={h1}>Cabinet de {d.pays === 'FR' ? 'pédicurie-podologie' : 'podologie'} à {ville}</h1>
        <span style={{ fontWeight: 600 }}>{noms.join(' et ') || 'Vos praticiens'} · {lieu?.adresse || 'Adresse du cabinet'}</span>
        {principaux && <span style={{ color: mobile ? 'var(--g-aplat-doux)' : 'var(--g-encre-douce)' }}>{principaux.charAt(0).toUpperCase() + principaux.slice(1)}.</span>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <span style={bouton(true)}>{enLigne ? 'Prendre rendez-vous' : 'Appeler le cabinet'}</span>
          {enLigne && <span style={bouton(false)}>{tel}</span>}
        </div>
      </div>
      {!mobile && soins[0] && (
        <div style={{ borderRadius: 'var(--rayon)', background: 'var(--g-vif)', display: 'grid', placeItems: 'center', '--dessin-trait': 'var(--g-vif-texte)', '--dessin-accent': 'var(--g-vif-texte)' } as CSSProperties}><div className="ap-svg" style={{ width: '72%', height: '80%' }} dangerouslySetInnerHTML={{ __html: svgDessin(dessinSoin(soins[0].slug), { registre: 'ligne' }) }} /></div>
      )}
    </section>
  );

  const section = (titreSection: string, contenu: ReactNode, fond?: string) => (
    <section style={village ? { borderTop: '1px solid var(--g-ligne)', padding: `${mobile ? 44 : 60}px 0`, background: fond } : { ...cadre, paddingTop: 14 }}>
      <div style={village ? cadre : { ...carte, padding: mobile ? 26 : 48 }}>
        <h2 className="ap-h2" style={{ ...h2, marginBottom: 24 }}>{titreSection}</h2>
        {contenu}
      </div>
    </section>
  );
  const infos = ['Horaires', 'Accès', ...(d.domicile?.actif ? ['Visites à domicile'] : [])];
  const rangee = (etiquette: string, bulles: { cle: string; texte: string; picto?: string }[], fondBulle: string, texte: string) => (
    <div style={{ display: 'grid', gap: 10 }}>
      <span style={{ fontWeight: 650, fontSize: village ? 14 : 15, color: village ? 'var(--g-encre)' : 'var(--g-encre-douce)', letterSpacing: village ? '0.08em' : 0, textTransform: village ? 'uppercase' : 'none' }}>{etiquette}</span>
      <div style={village ? { display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 10 } : { display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {bulles.map((b) => (
          <span key={b.cle} style={village ? { display: 'flex', alignItems: 'center', gap: 10, minHeight: 58, padding: '8px 14px 8px 10px', borderRadius: 10, background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 2px var(--g-ligne)', fontWeight: 600 } : { ...bulle, background: fondBulle, color: texte }}>
            <span style={{ ...rond, background: village ? fondBulle : 'var(--g-carte)', color: texte, borderRadius: village ? 8 : '50%' }}>{b.picto ? picto(b.picto) : '●'}</span>{b.texte}
          </span>
        ))}
      </div>
    </div>
  );
  const soinsSection = section('Une prise en charge du pied, à tout âge.', (
    <div style={{ display: 'grid', gap: 22 }}>
      {rangee('Soins', soins.map((s) => ({ cle: s.slug, texte: s.titre_court, picto: s.slug })), 'var(--g-bulle)', 'var(--g-bulle-texte)')}
      {pourQui.length >= 2 && rangee('Pour qui', pourQui.map((p) => ({ cle: p, texte: p })), 'var(--g-duo-bulle)', 'var(--g-duo-texte)')}
      {rangee('Infos pratiques', infos.map((i) => ({ cle: i, texte: i })), 'var(--g-doux)', 'var(--g-encre)')}
    </div>
  ));
  const horairesTable = (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}><tbody>{horaires.map((h, k) => <tr key={h.jour} style={{ borderBottom: '1px solid var(--g-ligne)', background: k === 0 ? 'var(--g-bulle)' : undefined }}><th style={{ textAlign: 'left', padding: '8px 10px' }}>{h.jour}</th><td style={{ padding: '8px 0', color: h.heures ? 'var(--g-encre)' : 'var(--g-encre-douce)' }}>{h.heures || 'Fermé'}</td></tr>)}</tbody></table>
  );
  const volets = ['Prise de rendez-vous', 'Transports et stationnement', 'Tarifs', 'Moyens de règlement acceptés'];
  const accesSection = section('Venir au cabinet.', (
    <div style={{ display: 'grid', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: mobile || village ? '1fr' : '1.1fr 0.9fr', gap: 28 }}>
        {horairesTable}
        <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}><strong>Adresse</strong><span>{adresse}</span><span style={{ color: 'var(--g-accent-texte)', fontWeight: 650 }}>{tel} · Itinéraire</span>{village && plan}</div>
      </div>
      <div>{volets.map((v) => <div key={v} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 56, borderBottom: '1px solid var(--g-ligne)', fontWeight: 650 }}>{v}<span style={{ ...rond, background: 'var(--g-bulle)', color: 'var(--g-bulle-texte)' }}>+</span></div>)}</div>
    </div>
  ));
  const faqSection = section('Bon à savoir avant de venir.', (
    <div style={{ display: 'grid', gap: 10, maxWidth: 820 }}>{['Comment prendre rendez-vous ?', 'Les consultations sont-elles remboursées ?'].map((q) => <div key={q} style={{ padding: '18px 22px', borderRadius: 'var(--rayon)', background: village ? 'var(--g-doux)' : 'var(--g-carte)', boxShadow: village ? 'none' : 'inset 0 0 0 1px var(--g-ligne)', display: 'flex', justifyContent: 'space-between', fontWeight: 650 }}>{q}<span style={{ ...rond, background: 'var(--g-bulle)', color: 'var(--g-bulle-texte)' }}>+</span></div>)}</div>
  ));


  const fiche = soins[0] && (
    <>
      <section style={{ ...cadre, paddingTop: 20 }}>
        <div style={{ ...(village ? { padding: '32px 0 0' } : carte), display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.15fr 0.85fr', gap: 28, alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: 14 }}>
            <p style={{ fontSize: 14, color: 'var(--g-encre-douce)', margin: 0 }}>Accueil / Compétences / {soins[0].titre_court}</p>
            <p style={sur}>Compétences du cabinet</p>
            <h1 className="ap-h1" style={{ ...h1, fontSize: mobile ? 36 : 52 }}>{soins[0].titre?.replace('{ville}', ville) ?? soins[0].titre_court}</h1>
            <p style={{ color: 'var(--g-encre-douce)', margin: 0 }}>{soins[0].resume}</p>
            <span style={{ ...bouton(true), justifySelf: 'start' }}>{enLigne ? 'Prendre rendez-vous' : 'Appeler le cabinet'}</span>
          </div>
          <div style={{ aspectRatio: '4 / 3', borderRadius: 16, background: 'var(--g-doux)', display: 'grid', placeItems: 'center', '--dessin-trait': 'var(--g-encre)', '--dessin-accent': 'var(--g-accent-texte)' } as CSSProperties}><div className="ap-svg" style={{ width: '78%', height: '86%' }} dangerouslySetInnerHTML={{ __html: svgDessin(dessinSoin(soins[0].slug), { registre: village ? 'pedagogique' : 'ligne' }) }} /></div>
        </div>
      </section>
      <section style={{ ...cadre, display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 300px', gap: 18, paddingTop: 18 }}>
        <div style={{ ...carte, ...(village ? { background: 'transparent', padding: 0 } : {}) }}><h2 className="ap-h2" style={{ fontSize: 28 }}>Déroulement de la séance</h2><p style={{ color: 'var(--g-encre-douce)' }}>{(soins[0].corps ?? soins[0].resume).replace(/\{ville\}/g, ville).replace(/[#*_>]/g, '').slice(0, 420)}…</p></div>
        <div style={{ ...carte, background: 'var(--g-doux)', boxShadow: 'none', display: 'grid', gap: 12, alignContent: 'start' }}><strong style={{ color: 'var(--g-accent-texte)' }}>En pratique</strong><span style={{ fontSize: 15 }}>{adresse}</span><span style={bouton(true)}>{enLigne ? 'Prendre rendez-vous' : 'Appeler'}</span></div>
      </section>
    </>
  );

  return (
    <div style={{ background: 'var(--g-page)', color: 'var(--g-encre)', fontSize: village ? 20 : 18, lineHeight: 1.6, paddingBottom: 1 }}>
      {entete}
      {vue === 'accueil' ? <>{premier}{soinsSection}{accesSection}{faqSection}</> : fiche}
      <footer style={{ marginTop: 64, padding: '44px 0 28px', background: village ? 'var(--g-doux)' : 'var(--g-sombre)', color: village ? 'var(--g-encre-douce)' : 'var(--g-sombre-doux)', borderTop: village ? '2px solid var(--g-encre)' : undefined }}>
        <div style={cadre}><strong style={{ color: village ? 'var(--g-encre)' : 'var(--g-sombre-texte)' }}>{nomCabinet}</strong><p style={{ margin: '8px 0 0', fontSize: 15 }}>{adresse} · {tel}</p><p style={{ margin: '20px 0 0', fontSize: 13 }}>Illustrations : représentations schématiques, sans valeur de mesure</p></div>
      </footer>
    </div>
  );
}
