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
import { avecVille, construireNavigation, variantesModele, type VuePage, illustrationTheme, themeIllustre, horairesRenseignes, gabaritModele, pictoSoin, svgDessin, svgPicto, svgLigne, LIGNE_DESSIN, REPLIS, titreSoins, actionsRapides, type ActionsRapides, type IconeAction, type ModeleManifeste, type NomDessin, type Registre, type ReplisApercu, type SiteDraft } from '@plateforme/core';
import { facteurChasse, facteurTitres, menuABouton, normaliserHabillage } from '@plateforme/core';
import type { SoinCatalogue } from '@/lib/sites';

type Props = {
  draft: SiteDraft;
  modele: ModeleManifeste;
  soins: SoinCatalogue[];
  mobile: boolean;
  vue: VuePage;
  /** Pages sujet et article (ApercuPages, calculées par ApercuTheme) */
  pageSujet?: ReactNode;
  pageArticle?: ReactNode;
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
  /**
   * Aperçu d'un élément seul (Donner mon avis, tuiles « Structures de pages » et « Éléments ») : blocs à montrer, parmi
   * premier, sujets, competences, acces, faq, praticiens, galerie, contact, pied ; absent = la page entière.
   */
  seul?: readonly string[];
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

// Actions rapides du téléphone (retour de Paul du 2026-10-07 : « boutons flottants pas du tout bien placés ») : mêmes règles et
// même CSS que le site (Coquille.astro .c-barre / .c-flottant, Gabarit.astro .barre-mobile), en position FIXE dans l'iframe
// de l'aperçu (CadreApercu) : collées en bas de la fenêtre du téléphone, au-dessus du contenu, masquées à partir de 900 px.
const LUCIDE: Record<string, string> = {
  telephone: '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233a14 14 0 0 0 6.392 6.384"/>',
  'rendez-vous': '<path d="M8 2v3m8-3v3"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/>',
  itineraire: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  courriel: '<path d="m22 7l-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect width="20" height="16" x="2" y="4" rx="2"/>',
};
const lucide = (nom: string, taille: string | number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${taille}" height="${taille}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LUCIDE[nom] ?? ''}</svg>`;
/** Icône d'une action : picto métier (gabarits), sinon Lucide (gabarit classique, courriel) — comme Icone.astro */
const iconeAction = (nom: IconeAction, taille: string | number, picto: boolean) => (picto && nom !== 'courriel' && svgPicto(nom, { taille })) || lucide(nom, taille);
const CSS_ACTIONS = `
.apb-barre{position:fixed;z-index:40;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr 1fr;background:var(--g-carte);box-shadow:0 -1px 0 var(--g-ligne)}
.apb-barre>span{display:flex;align-items:center;justify-content:center;gap:8px;min-height:60px;padding-inline:12px;color:var(--g-encre);font-weight:650;font-size:16px;line-height:1.6}
.apb-barre>span>svg{width:22px;height:22px;flex:none}
.apb-barre>span:only-child{grid-column:1/-1;white-space:nowrap}
.apb-barre>.apb-plein{background:var(--g-vif);color:var(--g-vif-texte)}
.apb-flottant{position:fixed;z-index:40;right:16px;bottom:16px}
.apb-flottant>span{display:grid;place-items:center;width:60px;height:60px;border-radius:50%;background:var(--g-vif);color:var(--g-vif-texte);box-shadow:0 6px 18px color-mix(in srgb,var(--g-encre) 22%,transparent)}
.apb-flottant svg{width:26px;height:26px}
.apb-classique{position:fixed;z-index:40;left:12px;right:12px;bottom:12px;display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:8px;padding:8px;border-radius:20px;background:rgb(var(--blanc-rgb) / .94);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);box-shadow:var(--ombre)}
.apb-classique>span{display:flex;align-items:center;justify-content:center;gap:6px;min-height:48px;border-radius:14px;font-weight:600;font-size:14.4px;line-height:1.15;color:var(--encre)}
.apb-classique svg{width:1.1em;height:1.1em;flex:none;vertical-align:-.125em}
.apb-classique.apb-appel{grid-template-columns:1.6fr 1fr}
.apb-classique:not(.apb-appel){grid-template-columns:auto minmax(0,1fr) auto}
.apb-classique:not(.apb-appel)>span:not(.apb-rdv){padding-inline:8px;white-space:nowrap}
.apb-rdv>span{display:grid}
.apb-classique .apb-via{font-size:var(--taille-donnees-petit,12px)}
.apb-classique>.apb-rdv{background:var(--accent);color:var(--blanc)}
.ap[data-registre='pedagogique'] .apb-classique>span{font-size:13.6px}
@media (min-width:900px){.apb-barre,.apb-flottant,.apb-classique{display:none}}`;

/** Barre d'actions ou bouton flottant du téléphone (éléments décoratifs de l'aperçu : aucun lien) */
export function ActionsRapidesApercu({ a }: { a: ActionsRapides | null }) {
  if (!a) return null;
  const icone = (nom: IconeAction, taille: string | number, picto: boolean) => <span aria-hidden="true" style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: iconeAction(nom, taille, picto) }} />;
  return (
    <>
      <style>{CSS_ACTIONS}</style>
      {a.forme === 'flottant' ? (
        <div className="apb-flottant" aria-label="Accès rapide"><span title={a.action.libelle}>{icone(a.action.icone, 26, true)}</span></div>
      ) : a.forme === 'barre' ? (
        <div className="apb-barre" aria-label="Accès rapide">{a.actions.map((x) => <span key={x.libelle} className={x.plein ? 'apb-plein' : undefined}>{icone(x.icone, 22, true)}{x.libelle}</span>)}</div>
      ) : (
        <div className={`apb-classique ${a.appel ? 'apb-appel' : ''}`} aria-label="Accès rapide">
          {a.actions.map((x) => <span key={x.libelle} className={x.plein ? 'apb-rdv' : undefined}>{icone(x.icone, '1em', false)}{x.via ? <span>{x.libelle}<span className="apb-via">{x.via}</span></span> : x.libelle}</span>)}
        </div>
      )}
    </>
  );
}

const PUBLICS: [RegExp, string][] = [[/enfant/, 'Enfants'], [/sport/, 'Sportifs'], [/diab/, 'Diabétiques'], [/senior|chute/, 'Seniors']];

export default function ApercuGabarit({ draft: d, modele: m, soins, mobile, vue, marque, nomCabinet, titre, replis: r, dessinSoin, heros = null, registre = 'ligne', seul, pageSujet = null, pageArticle = null }: Props) {
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
  // Variantes de sections (fiche du modèle + recette du studio, modeleDuSite) : chaque section suit SA variante, comme le site
  // (components/gabarits/*) — premier écran, soins, sujets, horaires, plan d'accès, équipe, questions ; ordre des sections.
  const v = variantesModele(m)!;
  const menu = (mobile ? navigation.menuMobile : navigation.menu).map((l) => l.libelle);
  // Habillage de la recette (habillage.ts) : la feuille CSS commune est posée par ApercuTheme ; ici, les tailles calculées en pixels
  // (titre du premier écran) suivent l'échelle et la casse, et le bouton « Menu » du téléphone s'affiche (classes mn-*, td-*, ap-*)
  const habillage = normaliserHabillage(d.theme, gabaritModele(m));
  const burger = mobile && menuABouton(habillage.menu, gabaritModele(m)) ? <span className="mn-burger"><span className="mn-burger__traits" aria-hidden="true" /><span>Menu</span></span> : null;
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
  const tailleH1 = tailleTitre(`Cabinet de ${metier} ${r.aVille ?? ''}`, colonneTitre, ((h1.fontSize as number) ?? 60) * facteurTitres(habillage.typo), (revue ? 0.52 : 0.6) * facteurChasse(habillage.typo));
  const titreH1 = <p className="ap-h1" style={{ ...h1, fontSize: tailleH1, margin: 0 }}>Cabinet de <span className="ap-mot">{metier}</span>{r.aVille && <> {revue ? <em className="ap-pale" style={{ color: 'var(--g-accent-texte)' }}>{r.aVille}</em> : village ? <span className="ap-pale" style={{ color: 'var(--g-accent-texte)' }}>{r.aVille}</span> : <span className="ap-pale">{r.aVille}</span>}</>}</p>;
  // Menu et bouton sur une ligne : un nom de cabinet long se réduit, jamais « Rendez-/vous » sur deux lignes
  const nomEntete: CSSProperties = { minWidth: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.2, fontSize: nomCabinet.length > 40 ? 16 : 18 };
  // Revue : dessin au trait continu du soin principal, légendé (sans animation)
  const figure = (slug: string, taille: CSSProperties) => <div className="ap-svg" style={{ ...taille, '--dessin-trait': 'var(--g-figure)', '--dessin-ligne': 'var(--g-figure)', '--dessin-accent': 'var(--g-figure)', color: 'var(--g-figure)' } as CSSProperties} dangerouslySetInnerHTML={{ __html: svgLigne(LIGNE_DESSIN[dessinSoin(slug)] ?? 'pied-dessous') }} />;

  const entete = revue ? (
    <header className="mn-entete" style={{ borderBottom: '3px double var(--g-encre)' }}>
      <div className="mn-ligne" style={{ ...cadre, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 76 }}>
        <span className="mn-logo" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>{marque}<strong style={{ fontFamily: 'var(--police-titres)', fontStyle: 'italic', fontWeight: 500, ...nomEntete, fontSize: nomCabinet.length > 40 ? 17 : 20 }}>{nomCabinet}</strong></span>
        {!mobile && <span className="mn-nav mn-liste" style={{ display: 'flex', alignItems: 'center', gap: 26, fontSize: 17, whiteSpace: 'nowrap', flexShrink: 0 }}>{menu.map((l) => <span key={l} className="mn-lien">{l}</span>)}<span className="mn-rdv" style={{ ...bouton(true), minHeight: 46, background: 'var(--g-vif)', color: 'var(--g-vif-texte)', boxShadow: 'none', whiteSpace: 'nowrap' }}>{r.libelleMenu}</span></span>}
        {burger}
      </div>
      {mobile && <nav className="mn-nav mn-liste" style={{ ...cadre, display: 'flex', justifyContent: 'space-between', padding: '4px 0 10px' }}>{menu.map((l) => <span key={l} className="mn-lien">{l}</span>)}</nav>}
    </header>
  ) : (
    // Comme Coquille.astro (.c-entete) : nom à gauche, menu en liens (tableau : une ligne pleine largeur sous le nom sur
    // téléphone, « Rendez-vous » dans la barre du bas) ; village : téléphone en grand, menu dans une bande sous le nom
    <header className="mn-entete" style={{ paddingTop: 10 }}>
      <div className="mn-ligne" style={{ ...cadre, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '4px 16px', minHeight: 64 }}>
        <span className="mn-logo" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>{marque}<strong style={{ fontFamily: 'var(--police-titres)', ...nomEntete }}>{nomCabinet}</strong></span>
        {village
          ? r.aTelephone && !mobile && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minHeight: 48, padding: '0 14px', fontWeight: 750, fontSize: 20.8, whiteSpace: 'nowrap' }}><span aria-hidden="true" style={{ display: 'grid', color: 'var(--g-accent-texte)' }} dangerouslySetInnerHTML={{ __html: svgPicto('telephone', { taille: 28 }) ?? '' }} />{tel}</span>
          : <span className="mn-nav mn-liste" style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', ...(mobile ? { flexBasis: '100%', justifyContent: 'space-between' } : { flexShrink: 0 }) }}>
              {menu.map((l) => <span key={l} className="mn-lien" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: mobile ? '0 10px' : '0 14px', fontWeight: 600, fontSize: 16 }}>{l}</span>)}
              {!mobile && <span className="mn-rdv" style={{ ...bouton(true), marginLeft: 8, minHeight: 48, padding: '0 20px', background: 'var(--g-vif)', color: 'var(--g-vif-texte)', boxShadow: 'none', whiteSpace: 'nowrap' }}>{r.libelleMenu}</span>}
            </span>}
        {burger}
      </div>
      {village && (
        <nav className="mn-nav" style={{ marginTop: 8, background: 'var(--g-bulle)', borderBlock: 'var(--filet) solid var(--g-ligne)' }}>
          <div className="mn-liste" style={{ ...cadre, display: 'flex', alignItems: 'center', justifyContent: mobile ? 'space-between' : 'flex-start' }}>
            {menu.map((l, k) => <span key={l} className="mn-lien" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 52, padding: mobile ? `0 ${k === menu.length - 1 ? 0 : 8}px 0 ${k === 0 ? 0 : 8}px` : `0 16px 0 ${k === 0 ? 0 : 16}px`, fontWeight: 600, fontSize: 16 }}>{l}</span>)}
            {!mobile && <span className="mn-rdv" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', minHeight: 52, padding: '0 22px', background: 'var(--g-vif)', color: 'var(--g-vif-texte)', fontWeight: 600 }}>{r.libelleMenu}</span>}
          </div>
        </nav>
      )}
    </header>
  );

  // Premier écran (règles de clarté) : qui, où, soins principaux, Rendez-vous / Appeler ; tableau = carte en aplat de la couleur
  // du cabinet et illustration sur fond « duo » ; village = notice (lignes) et deux gros boutons.
  const pid = (id: string) => <span aria-hidden="true" style={{ color: 'var(--g-accent-texte)', display: 'grid' }} dangerouslySetInnerHTML={{ __html: svgPicto(id, { taille: 26 }) ?? '' }} />;
  const ligne: CSSProperties = { display: 'grid', gridTemplateColumns: '30px 1fr', gap: 12, alignItems: 'start' };
  const principaux = soins.slice(0, 3).map((s) => s.titre_court.toLowerCase()).join(', ');
  const premier = v.accueil === 'figure' ? (
    // Comme PremierEcran.astro (.pe--figure) : sur le papier ; téléphone = sur-titre, titre, figure, puis le reste ; ordinateur =
    // texte à gauche, figure à droite (planche pastel 4/3 entre deux filets)
    <section style={{ background: 'var(--g-page)', color: 'var(--g-encre)' }}><div style={{ ...cadre, display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'minmax(0, 7fr) minmax(0, 5fr)', columnGap: 64, rowGap: mobile ? 18 : 0, alignContent: 'center', paddingBlock: mobile ? '36px 44px' : '96px 88px' }}>
      <span className="td-sur" style={{ gridColumn: mobile ? undefined : 1, fontSize: 15.2, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--g-encre-douce)' }}>{surTitre}</span>
      <div style={{ gridColumn: mobile ? undefined : 1, margin: mobile ? 0 : '18px 0 26px' }}>{titreH1}</div>
      {(heros || soins[0]) && (
        <figure style={{ margin: mobile ? '0 0 10px' : 0, ...(mobile ? {} : { gridColumn: 2, gridRow: '1 / span 4', alignSelf: 'center' }), color: 'var(--g-figure)', '--dessin-trait': 'var(--g-figure)', '--dessin-ligne': 'var(--g-figure)', '--dessin-accent': 'var(--g-figure)' } as CSSProperties}>
          <div style={{ aspectRatio: '4 / 3', background: 'var(--g-aplat)', borderBlock: 'var(--filet) solid var(--g-figure)', padding: heros?.type === 'photo' ? 0 : '7% 9%', overflow: 'hidden' }}>
            {heros ? <HerosVue h={heros} /> : figure(soins[0].slug, { width: '100%', height: '100%' })}
          </div>
        </figure>
      )}
      <div style={{ gridColumn: mobile ? undefined : 1, display: 'grid', gap: 10, justifyItems: 'start' }}>
        <span style={{ fontSize: 19.2, maxWidth: '34em' }}>{quiOu}</span>
        {principaux && <span style={{ fontStyle: 'italic', fontSize: 17.9, color: 'var(--g-encre-douce)', maxWidth: '34em' }}>{principaux.charAt(0).toUpperCase() + principaux.slice(1)}.</span>}
        <div style={{ display: mobile ? 'grid' : 'flex', width: mobile ? '100%' : undefined, flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          <span className="td-bouton" style={{ ...bouton(true), boxShadow: 'none' }}>{libelleRdv}</span>
          {enLigne && r.aTelephone && <span className="td-bouton" style={{ ...bouton(false), background: 'transparent', boxShadow: 'inset 0 0 0 var(--filet-fort) var(--g-encre)' }}>{tel}</span>}
        </div>
      </div>
    </div></section>
  ) : v.accueil === 'notice' ? (
    <section style={{ position: 'relative', background: 'var(--g-aplat)', color: 'var(--g-aplat-texte)' }}>
      <span aria-hidden="true" style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--g-encre) 14%, transparent) var(--trame-point), transparent calc(var(--trame-point) + 0.6px))', backgroundSize: 'var(--trame-pas) var(--trame-pas)', WebkitMaskImage: 'linear-gradient(100deg, transparent 35%, var(--blanc) 85%)', maskImage: 'linear-gradient(100deg, transparent 35%, var(--blanc) 85%)' }} />
      <div style={{ ...cadre, position: 'relative', display: 'grid', gridTemplateColumns: mobile ? '1fr' : '7fr 5fr', columnGap: 48, rowGap: 18, alignItems: 'center', paddingBlock: mobile ? '28px 36px' : '64px 72px' }}>
      <div style={{ display: 'grid', gap: 18 }}>
      <span className="td-sur" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 15, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}><span style={{ width: 28, height: 2, background: 'currentColor' }} />{surTitre}</span>
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
        <span className="td-sur" style={{ padding: '6px 14px', borderRadius: 999, background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 1px var(--g-ligne)', fontSize: 14, fontWeight: 600 }}>● {surTitre}</span>
        {titreH1}
        <span style={{ fontWeight: 600 }}>{quiOu}</span>
        {principaux && <span style={{ color: mobile ? 'var(--g-aplat-doux)' : 'var(--g-encre-douce)' }}>{principaux.charAt(0).toUpperCase() + principaux.slice(1)}.</span>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <span className="td-bouton" style={bouton(true)}>{libelleRdv}</span>
          {enLigne && r.aTelephone && <span className="td-bouton" style={bouton(false)}>{tel}</span>}
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
    <section className="ap-section" style={{ borderTop: '1px solid var(--g-ligne)', padding: `${mobile ? 56 : 96}px 0` }}>
      <div style={{ ...cadre, display: 'grid', gridTemplateColumns: mobile ? '1fr' : '4fr 8fr', columnGap: 64, rowGap: 24, alignItems: 'start' }}>
        <div><span style={{ display: 'block', fontFamily: 'var(--police-titres)', fontStyle: 'italic', color: 'var(--g-accent-texte)', marginBottom: 10 }}>{ROMAINS[folio++] ?? ''}</span><h2 className="ap-h2" style={h2}>{titreSection}</h2></div>
        {contenu}
      </div>
    </section>
  ) : (
    <section className={village ? 'ap-section' : 'ap-section ap-section--carte'} style={village ? { borderTop: '1px solid var(--g-ligne)', padding: `${mobile ? 44 : 60}px 0`, background: fond } : { ...cadre, paddingTop: 14 }}>
      <div className={village ? 'td-tete-section' : 'ap-bloc ap-carte'} style={village ? cadre : { ...carte, padding: mobile ? 26 : 48 }}>
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
      {v.soins === 'grille' ? (
        <div style={{ borderTop: '2px solid var(--g-encre)' }}>{soins.map((s) => (
          <div key={s.slug} style={{ display: 'grid', gridTemplateColumns: `${mobile ? 104 : 168}px 1fr`, gap: mobile ? 16 : 28, alignItems: 'center', padding: '18px 0', borderBottom: '1px solid var(--g-ligne)' }}>
            <div style={{ aspectRatio: '1 / 1', borderRadius: 'var(--rayon)', background: 'var(--g-doux)', display: 'grid', placeItems: 'center' }}>{illustrationSoin(s.slug)}</div>
            <div style={{ display: 'grid', gap: 6 }}><strong style={{ fontFamily: 'var(--police-titres)', fontSize: mobile ? 23 : 28, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{s.titre_court}</strong>{<span style={{ color: 'var(--g-encre-douce)', fontSize: mobile ? 16 : 18, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: mobile ? 3 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.resume}</span>}</div>
          </div>
        ))}</div>
      ) : (
        <div className="forme-grille eff-grille" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>{soins.slice(0, mobile ? 3 : 6).map((s) => (
          <div key={s.slug} className="eff-carte forme-carte" style={{ borderRadius: 'var(--rayon)', overflow: 'hidden', background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 1px var(--g-ligne)' }}>
            <div className="eff-visuel forme-visuel" style={{ aspectRatio: '16 / 10', background: 'var(--g-bulle)', display: 'grid', placeItems: 'center' }}>{illustrationSoin(s.slug)}</div>
            <div style={{ display: 'grid', gap: 8, padding: '18px 20px 20px' }}><strong className="forme-texte eff-titre" style={{ fontFamily: 'var(--police-titres)', fontSize: 23, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{s.titre_court}</strong><span className="forme-texte" style={{ color: 'var(--g-encre-douce)', fontSize: 15, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.resume}</span><span style={{ color: 'var(--g-accent-texte)', fontWeight: 700, fontSize: 19 }}>→</span></div>
          </div>
        ))}</div>
      )}
      {pourQui.length >= 2 && liens('Pour qui', pourQui)}
      {liens('Infos pratiques', infos)}
    </div>
  );
  const soinsSection = section('Une prise en charge du pied, à tout âge.', v.soins !== 'filets' ? soinsEditorial : (
    <div style={{ display: 'grid', gap: 22 }}>
      {rangee('Soins', soins.map((s) => ({ cle: s.slug, texte: s.titre_court, picto: s.slug })), 'var(--g-bulle)', 'var(--g-bulle-texte)')}
      {pourQui.length >= 2 && rangee('Pour qui', pourQui.map((p) => ({ cle: p, texte: p })), 'var(--g-duo-bulle)', 'var(--g-duo-texte)')}
      {rangee('Infos pratiques', infos.map((i) => ({ cle: i, texte: i })), 'var(--g-doux)', 'var(--g-encre)')}
    </div>
  ));
  // Sans horaires : « Sur rendez-vous » (repli du site), jamais une semaine « Fermé »
  const horairesTable = !horairesRenseignes(horaires) ? <p style={{ margin: 0, fontWeight: 650 }}>{lieu?.surRendezVous ? 'Sur rendez-vous uniquement' : REPLIS.horaires}</p> : (
    v.horaires === 'bandeau' && !mobile ? (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 8 }}>{horaires.map((h, k) => <div key={h.jour} style={{ display: 'grid', gap: 4, padding: '12px 14px', borderRadius: 'calc(var(--rayon) * 0.6)', background: k === 0 ? 'var(--g-bulle)' : 'var(--g-doux)', fontSize: 15 }}><strong>{h.jour}</strong><span style={{ color: h.heures ? 'var(--g-encre)' : 'var(--g-encre-douce)' }}>{h.heures || 'Fermé'}</span></div>)}</div>
    ) : (
      <div style={v.horaires === 'carte' ? { padding: mobile ? 18 : 26, borderRadius: 'var(--rayon)', background: 'var(--g-doux)', boxShadow: 'inset 0 0 0 1px var(--g-ligne)' } : undefined}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: v.horaires === 'liste' ? 18 : 16 }}><tbody>{horaires.map((h, k) => <tr key={h.jour} style={{ borderBottom: '1px solid var(--g-ligne)', background: k === 0 ? (v.horaires === 'liste' ? 'var(--g-aplat)' : 'var(--g-bulle)') : undefined, fontWeight: k === 0 && v.horaires === 'liste' ? 700 : undefined }}><th style={{ textAlign: 'left', padding: v.horaires === 'liste' ? '14px 10px' : '8px 10px' }}>{h.jour}</th><td style={{ padding: v.horaires === 'liste' ? '14px 0' : '8px 0', color: h.heures ? 'var(--g-encre)' : 'var(--g-encre-douce)' }}>{h.heures || 'Fermé'}</td></tr>)}</tbody></table>
      </div>
    )
  );
  const volets = ['Prise de rendez-vous', 'Transports et stationnement', 'Tarifs', 'Moyens de règlement acceptés'];
  const accesSection = section('Venir au cabinet.', (
    <div style={{ display: 'grid', gap: 22 }}>
      <div style={{ display: 'grid', gridTemplateColumns: mobile || v.infos === 'notice' || v.horaires === 'bandeau' ? '1fr' : v.infos === 'colonnes' ? '0.9fr 1.1fr' : '1.1fr 0.9fr', gap: 28 }}>
        {horairesTable}
        <div style={{ display: 'grid', gap: 8, alignContent: 'start' }}><strong>Adresse</strong><span>{adresse}</span>{(r.aTelephone || r.aAdresse) && <span style={{ color: 'var(--g-accent-texte)', fontWeight: 650 }}>{[tel, r.aAdresse ? 'Itinéraire' : ''].filter(Boolean).join(' · ')}</span>}{v.infos !== 'volets' && r.aAdresse && plan}</div>
      </div>
      <div>{volets.map((v) => <div key={v} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 56, borderBottom: '1px solid var(--g-ligne)', fontWeight: 650 }}>{v}<span style={{ ...rond, background: 'var(--g-bulle)', color: 'var(--g-bulle-texte)' }}>+</span></div>)}</div>
    </div>
  ));
  const faqSection = section('Bon à savoir avant de venir.', (
    <div style={{ display: 'grid', gap: 10, maxWidth: v.faq === 'colonnes' && !mobile ? 'none' : 820, gridTemplateColumns: v.faq === 'colonnes' && !mobile ? '1fr 1fr' : '1fr' }}>{['Comment prendre rendez-vous ?', 'Les consultations sont-elles remboursées ?'].map((q) => v.faq === 'ouverte' ? <div key={q} style={{ padding: '14px 0', borderBottom: '1px solid var(--g-ligne)' }}><strong>{q}</strong><p style={{ margin: '8px 0 0', color: 'var(--g-encre-douce)' }}>{q.startsWith('Comment') ? `En ligne ou par téléphone${r.aTelephone ? ` au ${tel}` : ''}.` : 'Selon la prescription et votre situation : renseignez-vous auprès de votre caisse.'}</p></div> : <div key={q} style={revue ? { padding: '16px 0', borderBottom: '1px solid var(--g-ligne)', display: 'flex', justifyContent: 'space-between', fontWeight: 500 } : { padding: '18px 22px', borderRadius: 'var(--rayon)', background: village ? 'var(--g-doux)' : 'var(--g-carte)', boxShadow: village ? 'none' : 'inset 0 0 0 1px var(--g-ligne)', display: 'flex', justifyContent: 'space-between', fontWeight: 650 }}>{q}<span style={revue ? {} : { ...rond, background: 'var(--g-bulle)', color: 'var(--g-bulle-texte)' }}>+</span></div>)}</div>
  ));


  // Sujets du cabinet (SujetsAccueil) : présentation selon la variante (une, rangées, cartes, liste, colonnes)
  const sujetsPrincipaux = navigation.principaux;
  const sujetsSection = sujetsPrincipaux.length ? (
    <section style={{ ...cadre, paddingTop: 28 }}>
      <ul className="eff-grille forme-grille" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: v.sujets === 'liste' ? 0 : 18, gridTemplateColumns: mobile || v.sujets === 'liste' || v.sujets === 'rangees' ? '1fr' : v.sujets === 'cartes' ? `repeat(${Math.min(3, sujetsPrincipaux.length)}, 1fr)` : '1fr 1fr', borderTop: v.sujets === 'liste' ? '2px solid var(--g-encre)' : undefined }}>
        {sujetsPrincipaux.map((t, i) => {
          const une = v.sujets === 'une' && i === 0;
          const ligneVisuel = v.sujets === 'liste' || (!mobile && (v.sujets === 'rangees' || une));
          return (
            <li key={t.theme.id} className="eff-carte forme-carte" style={{ gridColumn: une && !mobile ? '1 / -1' : undefined, display: 'grid', gridTemplateColumns: ligneVisuel ? (v.sujets === 'liste' ? `${mobile ? 96 : 150}px 1fr` : '1fr 1fr') : '1fr', gap: v.sujets === 'liste' ? 18 : 20, alignItems: 'center', padding: v.sujets === 'liste' ? '16px 0' : 0, borderBottom: v.sujets === 'liste' ? '1px solid var(--g-ligne)' : undefined }}>
              <div className="eff-visuel forme-visuel" style={{ order: v.sujets === 'rangees' && i % 2 && !mobile ? 2 : 0, aspectRatio: v.sujets === 'liste' ? '1 / 1' : '16 / 10', borderRadius: 'var(--rayon)', background: 'var(--g-aplat)', overflow: 'hidden', display: 'grid', placeItems: 'center', '--dessin-trait': 'var(--g-encre)', '--dessin-ligne': 'var(--g-encre)', '--dessin-accent': 'var(--g-accent-texte)' } as CSSProperties}>
                <div className="ap-svg" style={{ width: '86%', height: '86%' }} dangerouslySetInnerHTML={{ __html: themeIllustre(t.theme.id) ? illustrationTheme(t.theme.id, { format: 'paysage', registre, id: `ap-suj-${t.theme.id}` }) : '' }} />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong className="eff-titre forme-texte" style={{ fontFamily: 'var(--police-titres)', fontWeight: 'var(--graisse-titres)' as unknown as number, fontSize: une ? (mobile ? 30 : 44) : v.sujets === 'liste' ? 22 : 26, lineHeight: 1.1, letterSpacing: '-0.03em', justifySelf: 'start' }}>{t.theme.libelle}</strong>
                <span className="forme-texte" style={{ color: 'var(--g-encre-douce)', fontSize: 16 }}>{t.theme.description}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  ) : null;
  // Équipe : cartes, fiches ou liste (comme Praticiens.astro)
  const equipeSection = noms.length ? section(noms.length > 1 ? `Une équipe de ${noms.length} praticiens.` : `Votre ${titre.toLowerCase()}${suffixeVille}.`, (
    <div style={{ display: 'grid', gap: v.praticiens === 'liste' ? 0 : 14, gridTemplateColumns: v.praticiens === 'cartes' && !mobile ? 'repeat(auto-fill, minmax(260px, 1fr))' : '1fr' }}>
      {noms.map((n) => <div key={n} className="eff-carte" style={v.praticiens === 'liste' ? { padding: '14px 0', borderBottom: '1px solid var(--g-ligne)', fontWeight: 650 } : { padding: 20, borderRadius: 'var(--rayon)', background: v.praticiens === 'fiches' ? 'var(--g-doux)' : 'var(--g-carte)', boxShadow: 'inset 0 0 0 1px var(--g-ligne)' }}><strong>{n}</strong><span style={{ display: 'block', color: 'var(--g-encre-douce)', fontSize: 15 }}>{titre}</span></div>)}
    </div>
  )) : null;
  // Ordre des blocs de l'accueil (fiche + recette) : « Venir au cabinet » avant les sujets si demandé
  const infosEnTete = Boolean(m.accueil.infosEnTete) && m.accueil.sections.includes('acces');
  const blocs = [...(infosEnTete ? ['acces'] : []), 'sujets', ...m.accueil.sections.filter((x) => !(infosEnTete && x === 'acces'))];
  // Galerie du cabinet (photos du praticien seulement, comme le site) : mosaïque, diaporama au doigt, grande photo, bande
  const photosCabinet = (d.photos?.cabinet ?? []).filter(Boolean).slice(0, 4);
  const imgGalerie = (src: string, ratio = '4 / 3', rayon: string | number = 'var(--rayon)') => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={{ width: '100%', aspectRatio: ratio, objectFit: 'cover', borderRadius: rayon, display: 'block' }} />
  );
  const galerieSection = photosCabinet.length ? section('En images', v.galerie === 'defilement' ? (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 8 }}>{photosCabinet.map((src, k) => <div key={k} className="eff-visuel" style={{ flex: `0 0 ${mobile ? '80%' : '360px'}`, scrollSnapAlign: 'start' }}>{imgGalerie(src)}</div>)}</div>
  ) : v.galerie === 'grande' && !mobile ? (
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, 1fr)' }}>{photosCabinet.map((src, k) => <div key={k} className="eff-visuel" style={{ gridColumn: k === 0 ? '1 / -1' : undefined }}>{imgGalerie(src, k === 0 ? '16 / 7' : '4 / 3')}</div>)}</div>
  ) : v.galerie === 'bande' ? (
    <div style={{ display: 'grid', gap: 4, gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)' }}>{photosCabinet.map((src, k) => <div key={k} className="eff-visuel">{imgGalerie(src, '3 / 4', 0)}</div>)}</div>
  ) : (
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))' }}>{photosCabinet.map((src, k) => <div key={k} className="eff-visuel">{imgGalerie(src)}</div>)}</div>
  )) : null;
  // Rendez-vous et contact (Coquille.astro, variante « contact ») : actions en liens, jamais de formulaire
  const actionsContact = [
    ...(enLigne ? ['Prendre rendez-vous'] : []), ...(r.aTelephone ? ['Appeler le cabinet'] : []), ...(d.cabinet.email ? ['Écrire au cabinet'] : []), ...(r.aAdresse ? ['Itinéraire'] : []),
  ];
  const actionContact = (a: string, k: number) => <span key={a} className={k === 0 ? 'eff-bouton td-bouton' : 'td-bouton'} style={{ ...bouton(k === 0), minHeight: 52 }}>{a}</span>;
  const contactBloc = (v.contact === 'bandeau' || v.contact === 'carte') && actionsContact.length ? (
    v.contact === 'bandeau' ? (
      <aside style={{ marginTop: 56, padding: mobile ? '28px 0' : '40px 0', background: 'var(--g-aplat)' }}><div style={{ ...cadre, display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: mobile ? 'flex-start' : 'center' }}>{actionsContact.map(actionContact)}</div></aside>
    ) : (
      <aside style={{ ...cadre, marginTop: 56 }}><div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr auto', gap: 18, alignItems: 'center', padding: mobile ? 24 : 40, borderRadius: 'var(--rayon)', background: 'var(--g-doux)', boxShadow: 'inset 0 0 0 1px var(--g-ligne)' }}>
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}><strong style={{ fontFamily: 'var(--police-titres)', fontWeight: 'var(--graisse-titres)' as unknown as number, fontSize: mobile ? 22 : 27 }}>{nomCabinet}</strong>{tel && <span style={{ fontWeight: 650, fontSize: 20 }}>{tel}</span>}{d.cabinet.email && <span style={{ fontWeight: 650, fontSize: 19, overflowWrap: 'anywhere' }}>{d.cabinet.email}</span>}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{actionsContact.map(actionContact)}</div>
      </div></aside>
    )
  ) : null;
  // Téléphone : barre d'actions (barre, bandeau, carte) ou bouton flottant, en position fixe en bas de la fenêtre du téléphone
  // (iframe de l'aperçu), exactement comme Coquille.astro
  const barreMobile = mobile ? <ActionsRapidesApercu a={actionsRapides({ gabarit: village ? 'village' : revue ? 'revue' : 'tableau', contact: v.contact, rdvEnLigne: enLigne, aTelephone: r.aTelephone, aAdresse: r.aAdresse, email: d.cabinet.email, libelleContact: r.libelleContact })} /> : null;
  const montrer = (b: string) => !seul || seul.includes(b);
  // Conseils et actualités (Actus.astro) : liste de titres datés, cartes illustrées, ou le dernier à la une
  const articlesDemo = [{ t: 'Bien choisir ses chaussures de course', s: 'sport', d: '2 octobre 2026', r: 'Amorti, maintien du talon, pointure : les repères avant l’achat.' }, { t: 'Ongle incarné chez l’enfant : les bons gestes', s: 'enfant', d: '18 septembre 2026', r: 'Coupe droite, chaussures à la bonne taille et quand consulter.' }];
  const visuelArticle = (s: string) => <div className="eff-visuel" style={{ aspectRatio: '16 / 9', borderRadius: 'calc(var(--rayon) * 0.65)', background: 'var(--g-doux)', display: 'grid', placeItems: 'center', overflow: 'hidden', '--dessin-trait': 'var(--g-encre)', '--dessin-ligne': 'var(--g-encre)', '--dessin-accent': 'var(--g-accent-texte)' } as CSSProperties}><div className="ap-svg" style={{ width: '70%', height: '90%' }} dangerouslySetInnerHTML={{ __html: themeIllustre(s) ? illustrationTheme(s, { format: 'paysage', registre, id: `ap-art-${s}` }) : '' }} /></div>;
  const actualitesSection = section('Conseils et actualités.', v.actualites === 'cartes' ? (
    <div style={{ display: 'grid', gap: 14, gridTemplateColumns: mobile ? '1fr' : '1fr 1fr' }}>{articlesDemo.map((a) => <div key={a.t} className="eff-carte" style={{ display: 'grid', gap: 8, padding: '14px 14px 22px', borderRadius: 'var(--rayon)', background: 'var(--g-carte)', boxShadow: 'inset 0 0 0 1px var(--g-ligne)' }}>{visuelArticle(a.s)}<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--g-accent-texte)' }}>{a.d}</span><strong className="eff-titre" style={{ fontFamily: 'var(--police-titres)', fontSize: 20, lineHeight: 1.25, justifySelf: 'start' }}>{a.t}</strong><span style={{ color: 'var(--g-encre-douce)', fontSize: 16 }}>{a.r}</span></div>)}</div>
  ) : (
    <div style={{ borderTop: v.actualites === 'liste' ? '1px solid var(--g-ligne)' : undefined }}>{articlesDemo.map((a, k) => (
      v.actualites === 'une' && k === 0
        ? <div key={a.t} style={{ display: 'grid', gap: 8, paddingBottom: 22 }}>{visuelArticle(a.s)}<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--g-accent-texte)' }}>{a.d}</span><strong style={{ fontFamily: 'var(--police-titres)', fontSize: mobile ? 24 : 30, lineHeight: 1.15 }}>{a.t}</strong></div>
        : <div key={a.t} style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '11em 1fr', gap: '4px 24px', padding: '16px 0', borderBottom: '1px solid var(--g-ligne)' }}><span style={{ color: 'var(--g-encre-douce)' }}>{a.d}</span><strong>{a.t}</strong></div>
    ))}</div>
  ));
  // Pied de page (Coquille.astro) : trois colonnes, centré, ou nom du cabinet en grand
  const piedSimple = v.pied === 'simple' || !v.pied;

  const fiche = soins[0] && revue ? (
    <>
      <section style={{ ...cadre, paddingTop: mobile ? 32 : 72 }}>
        <div style={{ maxWidth: 760, marginInline: 'auto', display: 'grid', gap: 14 }}>
          <p style={{ fontSize: 15, color: 'var(--g-encre-douce)', margin: 0 }}>Accueil / Soins / {soins[0].titre_court}</p>
          <p className="ap-h1" style={{ ...h1, margin: 0, fontSize: mobile ? 36 : 56 }}>{soins[0].titre ? avecVille(soins[0].titre, ville) : soins[0].titre_court}</p>
          <p style={{ color: 'var(--g-encre-douce)', fontStyle: 'italic', margin: 0 }}>{avecVille(soins[0].resume, ville)}</p>
          <span className="td-bouton" style={{ ...bouton(true), justifySelf: 'start', boxShadow: 'none' }}>{libelleRdv}</span>
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
            <p className="td-sur" style={sur}>{titreSoins(d.voix)}</p>
            <p className="ap-h1" style={{ ...h1, margin: 0, fontSize: mobile ? 36 : 52 }}>{soins[0].titre ? avecVille(soins[0].titre, ville) : soins[0].titre_court}</p>
            <p style={{ color: 'var(--g-encre-douce)', margin: 0 }}>{avecVille(soins[0].resume, ville)}</p>
            <span className="td-bouton" style={{ ...bouton(true), justifySelf: 'start' }}>{libelleRdv}</span>
          </div>
          <div style={{ aspectRatio: '4 / 3', borderRadius: 16, background: 'var(--g-doux)', display: 'grid', placeItems: 'center', '--dessin-trait': 'var(--g-encre)', '--dessin-accent': 'var(--g-accent-texte)' } as CSSProperties}><div className="ap-svg" style={{ width: '78%', height: '86%' }} dangerouslySetInnerHTML={{ __html: svgDessin(dessinSoin(soins[0].slug), { registre: village ? 'pedagogique' : 'ligne' }) }} /></div>
        </div>
      </section>
      <section style={{ ...cadre, display: 'grid', gridTemplateColumns: mobile || v.fiche !== 'encadre' ? '1fr' : '1fr 300px', gap: 18, paddingTop: 18, maxWidth: v.fiche !== 'encadre' && !mobile ? 832 : undefined }}>
        <div style={{ ...carte, ...(village || v.fiche === 'pratique-haut' ? { background: 'transparent', padding: 0, boxShadow: 'none' } : {}) }}><h2 className="ap-h2" style={{ fontSize: 28 }}>Déroulement de la séance</h2><p style={{ color: 'var(--g-encre-douce)' }}>{avecVille(soins[0].corps ?? soins[0].resume, ville).replace(/[#*_>]/g, '').slice(0, 420)}…</p></div>
        <div className="td-encadre" style={{ ...carte, background: 'var(--g-doux)', boxShadow: 'none', display: v.fiche === 'encadre' ? 'grid' : 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, alignContent: 'start', order: v.fiche === 'pratique-haut' ? -1 : undefined }}><strong style={{ color: 'var(--g-accent-texte)', flexBasis: v.fiche === 'encadre' ? undefined : '100%' }}>En pratique</strong><span style={{ fontSize: 15 }}>{adresse}</span><span style={{ ...bouton(true), textAlign: 'center' }}>{libelleRdv}</span></div>
      </section>
    </>
  );

  return (
    <div style={{ background: 'var(--g-page)', color: 'var(--g-encre)', fontSize: village ? 20 : revue ? 19 : 18, lineHeight: 1.6, paddingBottom: 1 }}>
      {!seul && entete}
      {vue === 'accueil' ? <>{montrer('premier') && premier}{blocs.filter(montrer).map((b) => <div key={b} className="eff-section">{b === 'sujets' ? sujetsSection : b === 'competences' ? soinsSection : b === 'acces' ? accesSection : b === 'faq' ? faqSection : b === 'praticiens' ? equipeSection : b === 'galerie' ? galerieSection : b === 'actualites' ? actualitesSection : null}</div>)}</>
        : vue === 'soin' ? fiche
        : vue === 'theme' ? pageSujet
        : vue === 'article' ? pageArticle
        // Pages internes (studio, onglets) : les blocs de la page, avec l'en-tête et le pied du site
        : <div className="eff-section" style={{ paddingTop: 8 }}>{vue === 'actualites' ? actualitesSection : vue === 'cabinet' ? <>{equipeSection}{galerieSection}</> : vue === 'acces' ? accesSection : vue === 'questions' ? faqSection : <>{sujetsSection}{soinsSection}</>}</div>}
      {seul?.includes('actualites') && !blocs.includes('actualites') && actualitesSection}
      {seul?.includes('galerie') && !blocs.includes('galerie') && galerieSection}
      {montrer('contact') && contactBloc}
      {montrer('pied') && <footer style={{ marginTop: revue ? 0 : 64, padding: '44px 0 28px', background: revue ? 'var(--g-page)' : village ? 'var(--g-doux)' : 'var(--g-sombre)', color: village || revue ? 'var(--g-encre-douce)' : 'var(--g-sombre-doux)', borderTop: revue ? '3px double var(--g-encre)' : village ? '2px solid var(--g-encre)' : undefined }}>
        <div style={{ ...cadre, textAlign: v.pied === 'centre' ? 'center' : undefined }}><strong style={{ display: 'block', color: village || revue ? 'var(--g-encre)' : 'var(--g-sombre-texte)', fontFamily: revue || v.pied === 'large' ? 'var(--police-titres)' : undefined, fontStyle: revue ? 'italic' : undefined, fontSize: v.pied === 'large' ? (mobile ? 28 : 42) : undefined, lineHeight: v.pied === 'large' ? 1.1 : undefined, letterSpacing: v.pied === 'large' ? '-0.025em' : undefined }}>{nomCabinet}</strong><p style={{ margin: '8px 0 0', fontSize: 15 }}>{[adresse, tel].filter(Boolean).join(' · ')}</p>{!piedSimple && <p style={{ margin: '14px 0 0', fontSize: 15, display: 'flex', flexWrap: 'wrap', gap: '4px 22px', justifyContent: v.pied === 'centre' ? 'center' : 'flex-start', textDecoration: 'underline' }}>{menu.map((l) => <span key={l}>{l}</span>)}<span>Mentions légales</span></p>}<p style={{ margin: '20px 0 0', fontSize: 13 }}>Illustrations : représentations schématiques, sans valeur de mesure</p></div>
      </footer>}
      {montrer('contact') && barreMobile}
      {seul?.includes('contact') && !contactBloc && !barreMobile && <p style={{ ...cadre, padding: '24px 0', color: 'var(--g-encre-douce)' }}>{v.contact === 'flottant' ? 'Bouton flottant : visible sur téléphone.' : 'Barre d’actions : visible sur téléphone.'}</p>}
    </div>
  );
}
