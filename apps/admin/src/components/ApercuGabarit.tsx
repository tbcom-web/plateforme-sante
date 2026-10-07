'use client';

// Aperçu des gabarits autres que « classique » (tableau, village, revue : packages/core/src/modeles.ts, GABARITS), rendu par
// ApercuTheme : mêmes règles que le générateur (apps/sites/src/components/gabarits/*) — premier écran « bento » ou « plan »,
// soins en bulles ou en liste, informations pratiques, questions en accordéon — et mêmes couleurs dérivées de la couleur du
// cabinet avec garde-fous de contraste (couleursGabarit). Le plan est ici schématique (le site publié dessine les vraies rues
// d'OpenStreetMap au build). Revue : filet double, premier écran sur l'aplat pastel avec un dessin au trait légendé, sections en
// colonnes de journal (chiffre romain et titre à gauche), bulles à filet, Bodoni Moda et Newsreader.
// Informations manquantes : replis du site publié (replisApercu, calculés par ApercuTheme) ; aucune valeur fictive.
// Retours de l'atelier du 2026-10-07 (comme le site) : tableau = une seule grande illustration dans le disque, bien détaché du
// texte ; soins en cartes éditoriales (grande illustration du soin, titre fort), infos pratiques en liens texte, plus de
// bulles à picto « façon annuaire » ; village = aplat tramé, titre expressif, illustration en cadre portrait sur ombre pleine ;
// « pédicurie-podologie » insécable, titre ajusté à sa colonne.
import type { CSSProperties, ReactNode } from 'react';
import { avecVille, construireNavigation, horairesRenseignes, gabaritModele, pictoSoin, svgDessin, svgPicto, svgLigne, LIGNE_DESSIN, REPLIS, titreSoins, type ModeleManifeste, type NomDessin, type Registre, type ReplisApercu, type SiteDraft } from '@plateforme/core';
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
  /** Textes après replis (ville, adresse, téléphone, rendez-vous), mêmes règles que le site */
  replis: ReplisApercu;
  /** Dessin d'un soin (jeu visuel de la spécialité) */
  dessinSoin: (slug: string) => NomDessin;
  /** Visuel du sujet n° 1 au premier écran (comme le site : PremierEcran), sinon le dessin du premier soin */
  heros?: HerosApercu | null;
  /** Registre des dessins du site (illustrations des cartes de soins) */
  registre?: Registre;
};

/** Longueur du plus long mot insécable d'un titre (« pédicurie-podologie », ville composée) : taille du titre (lib/typo.mjs) */
const motLePlusLong = (t: string) => Math.max(0, ...t.split(/[\s,.;:!?()«»]+/).map((x) => [...x].length));
/** Taille d'un titre pour que son plus long mot tienne sur `largeur` px (jamais « pédicurie- / podologie », règle de Paul) */
export const tailleTitre = (titre: string, largeur: number, base: number, ratio = 0.6) => Math.min(base, Math.floor(largeur / (Math.max(10, motLePlusLong(titre)) * ratio)));


/** Visuel du sujet n° 1 (calculé par ApercuTheme) : illustration composée (SVG) ou photo du sujet */
export type HerosApercu = { type: 'svg'; html: string; sombre: boolean } | { type: 'photo'; src: string };

/** Héros du sujet n° 1 : SVG composé (fond plan dans le dessin en relevé) ou photo teintée */
export function HerosVue({ h, rayon = 0 }: { h: HerosApercu; rayon?: number | string }) {
  if (h.type === 'photo') {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: rayon, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={h.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <span style={{ position: 'absolute', inset: 0, background: 'var(--g-vif, var(--accent))', mixBlendMode: 'multiply', opacity: 0.16 }} />
      </div>
    );
  }
  return <div className="ap-svg" style={{ width: '100%', height: '100%', borderRadius: rayon, overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: h.html }} />;
}

const PUBLICS: [RegExp, string][] = [[/enfant/, 'Enfants'], [/sport/, 'Sportifs'], [/diab/, 'Diabétiques'], [/senior|chute/, 'Seniors']];

export default function ApercuGabarit({ draft: d, modele: m, soins, mobile, vue, marque, nomCabinet, titre, replis: r, dessinSoin, heros = null, registre = 'ligne' }: Props) {
  const village = gabaritModele(m) === 'village';
  const revue = gabaritModele(m) === 'revue';
  const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  let folio = 0;
  const lieu = d.lieux[0];
  const ville = r.ville;
  const suffixeVille = r.aVille ? ` ${r.aVille}` : '';
  const tel = r.telephone;
  const enLigne = r.rdvEnLigne;
  const libelleRdv = enLigne ? 'Prendre rendez-vous' : r.libelleContact;
  const surTitre = [titre, ville].filter(Boolean).join(' · ');
  // Menu calculé comme sur le site (themes.ts, construireNavigation) : sujets principaux, Soins, Le cabinet, Infos pratiques
  const navigation = construireNavigation(d, soins);
  const menu = (mobile ? navigation.menuMobile : navigation.menu).map((l) => l.libelle);
  const noms = r.noms;
  const qui = noms.join(' et ') || nomCabinet;
  // Ligne courte « qui · où » (comme PremierEcran du site) : sans adresse complète, le nom seul
  const quiOu = r.aAdresse ? `${qui} · ${r.rue}` : qui;
  const adresse = r.adresse;
  const horaires = lieu?.horaires ?? [];
  const jour = horaires[0];
  const pourQui = soins.flatMap((s) => { const p = PUBLICS.find(([re]) => re.test(s.slug)); return p ? [p[1]] : []; });
  const picto = (slug: string, taille = 24) => <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center' }} dangerouslySetInnerHTML={{ __html: svgPicto(pictoSoin(slug) ?? 'pied-dessus', { taille }) ?? '' }} />;
  const carte: CSSProperties = revue ? { padding: 0 } : village ? { background: 'var(--g-doux)', borderRadius: 'var(--rayon)', padding: mobile ? 22 : 30 } : { background: 'var(--g-carte)', borderRadius: 'var(--rayon)', padding: mobile ? 22 : 32, boxShadow: 'inset 0 0 0 1px var(--g-ligne)' };
  const bouton = (plein: boolean): CSSProperties => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 52, padding: '0 22px', borderRadius: 'var(--rayon-bouton)', fontWeight: 650, fontSize: 16, background: plein ? 'var(--g-plein)' : 'var(--g-carte)', color: plein ? 'var(--g-plein-texte)' : 'var(--g-encre)', boxShadow: `inset 0 0 0 2px ${plein ? 'var(--g-plein-bord)' : 'var(--g-ligne)'}` });
  const bulle: CSSProperties = revue
    ? { display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '6px 20px 6px 12px', borderRadius: 999, background: 'transparent', color: 'var(--g-encre)', fontWeight: 400, fontSize: 18, boxShadow: 'inset 0 0 0 1px var(--g-ligne)' }
    : { display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '6px 18px 6px 8px', borderRadius: 999, background: 'var(--g-bulle)', color: 'var(--g-bulle-texte)', fontWeight: 600, fontSize: 16 };
  const rond: CSSProperties = { width: 34, height: 34, borderRadius: '50%', background: 'var(--g-carte)', color: 'var(--g-encre)', display: 'grid', placeItems: 'center' };
  const cadre: CSSProperties = { width: `min(${village ? 880 : revue ? 1120 : 1180}px, 100% - ${village ? 40 : revue && !mobile ? 64 : 32}px)`, marginInline: 'auto' };
  const h1: CSSProperties = revue ? { fontSize: mobile ? 40 : 66, lineHeight: 1.04, letterSpacing: '-0.01em', fontWeight: 500 } : { fontSize: mobile ? 40 : village ? 64 : 60, lineHeight: village ? 1.04 : 1.1, letterSpacing: village ? '-0.03em' : '-0.035em' };
  const h2: CSSProperties = revue ? { fontSize: mobile ? 28 : 34, lineHeight: 1.12, fontWeight: 500 } : { fontSize: mobile ? 30 : 40, lineHeight: 1.15 };
  const sur: CSSProperties = { fontWeight: 600, color: 'var(--g-accent-texte)', margin: '0 0 10px', fontSize: 16 };
  const plan = (
    <div style={{ aspectRatio: '4 / 3', borderRadius: 'var(--rayon)', background: 'var(--g-plan-fond)', display: 'grid', placeItems: 'center', alignContent: 'center', gap: 12, boxShadow: 'inset 0 0 0 1px var(--g-ligne)' }}>
      <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--g-plan-point)', boxShadow: '0 0 0 6px var(--g-plan-rue)' }} />
      <span style={{ fontWeight: 650, textAlign: 'center' }}>{r.rue}<br />{lieu?.codePostal} {lieu?.ville}</span>
      <span style={{ fontSize: 13, color: 'var(--g-encre-douce)' }}>Plan schématique (rues réelles sur le site publié)</span>
    </div>
  );
  // Titre du site (pas de <h1> : l'aperçu est inclus dans une page de l'admin qui a le sien)
  const metier = d.pays === 'FR' ? 'pédicurie-podologie' : 'podologie';
  // Largeur de la colonne du titre (premier écran) : le plus long mot insécable y tient toujours sur une ligne
  const colonneTitre = mobile ? 390 - 40 - (village ? 0 : 52) : revue ? 1120 * 0.6 : village ? 880 * 0.56 : 1180 * 0.52 - 96;
  const tailleH1 = tailleTitre(`Cabinet de ${metier} ${r.aVille ?? ''}`, colonneTitre, (h1.fontSize as number) ?? 60, revue ? 0.52 : 0.6);
  const titreH1 = <p className="ap-h1" style={{ ...h1, fontSize: tailleH1, margin: 0 }}>Cabinet de <span className="ap-mot">{metier}</span>{r.aVille && <> {revue ? <em style={{ color: 'var(--g-accent-texte)' }}>{r.aVille}</em> : village ? <span style={{ color: 'var(--g-accent-texte)' }}>{r.aVille}</span> : r.aVille}</>}</p>;
  // Menu et bouton sur une ligne : un nom de cabinet long se réduit, jamais « Rendez-/vous » sur deux lignes
  const nomEntete: CSSProperties = { minWidth: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.2, fontSize: nomCabinet.length > 40 ? 16 : 18 };
  // Revue : dessin au trait continu du soin principal, légendé (sans animation)
  const figure = (slug: string, taille: CSSProperties) => <div className="ap-svg" style={{ ...taille, '--dessin-trait': 'var(--g-figure)', '--dessin-ligne': 'var(--g-figure)', '--dessin-accent': 'var(--g-figure)', color: 'var(--g-figure)' } as CSSProperties} dangerouslySetInnerHTML={{ __html: svgLigne(LIGNE_DESSIN[dessinSoin(slug)] ?? 'pied-dessous') }} />;

  const entete = revue ? (
    <header style={{ borderBottom: '3px double var(--g-encre)' }}>
      <div style={{ ...cadre, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 76 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>{marque}<strong style={{ fontFamily: 'var(--police-titres)', fontStyle: 'italic', fontWeight: 500, ...nomEntete, fontSize: nomCabinet.length > 40 ? 17 : 20 }}>{nomCabinet}</strong></span>
        {!mobile && <span style={{ display: 'flex', alignItems: 'center', gap: 26, fontSize: 17, whiteSpace: 'nowrap', flexShrink: 0 }}>{menu.map((l) => <span key={l}>{l}</span>)}<span style={{ ...bouton(true), minHeight: 46, background: 'var(--g-vif)', color: 'var(--g-vif-texte)', boxShadow: 'none', whiteSpace: 'nowrap' }}>{r.libelleMenu}</span></span>}
      </div>
      {mobile && <nav style={{ ...cadre, display: 'flex', justifyContent: 'space-between', padding: '4px 0 10px' }}>{menu.map((l) => <span key={l}>{l}</span>)}</nav>}
    </header>
  ) : (
    <header style={{ padding: '12px 0 4px', borderBottom: village ? '1px solid var(--g-ligne)' : undefined }}>
      <div style={{ ...cadre, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 64, ...(village ? {} : { background: 'var(--g-carte)', borderRadius: 999, padding: '8px 8px 8px 14px', boxShadow: 'inset 0 0 0 1px var(--g-ligne)' }) }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>{marque}<strong style={{ fontFamily: 'var(--police-titres)', ...nomEntete }}>{nomCabinet}</strong></span>
        {!mobile && !village && <span style={{ display: 'flex', gap: 22, fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', flexShrink: 0 }}>{menu.map((l) => <span key={l}>{l}</span>)}</span>}
        {village ? (r.aTelephone && !mobile && <span style={{ fontWeight: 750, fontSize: 20, whiteSpace: 'nowrap' }}>☏ {tel}</span>) : !mobile && <span style={{ ...bouton(true), minHeight: 46, background: 'var(--g-vif)', color: 'var(--g-vif-texte)', boxShadow: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>{r.libelleMenu}</span>}
      </div>
      {(village || mobile) && <nav style={{ ...cadre, display: 'flex', flexWrap: 'wrap', gap: village ? '4px 20px' : 6, padding: '10px 0 8px' }}>{menu.map((l) => <span key={l} style={village ? { textDecoration: 'underline', fontWeight: 600 } : { padding: '10px 12px', borderRadius: 999, background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 1px var(--g-ligne)', fontWeight: 600, fontSize: 15 }}>{l}</span>)}</nav>}
    </header>
  );

  // Premier écran (règles de clarté) : qui, où, soins principaux, Rendez-vous / Appeler ; tableau = carte en aplat de la couleur
  // du cabinet et illustration sur fond « duo » ; village = notice (lignes) et deux gros boutons.
  const pid = (id: string) => <span aria-hidden="true" style={{ color: 'var(--g-accent-texte)', display: 'grid' }} dangerouslySetInnerHTML={{ __html: svgPicto(id, { taille: 26 }) ?? '' }} />;
  const ligne: CSSProperties = { display: 'grid', gridTemplateColumns: '30px 1fr', gap: 12, alignItems: 'start' };
  const principaux = soins.slice(0, 3).map((s) => s.titre_court.toLowerCase()).join(', ');
  const premier = revue ? (
    <section style={{ background: 'var(--g-aplat)' }}><div style={{ ...cadre, display: 'grid', gridTemplateColumns: mobile ? '1fr' : '7fr 4fr', gap: 64, alignItems: 'center', paddingBlock: mobile ? '40px 48px' : '88px 80px' }}>
      <div style={{ display: 'grid', justifyItems: 'start' }}>
        <span style={{ fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--g-aplat-doux)', marginBottom: 22 }}>{surTitre}</span>
        {titreH1}
        <span style={{ fontSize: 19, marginTop: 24 }}>{quiOu}</span>
        {principaux && <span style={{ fontStyle: 'italic', color: 'var(--g-aplat-doux)' }}>{principaux.charAt(0).toUpperCase() + principaux.slice(1)}.</span>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 26 }}>
          <span style={{ ...bouton(true), boxShadow: 'none' }}>{libelleRdv}</span>
          {enLigne && r.aTelephone && <span style={{ ...bouton(false), background: 'transparent', boxShadow: 'inset 0 0 0 1.5px var(--g-encre)' }}>{tel}</span>}
        </div>
      </div>
      {heros ? (
        <figure style={{ margin: 0, ...(mobile ? {} : { paddingLeft: 40, borderLeft: '1px solid var(--g-figure)' }), aspectRatio: '3 / 4', maxHeight: mobile ? 360 : 520, '--dessin-trait': 'var(--g-figure)', '--dessin-ligne': 'var(--g-figure)', '--dessin-accent': 'var(--g-figure)' } as CSSProperties}>
          <HerosVue h={heros} />
        </figure>
      ) : !mobile && soins[0] && (
        <figure style={{ margin: 0, paddingLeft: 40, borderLeft: '1px solid var(--g-figure)' }}>
          {figure(soins[0].slug, { width: '100%', aspectRatio: '4 / 3' })}
        </figure>
      )}
    </div></section>
  ) : village ? (
    <section style={{ position: 'relative', background: 'var(--g-aplat)', color: 'var(--g-aplat-texte)' }}>
      <span aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--g-encre) 14%, transparent) var(--trame-point), transparent calc(var(--trame-point) + 0.6px))', backgroundSize: 'var(--trame-pas) var(--trame-pas)', WebkitMaskImage: 'linear-gradient(100deg, transparent 35%, var(--blanc) 85%)', maskImage: 'linear-gradient(100deg, transparent 35%, var(--blanc) 85%)' }} />
      <div style={{ ...cadre, position: 'relative', display: 'grid', gridTemplateColumns: mobile ? '1fr' : '7fr 5fr', columnGap: 48, rowGap: 18, alignItems: 'center', paddingBlock: mobile ? '28px 36px' : '64px 72px' }}>
      <div style={{ display: 'grid', gap: 18 }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}><span style={{ width: 28, height: 2, background: 'currentColor' }} />{surTitre}</span>
      {titreH1}
      {heros && mobile && <div style={{ aspectRatio: '1 / 1', borderRadius: 'var(--rayon)', overflow: 'hidden', background: 'var(--g-carte)', boxShadow: '10px 10px 0 var(--g-vif)', margin: '0 10px 10px 0', padding: '6%' }}><HerosVue h={heros} /></div>}
      <div style={{ display: 'grid', gap: 8 }}>
        <span style={ligne}>{pid('rendez-vous')}{noms.length ? `${noms.join(' et ')}, ${titre.toLowerCase()}` : nomCabinet}</span>
        <span style={ligne}>{pid('itineraire')}{adresse}</span>
        {principaux && <span style={ligne}>{pid('bilan')}{principaux.charAt(0).toUpperCase() + principaux.slice(1)}.</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <span style={{ display: 'grid', placeItems: 'center', minHeight: 64, borderRadius: 'var(--rayon)', background: 'var(--g-plein)', color: 'var(--g-plein-texte)', fontWeight: 700, textAlign: 'center', padding: '0 12px' }}>{libelleRdv}</span>
        {enLigne && r.aTelephone && <span style={{ display: 'grid', placeItems: 'center', minHeight: 64, borderRadius: 'var(--rayon)', background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 2px var(--g-encre)', fontWeight: 700 }}>Appeler le {tel}</span>}
      </div>
      </div>
      {heros && !mobile && <div style={{ aspectRatio: '3 / 4', borderRadius: 'var(--rayon)', overflow: 'hidden', background: 'var(--g-carte)', boxShadow: '10px 10px 0 var(--g-vif)', margin: '0 10px 10px 0', padding: '6%' }}><HerosVue h={heros} /></div>}
    </div></section>
  ) : (
    <section style={{ ...cadre, display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.45fr 1fr', gap: mobile ? 20 : 64, paddingTop: 14, alignItems: 'center' }}>
      <div style={{ borderRadius: 'var(--rayon)', background: mobile ? 'var(--g-aplat)' : 'var(--g-carte)', boxShadow: mobile ? 'none' : 'inset 0 0 0 1px var(--g-ligne)', color: 'var(--g-encre)', padding: mobile ? 26 : 48, display: 'grid', gap: 16, justifyItems: 'start' }}>
        <span style={{ padding: '6px 14px', borderRadius: 999, background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 1px var(--g-ligne)', fontSize: 14, fontWeight: 600 }}>● {surTitre}</span>
        {titreH1}
        <span style={{ fontWeight: 600 }}>{quiOu}</span>
        {principaux && <span style={{ color: mobile ? 'var(--g-aplat-doux)' : 'var(--g-encre-douce)' }}>{principaux.charAt(0).toUpperCase() + principaux.slice(1)}.</span>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <span style={bouton(true)}>{libelleRdv}</span>
          {enLigne && r.aTelephone && <span style={bouton(false)}>{tel}</span>}
        </div>
      </div>
      {heros ? (
        <div data-fond={heros.type === 'svg' && heros.sombre ? 'sombre' : undefined} className={heros.type === 'svg' && heros.sombre ? 'surface-plan' : undefined} style={{ position: 'relative', aspectRatio: '1 / 1', width: '100%', maxWidth: mobile ? 320 : 440, justifySelf: 'center', alignSelf: 'center', borderRadius: '50%', background: heros.type === 'svg' && heros.sombre ? undefined : 'var(--g-carte)', boxShadow: '0 0 0 10px var(--g-vif)', overflow: 'hidden', margin: 10 }}>
          <div style={{ position: 'absolute', inset: heros.type === 'photo' ? 0 : '14%', borderRadius: heros.type === 'photo' ? '50%' : 0, display: 'grid', placeItems: 'center' }}><HerosVue h={heros} /></div>
        </div>
      ) : !mobile && soins[0] && (
        <div style={{ borderRadius: 'var(--rayon)', background: 'var(--g-vif)', display: 'grid', placeItems: 'center', '--dessin-trait': 'var(--g-vif-texte)', '--dessin-accent': 'var(--g-vif-texte)' } as CSSProperties}><div className="ap-svg" style={{ width: '72%', height: '80%' }} dangerouslySetInnerHTML={{ __html: svgDessin(dessinSoin(soins[0].slug), { registre: 'ligne' }) }} /></div>
      )}
    </section>
  );

  const section = (titreSection: string, contenu: ReactNode, fond?: string) => revue ? (
    <section style={{ borderTop: '1px solid var(--g-ligne)', padding: `${mobile ? 56 : 96}px 0` }}>
      <div style={{ ...cadre, display: 'grid', gridTemplateColumns: mobile ? '1fr' : '4fr 8fr', columnGap: 64, rowGap: 24, alignItems: 'start' }}>
        <div><span style={{ display: 'block', fontFamily: 'var(--police-titres)', fontStyle: 'italic', color: 'var(--g-accent-texte)', marginBottom: 10 }}>{ROMAINS[folio++] ?? ''}</span><h2 className="ap-h2" style={h2}>{titreSection}</h2></div>
        {contenu}
      </div>
    </section>
  ) : (
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
      <span style={{ fontStyle: revue ? 'italic' : 'normal', fontWeight: revue ? 400 : 650, fontSize: village ? 14 : 15, color: village ? 'var(--g-encre)' : 'var(--g-encre-douce)', letterSpacing: village ? '0.08em' : 0, textTransform: village ? 'uppercase' : 'none' }}>{etiquette}</span>
      <div style={village ? { display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 10 } : { display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {bulles.map((b) => (
          <span key={b.cle} style={revue ? { ...bulle, background: fondBulle === 'var(--g-doux)' ? 'transparent' : fondBulle, boxShadow: `inset 0 0 0 1px ${fondBulle === 'var(--g-bulle)' ? 'var(--g-bulle-bord)' : fondBulle === 'var(--g-duo-bulle)' ? 'var(--g-duo-bord)' : 'var(--g-ligne)'}` } : village ? { display: 'flex', alignItems: 'center', gap: 10, minHeight: 58, padding: '8px 14px 8px 10px', borderRadius: 10, background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 2px var(--g-ligne)', fontWeight: 600 } : { ...bulle, background: fondBulle, color: texte }}>
            <span style={{ ...rond, ...(revue ? { width: 28, height: 28, background: 'none', color: fondBulle === 'var(--g-duo-bulle)' ? 'var(--g-duo-picto)' : fondBulle === 'var(--g-bulle)' ? 'var(--g-bulle-picto)' : 'var(--g-accent-texte)' } : { background: village ? fondBulle : 'var(--g-carte)', color: texte, borderRadius: village ? 8 : '50%' }) }}>{b.picto ? picto(b.picto) : '●'}</span>{b.texte}
          </span>
        ))}
      </div>
    </div>
  );
  // Tableau et village : cartes éditoriales (grande illustration du soin, titre fort, résumé), liens texte (comme le site)
  const lien: CSSProperties = { fontWeight: 700, fontSize: village ? 19 : 17, textDecoration: 'underline', textDecorationThickness: 2, textUnderlineOffset: 6, textDecorationColor: 'var(--g-plein-bord)' };
  const liens = (etiquette: string, items: string[]) => (
    <div style={{ display: 'grid', gap: 8 }}>
      <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{etiquette}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 28px' }}>{items.map((i) => <span key={i} style={lien}>{i} <span style={{ color: 'var(--g-accent-texte)' }}>→</span></span>)}</div>
    </div>
  );
  const illustrationSoin = (slug: string) => <div className="ap-svg" style={{ width: village ? '92%' : '80%', height: village ? '92%' : '88%', '--dessin-trait': 'var(--g-encre)', '--dessin-ligne': 'var(--g-encre)', '--dessin-accent': 'var(--g-accent-texte)', color: 'var(--g-encre)' } as CSSProperties} dangerouslySetInnerHTML={{ __html: svgDessin(dessinSoin(slug), { registre, id: `ap-soin-${slug}` }) }} />;
  const soinsEditorial = (
    <div style={{ display: 'grid', gap: 32 }}>
      {village ? (
        <div style={{ borderTop: '2px solid var(--g-encre)' }}>{soins.map((s) => (
          <div key={s.slug} style={{ display: 'grid', gridTemplateColumns: `${mobile ? 104 : 168}px 1fr`, gap: mobile ? 16 : 28, alignItems: 'center', padding: '18px 0', borderBottom: '1px solid var(--g-ligne)' }}>
            <div style={{ aspectRatio: '1 / 1', borderRadius: 'var(--rayon)', background: 'var(--g-doux)', display: 'grid', placeItems: 'center' }}>{illustrationSoin(s.slug)}</div>
            <div style={{ display: 'grid', gap: 6 }}><strong style={{ fontFamily: 'var(--police-titres)', fontSize: mobile ? 23 : 28, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{s.titre_court}</strong>{<span style={{ color: 'var(--g-encre-douce)', fontSize: mobile ? 16 : 18, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: mobile ? 3 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.resume}</span>}</div>
          </div>
        ))}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>{soins.slice(0, mobile ? 3 : 6).map((s) => (
          <div key={s.slug} style={{ borderRadius: 'var(--rayon)', overflow: 'hidden', background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 1px var(--g-ligne)' }}>
            <div style={{ aspectRatio: '16 / 10', background: 'var(--g-bulle)', display: 'grid', placeItems: 'center' }}>{illustrationSoin(s.slug)}</div>
            <div style={{ display: 'grid', gap: 8, padding: '18px 20px 20px' }}><strong style={{ fontFamily: 'var(--police-titres)', fontSize: 23, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{s.titre_court}</strong><span style={{ color: 'var(--g-encre-douce)', fontSize: 15, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.resume}</span><span style={{ color: 'var(--g-accent-texte)', fontWeight: 700, fontSize: 19 }}>→</span></div>
          </div>
        ))}</div>
      )}
      {pourQui.length >= 2 && liens('Pour qui', pourQui)}
      {liens('Infos pratiques', infos)}
    </div>
  );
  const soinsSection = section('Une prise en charge du pied, à tout âge.', !revue ? soinsEditorial : (
    <div style={{ display: 'grid', gap: 22 }}>
      {rangee('Soins', soins.map((s) => ({ cle: s.slug, texte: s.titre_court, picto: s.slug })), 'var(--g-bulle)', 'var(--g-bulle-texte)')}
      {pourQui.length >= 2 && rangee('Pour qui', pourQui.map((p) => ({ cle: p, texte: p })), 'var(--g-duo-bulle)', 'var(--g-duo-texte)')}
      {rangee('Infos pratiques', infos.map((i) => ({ cle: i, texte: i })), 'var(--g-doux)', 'var(--g-encre)')}
    </div>
  ));
  // Sans horaires : « Sur rendez-vous » (repli du site), jamais une semaine « Fermé »
  const horairesTable = !horairesRenseignes(horaires) ? <p style={{ margin: 0, fontWeight: 650 }}>{lieu?.surRendezVous ? 'Sur rendez-vous uniquement' : REPLIS.horaires}</p> : (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}><tbody>{horaires.map((h, k) => <tr key={h.jour} style={{ borderBottom: '1px solid var(--g-ligne)', background: k === 0 ? 'var(--g-bulle)' : undefined }}><th style={{ textAlign: 'left', padding: '8px 10px' }}>{h.jour}</th><td style={{ padding: '8px 0', color: h.heures ? 'var(--g-encre)' : 'var(--g-encre-douce)' }}>{h.heures || 'Fermé'}</td></tr>)}</tbody></table>
  );
  const volets = ['Prise de rendez-vous', 'Transports et stationnement', 'Tarifs', 'Moyens de règlement acceptés'];
  const accesSection = section('Venir au cabinet.', (
    <div style={{ display: 'grid', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: mobile || village ? '1fr' : '1.1fr 0.9fr', gap: 28 }}>
        {horairesTable}
        <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}><strong>Adresse</strong><span>{adresse}</span>{(r.aTelephone || r.aAdresse) && <span style={{ color: 'var(--g-accent-texte)', fontWeight: 650 }}>{[tel, r.aAdresse ? 'Itinéraire' : ''].filter(Boolean).join(' · ')}</span>}{village && r.aAdresse && plan}</div>
      </div>
      <div>{volets.map((v) => <div key={v} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 56, borderBottom: '1px solid var(--g-ligne)', fontWeight: 650 }}>{v}<span style={{ ...rond, background: 'var(--g-bulle)', color: 'var(--g-bulle-texte)' }}>+</span></div>)}</div>
    </div>
  ));
  const faqSection = section('Bon à savoir avant de venir.', (
    <div style={{ display: 'grid', gap: 10, maxWidth: 820 }}>{['Comment prendre rendez-vous ?', 'Les consultations sont-elles remboursées ?'].map((q) => <div key={q} style={revue ? { padding: '16px 0', borderBottom: '1px solid var(--g-ligne)', display: 'flex', justifyContent: 'space-between', fontWeight: 500 } : { padding: '18px 22px', borderRadius: 'var(--rayon)', background: village ? 'var(--g-doux)' : 'var(--g-carte)', boxShadow: village ? 'none' : 'inset 0 0 0 1px var(--g-ligne)', display: 'flex', justifyContent: 'space-between', fontWeight: 650 }}>{q}<span style={revue ? {} : { ...rond, background: 'var(--g-bulle)', color: 'var(--g-bulle-texte)' }}>+</span></div>)}</div>
  ));


  const fiche = soins[0] && revue ? (
    <>
      <section style={{ ...cadre, paddingTop: mobile ? 32 : 72 }}>
        <div style={{ maxWidth: 760, marginInline: 'auto', display: 'grid', gap: 14 }}>
          <p style={{ fontSize: 15, color: 'var(--g-encre-douce)', margin: 0 }}>Accueil / Soins / {soins[0].titre_court}</p>
          <p className="ap-h1" style={{ ...h1, margin: 0, fontSize: mobile ? 36 : 56 }}>{soins[0].titre ? avecVille(soins[0].titre, ville) : soins[0].titre_court}</p>
          <p style={{ color: 'var(--g-encre-douce)', fontStyle: 'italic', margin: 0 }}>{avecVille(soins[0].resume, ville)}</p>
          <span style={{ ...bouton(true), justifySelf: 'start', boxShadow: 'none' }}>{libelleRdv}</span>
        </div>
        <div style={{ marginTop: 40, aspectRatio: mobile ? '4 / 3' : '3 / 1', background: 'var(--g-doux)', display: 'grid', placeItems: 'center' }}>{figure(soins[0].slug, { height: '82%', aspectRatio: '4 / 3' })}</div>
      </section>
      <section style={{ ...cadre, paddingTop: 32 }}><div style={{ maxWidth: 760, marginInline: 'auto' }}><h2 className="ap-h2" style={{ ...h2, fontSize: 30 }}>Déroulement de la séance</h2><p style={{ color: 'var(--g-encre)' }}>{avecVille(soins[0].corps ?? soins[0].resume, ville).replace(/[#*_>]/g, '').slice(0, 420)}…</p></div></section>
    </>
  ) : soins[0] && (
    <>
      <section style={{ ...cadre, paddingTop: 20 }}>
        <div style={{ ...(village ? { padding: '32px 0 0' } : carte), display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.15fr 0.85fr', gap: 28, alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: 14 }}>
            <p style={{ fontSize: 14, color: 'var(--g-encre-douce)', margin: 0 }}>Accueil / Soins / {soins[0].titre_court}</p>
            <p style={sur}>{titreSoins(d.voix)}</p>
            <p className="ap-h1" style={{ ...h1, margin: 0, fontSize: mobile ? 36 : 52 }}>{soins[0].titre ? avecVille(soins[0].titre, ville) : soins[0].titre_court}</p>
            <p style={{ color: 'var(--g-encre-douce)', margin: 0 }}>{avecVille(soins[0].resume, ville)}</p>
            <span style={{ ...bouton(true), justifySelf: 'start' }}>{libelleRdv}</span>
          </div>
          <div style={{ aspectRatio: '4 / 3', borderRadius: 16, background: 'var(--g-doux)', display: 'grid', placeItems: 'center', '--dessin-trait': 'var(--g-encre)', '--dessin-accent': 'var(--g-accent-texte)' } as CSSProperties}><div className="ap-svg" style={{ width: '78%', height: '86%' }} dangerouslySetInnerHTML={{ __html: svgDessin(dessinSoin(soins[0].slug), { registre: village ? 'pedagogique' : 'ligne' }) }} /></div>
        </div>
      </section>
      <section style={{ ...cadre, display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 300px', gap: 18, paddingTop: 18 }}>
        <div style={{ ...carte, ...(village ? { background: 'transparent', padding: 0 } : {}) }}><h2 className="ap-h2" style={{ fontSize: 28 }}>Déroulement de la séance</h2><p style={{ color: 'var(--g-encre-douce)' }}>{avecVille(soins[0].corps ?? soins[0].resume, ville).replace(/[#*_>]/g, '').slice(0, 420)}…</p></div>
        <div style={{ ...carte, background: 'var(--g-doux)', boxShadow: 'none', display: 'grid', gap: 12, alignContent: 'start' }}><strong style={{ color: 'var(--g-accent-texte)' }}>En pratique</strong><span style={{ fontSize: 15 }}>{adresse}</span><span style={{ ...bouton(true), textAlign: 'center' }}>{libelleRdv}</span></div>
      </section>
    </>
  );

  return (
    <div style={{ background: 'var(--g-page)', color: 'var(--g-encre)', fontSize: village ? 20 : revue ? 19 : 18, lineHeight: 1.6, paddingBottom: 1 }}>
      {entete}
      {vue === 'accueil' ? <>{premier}{soinsSection}{accesSection}{faqSection}</> : fiche}
      <footer style={{ marginTop: revue ? 0 : 64, padding: '44px 0 28px', background: revue ? 'var(--g-page)' : village ? 'var(--g-doux)' : 'var(--g-sombre)', color: village || revue ? 'var(--g-encre-douce)' : 'var(--g-sombre-doux)', borderTop: revue ? '3px double var(--g-encre)' : village ? '2px solid var(--g-encre)' : undefined }}>
        <div style={cadre}><strong style={{ color: village || revue ? 'var(--g-encre)' : 'var(--g-sombre-texte)', fontFamily: revue ? 'var(--police-titres)' : undefined, fontStyle: revue ? 'italic' : undefined }}>{nomCabinet}</strong><p style={{ margin: '8px 0 0', fontSize: 15 }}>{[adresse, tel].filter(Boolean).join(' · ')}</p><p style={{ margin: '20px 0 0', fontSize: 13 }}>Illustrations : représentations schématiques, sans valeur de mesure</p></div>
      </footer>
    </div>
  );
}
