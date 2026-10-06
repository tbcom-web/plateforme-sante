'use client';

// Aperçu du thème : rendu à l'échelle réelle (1280 px ou 390 px, réduit pour tenir dans la colonne) de
// l'accueil ou d'une fiche de soin, avec les mêmes sources que le générateur de sites : jetons du modèle,
// gamme, charte, jeu visuel de la spécialité et règles du style visuel (rendreCase), marque du logo.
// Le contenu est celui du formulaire ; seules les sections du modèle et leur ordre changent d'un modèle à l'autre.
// Informations manquantes : mêmes REPLIS que le site publié (replisApercu, packages/core/src/replis.ts) : sans ville, titre
// sans « à » ; sans téléphone publiable, pas de bouton « Appeler » ; adresse incomplète, « Adresse communiquée à la prise de
// rendez-vous » ; aucun soin coché, soins par défaut de la spécialité (soinsParDefaut). Jamais de valeur fictive.
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/schibsted-grotesk';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/instrument-serif';
import '@fontsource-variable/nunito';
import '@fontsource-variable/geist';
import '@fontsource-variable/public-sans';
import '@fontsource-variable/bodoni-moda/wght.css';
import '@fontsource-variable/bodoni-moda/wght-italic.css';
import '@fontsource-variable/newsreader/wght.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import '@plateforme/core/dessins.css';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  completerJeuVisuel, construireNavigation, ordonnerSoins, couleursImportee, couleursMarque, faitEquipement, initiales, jeuVisuel, persoDuJeuPhotos, PAYS, POLICES, registreModele, rendreCase, SURFACES_CSS, svgAnimationFixe,
  svgDessin, svgMarque, svgMarqueImportee, traitementLogo, variablesCharte, variablesTheme, variablesGabarit, gabaritModele, visuelSoinJeu,
  avecVille, horairesRenseignes, replisApercu, soinsParDefaut, titreSoins, REPLIS, illustrationTheme, themeIllustre, themeParId, packVisuel,
  type Animation, type FormatHeros, type JeuPhotos, type MarqueImportee, type ModeleManifeste, type Registre, type Rendu, type SiteDraft,
} from '@plateforme/core';
import type { SoinCatalogue } from '@/lib/sites';
import ApercuGabarit, { HerosVue, type HerosApercu } from './ApercuGabarit';

type Props = {
  draft: SiteDraft; modele: ModeleManifeste; catalogue: SoinCatalogue[]; marquesImportees: MarqueImportee[];
  /** Jeu de photos affecté au site (enregistré), appliqué tant que la spécialité correspond */
  jeuPhotos?: JeuPhotos | null;
  /** Appareil affiché à l'ouverture (ordinateur par défaut) */
  appareil?: Appareil;
  /** Vignette (catalogue du parcours) : haut de l'accueil seulement, sur cette hauteur en pixels, sans commandes */
  vignette?: number;
  /** Rendu plein écran (RenduPlein) : page sur toute sa hauteur, sans défilement propre (une seule zone de défilement) */
  plein?: boolean;
  /** Admin : nom interne du modèle et jeu visuel affichés dans la barre (jamais côté praticien) */
  technique?: boolean;
};
type Vue = 'accueil' | 'soin';
export type Appareil = 'bureau' | 'mobile';

const LARGEUR: Record<Appareil, number> = { bureau: 1280, mobile: 390 };
const FILTRES: Record<string, string> = {
  naturel: 'none',
  chaud: 'sepia(0.22) saturate(1.1) hue-rotate(-8deg) contrast(1.02)',
  doux: 'saturate(0.72) brightness(1.06) contrast(0.92)',
  contraste: 'contrast(1.12) saturate(0.88) brightness(0.96)',
};
const SECTIONS_LIBELLES: Record<string, string> = {
  faits: 'En bref', etapes: 'Premier rendez-vous', competences: 'Soins', panorama: 'Le lieu', praticiens: 'Praticiens',
  galerie: 'Le cabinet', actualites: 'Actualités', acces: 'Accès et horaires', faq: 'Questions fréquentes',
};

/** Visuel d'une case : photo traitée, dessin sur grille, ou image fixe de l'animation sur fond plan */
function Visuel({ rendu, filtre, hauteur, rayon = 0, sombre = false, registre = 'releve' }: { rendu: Rendu; filtre: string; hauteur: number | string; rayon?: number; sombre?: boolean; registre?: Registre }) {
  const cadre: CSSProperties = { height: hauteur, borderRadius: rayon, overflow: 'hidden', position: 'relative' };
  if (rendu.type === 'photo') {
    // eslint-disable-next-line @next/next/no-img-element
    return <div style={cadre}><img src={rendu.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: rendu.cadrage, filter: filtre }} /></div>;
  }
  const svg = rendu.type === 'animation' ? svgAnimationFixe(rendu.animation, { registre }) : svgDessin(rendu.dessin, { registre });
  // Registre pédagogique : schéma calme sur fond doux, jamais de plan sombre ni d'indication « animé »
  if (registre === 'pedagogique') {
    return <div style={{ ...cadre, display: 'grid', placeItems: 'center', background: 'var(--doux)' }}><div className="ap-svg" style={{ width: '78%', height: '86%' }} dangerouslySetInnerHTML={{ __html: svg }} /></div>;
  }
  const plan = sombre || rendu.type === 'animation';
  return (
    <div className={plan ? 'surface-plan' : 'surface-grille'} style={{ ...cadre, display: 'grid', placeItems: 'center' }}>
      <div className="ap-svg" style={{ width: '78%', height: '86%' }} dangerouslySetInnerHTML={{ __html: svg }} />
      {rendu.type === 'animation' && <span className="ap-mono" style={{ position: 'absolute', left: 14, bottom: 10, color: 'var(--signal)', fontSize: 11 }}>● animé</span>}
    </div>
  );
}

/** Animation du sujet n° 1 à l'accueil Technique (lib/vitrine.ts du site, DESSINS_THEME) */
const ANIMATION_SUJET: Record<string, Animation> = { sport: 'coureur', enfant: 'premiers-pas', semelles: 'semelle' };

export default function ApercuTheme({ draft: d, modele: m, catalogue, marquesImportees, jeuPhotos, appareil: appareilInitial = 'bureau', vignette, plein = false, technique = false }: Props) {
  const [vue, setVue] = useState<Vue>('accueil');
  const [appareil, setAppareil] = useState<Appareil>(appareilInitial);
  const boite = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const [echelle, setEchelle] = useState(0.4);
  const [hauteur, setHauteur] = useState(800);

  useEffect(() => {
    const maj = () => {
      if (boite.current) setEchelle(Math.min(1, boite.current.clientWidth / LARGEUR[appareil]));
      if (page.current) setHauteur(page.current.scrollHeight);
    };
    maj();
    const ro = new ResizeObserver(maj);
    if (boite.current) ro.observe(boite.current);
    if (page.current) ro.observe(page.current);
    return () => ro.disconnect();
  }, [appareil, vue]);

  const mobile = appareil === 'mobile';
  const j = m.jetons;
  // Registre des illustrations du modèle : relevé (trame, lectures, plan sombre) ou pédagogique (schémas au trait, fonds clairs)
  const registre = registreModele(m);
  const pedago = registre === 'pedagogique';
  const filtre = FILTRES[j.images] ?? 'none';
  const mode = d.theme.modeVisuel;
  const jeu = useMemo(() => {
    // Jeu de photos du site : un jeu partagé ne vaut que pour sa spécialité (un nouveau tirage suit l'enregistrement).
    const perso = jeuPhotos && (jeuPhotos.siteId || jeuPhotos.specialite === d.theme.specialite) ? persoDuJeuPhotos(jeuPhotos) : null;
    return completerJeuVisuel(jeuVisuel(d.theme.specialite, d.theme.specialiteSecondaire || null, perso), perso);
  }, [d.theme.specialite, d.theme.specialiteSecondaire, jeuPhotos]);

  const style = useMemo(() => {
    const v: Record<string, string> = {
      ...variablesCharte(),
      ...variablesTheme(m, { couleur: d.theme.couleur, gamme: d.theme.gamme || null }),
      // Gabarits tableau, village… : couleurs dérivées de la couleur du cabinet, garde-fous de contraste (vide en classique)
      ...variablesGabarit(m, { couleur: d.theme.couleur, gamme: d.theme.gamme || null }),
      '--rayon': `${j.rayon}px`,
      '--rayon-bouton': { pilule: '999px', arrondi: '12px', carre: '2px' }[j.boutons],
      '--graisse-titres': String(j.graisseTitres),
      '--police-titres': POLICES[j.policeTitres],
      '--police-texte': POLICES[j.policeTexte],
      ...(pedago ? { '--police-mono': POLICES[j.policeTexte] } : {}),
    };
    if (!v['--doux']) v['--doux'] = 'var(--accent-tres-pale)';
    if (m.pied === 'accent') v['--pied'] = 'var(--accent-fonce)';
    return v as CSSProperties;
  }, [m, j, pedago, d.theme.couleur, d.theme.gamme]);

  // Contenu tiré du formulaire, avec les replis du site publié (jamais « Votre ville » ni « 00 00 00 00 00 »)
  const lieu = d.lieux[0];
  const r = replisApercu(d);
  const ville = r.ville;
  const suffixeVille = r.aVille ? ` ${r.aVille}` : '';
  const titre = PAYS.find((p) => p.value === d.pays)?.titre ?? 'Pédicure-podologue';
  const noms = r.noms;
  const nomCabinet = r.nomCabinet;
  const surTitre = [titre, ville].filter(Boolean).join(' · ');
  const presentation = noms.length ? `${noms.join(', ')}, ${titre.toLowerCase()}.` : `${REPLIS.equipe} accueille les patients${suffixeVille}.`;
  // Soins cochés ; sans soin coché, ceux que le site présentera (soinsParDefaut) ; ceux mis en avant passent devant
  // (même règle que le site : ordonnerSoins).
  const slugsSoins = d.soins.length ? d.soins : soinsParDefaut({ ...d.theme, priorites: d.priorites }, catalogue.map((c) => c.slug));
  const soins = ordonnerSoins(catalogue.filter((s) => slugsSoins.includes(s.slug)), d.theme.soinsEnAvant);
  const soinsAffiches = soins.slice(0, 6);
  const soinPage = soinsAffiches[0];
  const rdv = r.rdvEnLigne ? 'Prendre rendez-vous' : r.libelleContact;

  // Logo : marque intégrée ou importée, traitée selon le modèle ; logo personnel s'il existe
  const traitement = traitementLogo(m);
  const couleurs = couleursMarque(m, { couleur: d.theme.couleur, gamme: d.theme.gamme || null });
  const importee = marquesImportees.find((x) => x.id === d.theme.logo.marque);
  const sigle = initiales(nomCabinet).replace(/[^\p{L}]/gu, '');
  const marque = importee
    ? svgMarqueImportee(importee, couleursImportee(traitement.marque, couleurs, traitement.rayon), 40)
    : svgMarque(d.theme.logo.marque, couleurs, { traitement: traitement.marque, rayon: traitement.rayon, epais: traitement.epais, taille: 40, initiales: sigle, police: traitement.police, graisse: traitement.graisse });

  // Visuels selon le jeu de la spécialité et le style visuel
  const accueil = rendreCase(jeu.accueil, mode, 'accueil', { photoPraticien: d.photos.accueil || undefined, animationActive: d.theme.animation });
  const panorama = rendreCase(jeu.panorama, mode, 'liste', { photoPraticien: d.photos.panorama || d.photos.cabinet[0] || undefined });
  const galerie = mode === 'illustrations' ? d.photos.cabinet : [...d.photos.cabinet, ...jeu.galerie.map((g) => g.photo)].slice(0, 4);
  // Héros du sujet n° 1 (même règle que le site : lib/vitrine.ts, VisuelTheme, HeroDiaporama) : photo du sujet en style
  // « photos » (celle du praticien d'abord), sinon l'illustration composée du thème (heros-themes.ts) dans le registre du site ;
  // accueil Technique en relevé : image fixe de l'animation choisie (proposition), sinon celle du sujet, sinon le podoscope.
  const themeUn = construireNavigation(d, soins).principaux[0]?.theme.id ?? null;
  const herosApercu = (format: FormatHeros, registreForce?: Registre, animer = false): HerosApercu | null => {
    if (mode === 'photos') {
      const spec = themeParId(themeUn)?.specialite ?? jeu.specialite;
      const src = d.photos.accueil || (spec === jeu.specialite ? jeu.accueil.photo : packVisuel(spec).photos.accueil);
      return src ? { type: 'photo', src } : null;
    }
    const r = registreForce ?? registre;
    if (animer && r === 'releve' && d.theme.animation) {
      const a: Animation = d.theme.animationAccueil ?? (themeUn ? ANIMATION_SUJET[themeUn] : undefined) ?? 'podoscope';
      return { type: 'svg', html: svgAnimationFixe(a, { registre: 'releve', id: `ap-anim-${a}` }), sombre: true };
    }
    if (!themeUn || !themeIllustre(themeUn)) return null;
    const gammeHeros = j.teinte === 'gamme' && r === 'releve' ? null : d.theme.gamme || null;
    return { type: 'svg', html: illustrationTheme(themeUn, { format, registre: r, gamme: gammeHeros, id: `ap-h-${themeUn}-${format[0]}-${r[0]}` }), sombre: r === 'releve' };
  };
  const transparent = m.entete === 'transparent' && (m.accueil.hero === 'plein' || m.accueil.hero === 'diaporama') && vue === 'accueil';

  const Sur = ({ n, children }: { n?: number; children: ReactNode }) => (
    <p className="ap-sur">{n !== undefined && !pedago && <span className="ap-mono" style={{ opacity: 0.7 }}>{String(n).padStart(2, '0')} —</span>}{children}</p>
  );

  // Accueil « diaporama » (modèle Technique) : le héros du sujet n° 1 ; en style « photos », la photo du sujet plein cadre
  const herosDiaporama = m.accueil.hero === 'diaporama' && mode !== 'photos' ? herosApercu(mobile ? 'portrait' : 'paysage', undefined, true) : null;
  const photoDiaporama = m.accueil.hero === 'diaporama' && mode === 'photos' ? herosApercu('paysage') : null;
  const renduPlein: Rendu = photoDiaporama?.type === 'photo' ? { type: 'photo', src: photoDiaporama.src, cadrage: '50% 50%' } : accueil;
  const titreHero = <>Cabinet de {d.pays === 'FR' ? 'pédicurie-podologie' : 'podologie'}{r.aVille && <> <span className="ap-pale">{r.aVille}</span></>}</>;
  const heroPlein = (
    <section style={{ position: 'relative', minHeight: mobile ? 560 : 640, display: 'grid', alignItems: 'end', color: 'var(--blanc)' }}>
      {/* Photo : plein cadre sous un voile ; dessin ou animation : fond plan, visuel à droite du titre */}
      {renduPlein.type === 'photo'
        ? <div style={{ position: 'absolute', inset: 0 }}><Visuel registre={registre} rendu={renduPlein} filtre={filtre} hauteur="100%" /></div>
        : <div className="surface-plan" style={{ position: 'absolute', inset: 0 }}><div style={herosDiaporama ? (mobile ? { position: 'absolute', top: 84, left: '4%', right: '4%', height: 330 } : { position: 'absolute', inset: '96px 3% 48px 52%' }) : { position: 'absolute', inset: mobile ? '90px 0 260px 0' : '80px 0 0 44%' }}>{herosDiaporama ? <HerosVue h={herosDiaporama} /> : <Visuel registre={registre} rendu={accueil} filtre={filtre} hauteur="100%" sombre />}</div></div>}
      {renduPlein.type === 'photo' && <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgb(0 0 0 / ${m.accueil.voile / 200}) 0%, rgb(0 0 0 / ${m.accueil.voile / 100}) 100%)` }} />}
      {/* Héros du sujet n° 1 (Technique) : bloc au-dessus du titre sur téléphone, moitié droite sur ordinateur (comme le site) */}
      <div className="ap-cadre" style={{ position: 'relative', paddingBlock: mobile ? (herosDiaporama ? '430px 40px' : '120px 40px') : '160px 64px' }}>
        <p className="ap-sur" style={{ color: 'var(--blanc)' }}>{surTitre}</p>
        <p className="ap-h1" style={{ color: 'var(--blanc)', maxWidth: herosDiaporama && !mobile ? '48%' : '14ch' }}>{titreHero}</p>
        <p style={{ maxWidth: '46ch', opacity: 0.88, marginTop: 18 }}>{presentation}</p>
        <span className="ap-bouton" style={{ background: 'var(--blanc)', color: 'var(--encre)', marginTop: 12 }}>{rdv}</span>
      </div>
    </section>
  );
  const heroScinde = (
    <section className="ap-cadre" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.05fr 0.95fr', gap: mobile ? 28 : 56, alignItems: 'center', paddingBlock: mobile ? '36px 48px' : '72px 96px' }}>
      <div>
        <Sur>{surTitre}</Sur>
        <p className="ap-h1">{titreHero}</p>
        <p className="ap-chapo">{presentation}</p>
        <span className="ap-bouton ap-bouton--plein">{rdv}</span>
      </div>
      <Visuel registre={registre} rendu={accueil} filtre={filtre} hauteur={mobile ? 300 : 460} rayon={Math.round(j.rayon * 1.3)} />
    </section>
  );

  // Accueil « lieu » (modèle Simple et pédagogique) : photo du lieu (praticien, sinon jeu de photos de la spécialité,
  // quel que soit le style visuel), carte claire avec titre, téléphone et rendez-vous ; sans photo, schéma pédagogique.
  const photoLieu = d.photos.accueil || d.photos.panorama || d.photos.cabinet[0] || jeu.accueil.photo;
  const tel = r.telephone;
  const heroLieu = (
    <section style={{ paddingTop: 16 }}>
      <div className="ap-cadre">
        <Visuel registre={registre} rendu={photoLieu ? { type: 'photo', src: photoLieu, cadrage: '50% 50%' } : { type: 'dessin', dessin: jeu.accueil.dessin }} filtre={filtre} hauteur={mobile ? 260 : 460} rayon={Math.round(j.rayon * 1.3)} />
      </div>
      <div className="ap-cadre" style={{ position: 'relative', marginTop: mobile ? -40 : -120 }}>
        <div style={{ background: 'var(--fond)', borderRadius: Math.round(j.rayon * 1.3), boxShadow: '0 18px 40px -24px rgb(0 0 0 / 0.35)', padding: mobile ? 22 : 40, display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.25fr 0.75fr', gap: mobile ? 18 : 40, alignItems: 'end' }}>
          <div>
            <p style={{ fontWeight: 700, color: 'var(--accent-vif)', margin: '0 0 8px' }}>{titre}{suffixeVille}</p>
            <p className="ap-h1">{titreHero}</p>
            <p className="ap-chapo" style={{ marginBottom: 0 }}>{presentation}</p>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {r.rdvEnLigne && <span className="ap-bouton ap-bouton--plein" style={{ minHeight: 58 }}>Prendre rendez-vous</span>}
            {r.aTelephone
              ? <span className={`ap-bouton ${r.rdvEnLigne ? '' : 'ap-bouton--plein'}`} style={{ minHeight: 58, boxShadow: r.rdvEnLigne ? 'inset 0 0 0 1.5px var(--ligne)' : undefined }}>☏ {tel}</span>
              : !r.rdvEnLigne && <span className="ap-bouton ap-bouton--plein" style={{ minHeight: 58 }}>{r.libelleContact}</span>}
            <p style={{ margin: '8px 0 0', color: 'var(--encre-douce)', fontSize: 16 }}>{r.adresse}</p>
          </div>
        </div>
      </div>
    </section>
  );

  const sections: Record<string, (n: number, douce: boolean) => ReactNode> = {
    etapes: (n, douce) => (
      <section className={`ap-section ${douce ? 'ap-douce' : ''}`} style={{ paddingBlock: 64 }}>
        <div className="ap-cadre">
          <Sur n={n}>{SECTIONS_LIBELLES.etapes}</Sur>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: 18 }}>
            {[
              ['Prendre rendez-vous', `${r.phraseRdv}${r.rdvEnLigne && r.aTelephone ? `, ou par téléphone au ${tel}` : ''}.`],
              ['Venir au cabinet', `${r.adresse}.`],
              ['La consultation', 'Chaque consultation commence par un échange et un examen, afin de proposer des soins adaptés à chacun.'],
            ].map(([t, x], k) => (
              <div key={t} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0 14px', padding: 20, borderRadius: j.rayon, background: douce ? 'var(--fond)' : 'var(--doux)' }}>
                <span style={{ gridRow: 'span 2', width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--accent)', color: 'var(--blanc)', fontWeight: 800 }}>{k + 1}</span>
                <strong className="ap-h3">{t}</strong>
                <span style={{ color: 'var(--encre-douce)' }}>{x}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    faits: (n, douce) => (
      <section className={`ap-section ${douce ? 'ap-douce' : ''}`}>
        <div className="ap-cadre">
          <Sur n={n}>{SECTIONS_LIBELLES.faits}</Sur>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 0, borderTop: 'var(--filet-fort) solid var(--encre)' }}>
            {[[String(Math.max(1, noms.length)), noms.length > 1 ? 'praticiens' : 'praticien'], [String(soins.length), 'soins'], ...(ville ? [[ville, 'ville']] : []), [r.rdvEnLigne ? '24h/24' : r.aTelephone ? 'Tél.' : 'Cabinet', 'rendez-vous']].map(([v, l]) => (
              <div key={l} style={{ padding: '18px 16px 0 0' }}>
                <p className="ap-h2" style={{ fontSize: 34, margin: 0 }}>{v}</p>
                <p className="ap-mono" style={{ color: 'var(--encre-douce)' }}>{l}</p>
              </div>
            ))}
          </div>
          {faitEquipement(d.equipements ?? []) && <p className="ap-mono" style={{ margin: '14px 0 0', paddingTop: 12, borderTop: 'var(--filet) solid var(--ligne)', color: 'var(--encre-douce)' }}>{faitEquipement(d.equipements ?? [])}</p>}
        </div>
      </section>
    ),
    competences: (n, douce) => (
      <section className={`ap-section ${douce ? 'ap-douce' : ''}`}>
        <div className="ap-cadre">
          <Sur n={n}>{SECTIONS_LIBELLES.competences}</Sur>
          <h2 className="ap-h2">{titreSoins(d.voix)}</h2>
          {m.competences === 'cartes' ? (
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: 18 }}>
              {soinsAffiches.map((s) => {
                const r = rendreCase(visuelSoinJeu(jeu, s.slug), mode, 'liste');
                return (
                  <div key={s.slug} className="ap-carte">
                    <Visuel registre={registre} rendu={r} filtre={filtre} hauteur={150} rayon={Math.max(0, j.rayon - 6)} />
                    <h3 className="ap-h3" style={{ marginTop: 14 }}>{s.titre_court}</h3>
                    <p style={{ color: 'var(--encre-douce)', fontSize: 15, margin: '6px 0 0' }}>{s.resume.slice(0, 96)}…</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, borderTop: 'var(--filet) solid var(--ligne)' }}>
              {soinsAffiches.map((s, k) => {
                const r = rendreCase(visuelSoinJeu(jeu, s.slug), mode, 'liste');
                return (
                  <li key={s.slug} style={{ display: 'grid', gridTemplateColumns: mobile ? '40px 1fr' : '60px 1fr 1.2fr 120px', gap: 20, alignItems: 'center', padding: '18px 0', borderBottom: 'var(--filet) solid var(--ligne)' }}>
                    <span className="ap-mono" style={{ color: 'var(--encre-pale)' }}>{String(k + 1).padStart(2, '0')}</span>
                    <h3 className="ap-h3">{s.titre_court}</h3>
                    {!mobile && <p style={{ color: 'var(--encre-douce)', fontSize: 15, margin: 0 }}>{s.resume.slice(0, 90)}…</p>}
                    {!mobile && <Visuel registre={registre} rendu={r} filtre={filtre} hauteur={72} rayon={Math.max(0, j.rayon - 8)} />}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>
    ),
    panorama: (n) => pedago ? (
      <section className="ap-section ap-douce">
        <div className="ap-cadre">
          <Sur>Le lieu d’exercice</Sur>
          <p className="ap-h2" style={{ margin: 0 }}>{`${lieu?.nom || 'Le cabinet'}${suffixeVille}`}</p>
        </div>
      </section>
    ) : (
      <section style={{ position: 'relative' }}>
        <Visuel registre={registre} rendu={panorama} filtre={filtre} hauteur={mobile ? 260 : 420} sombre />
        <div className="ap-cadre" style={{ position: 'absolute', left: 0, right: 0, bottom: 28, color: 'var(--blanc)' }}>
          <p className="ap-sur" style={{ color: 'var(--blanc)' }}><span className="ap-mono" style={{ opacity: 0.7 }}>{String(n).padStart(2, '0')} —</span>Le lieu d’exercice</p>
          <p className="ap-h2" style={{ color: 'var(--blanc)', margin: 0 }}>{`${lieu?.nom || 'Le cabinet'}${suffixeVille}`}</p>
        </div>
      </section>
    ),
    praticiens: (n, douce) => (
      <section className={`ap-section ${douce ? 'ap-douce' : ''}`}>
        <div className="ap-cadre">
          <Sur n={n}>{SECTIONS_LIBELLES.praticiens}</Sur>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap: 18 }}>
            {d.praticiens.filter((p) => p.nom.trim()).map((p) => (
              <div key={p.id} className="ap-carte" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-pale)', color: 'var(--accent-fonce)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>{initiales(`${p.prenom} ${p.nom}`) || '·'}</span>
                <span><strong style={{ display: 'block' }}>{[p.prenom, p.nom].filter(Boolean).join(' ') || 'Praticien'}</strong><span className="ap-mono" style={{ color: 'var(--encre-douce)' }}>{titre}</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    galerie: (n, douce) => galerie.length === 0 ? null : (
      <section className={`ap-section ${douce ? 'ap-douce' : ''}`}>
        <div className="ap-cadre">
          <Sur n={n}>{SECTIONS_LIBELLES.galerie}</Sur>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : '2fr 1fr 1fr', gap: 12 }}>
            {galerie.map((src, k) => <Visuel registre={registre} key={src + k} rendu={{ type: 'photo', src, cadrage: '50% 50%' }} filtre={filtre} hauteur={k === 0 && !mobile ? 300 : 144} rayon={j.rayon} />)}
          </div>
        </div>
      </section>
    ),
    actualites: (n, douce) => (
      <section className={`ap-section ${douce ? 'ap-douce' : ''}`}>
        <div className="ap-cadre">
          <Sur n={n}>{SECTIONS_LIBELLES.actualites}</Sur>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 18 }}>
            {['Choisir ses chaussures de course', 'Le pied de l’enfant qui grandit'].map((t, k) => (
              <div key={t}>
                <Visuel registre={registre} rendu={mode === 'photos' ? { type: 'photo', src: jeu.galerie[k + 1]?.photo ?? jeu.accueil.photo, cadrage: '50% 50%' } : { type: 'dessin', dessin: k ? 'enfant' : jeu.couverture }} filtre={filtre} hauteur={180} rayon={j.rayon} />
                <p className="ap-mono" style={{ color: 'var(--encre-pale)', marginTop: 12 }}>Conseil · 4 min</p>
                <h3 className="ap-h3">{t}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    acces: (n, douce) => (
      <section className={`ap-section ${douce ? 'ap-douce' : ''}`}>
        <div className="ap-cadre" style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 40 }}>
          <div>
            <Sur n={n}>{SECTIONS_LIBELLES.acces}</Sur>
            <p className="ap-h3">{r.aAdresse ? <>{r.rue}<br />{lieu?.codePostal} {lieu?.ville}</> : r.adresse}</p>
            {r.aTelephone && <p style={{ marginTop: 10 }}>{tel}</p>}
          </div>
          {!horairesRenseignes(lieu?.horaires ?? []) ? <p className="ap-h3">{lieu?.surRendezVous ? 'Sur rendez-vous uniquement' : REPLIS.horaires}</p> : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <tbody>
              {(lieu?.horaires ?? []).map(({ jour, heures: h }) => {
                return (
                  <tr key={jour} style={{ borderBottom: 'var(--filet) solid var(--ligne)' }}>
                    <td style={{ padding: '8px 0', textTransform: 'capitalize' }}>{jour}</td>
                    <td className="ap-mono" style={{ padding: '8px 0', textAlign: 'right', color: h ? 'var(--encre)' : 'var(--encre-pale)' }}>{h || 'Fermé'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>}
        </div>
      </section>
    ),
    faq: (n, douce) => (
      <section className={`ap-section ${douce ? 'ap-douce' : ''}`}>
        <div className="ap-cadre">
          <Sur n={n}>{SECTIONS_LIBELLES.faq}</Sur>
          {['Faut-il une ordonnance ?', 'Les semelles sont-elles remboursées ?'].map((q) => (
            <p key={q} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: 'var(--filet) solid var(--ligne)', margin: 0, fontWeight: 600 }}>{q}<span>+</span></p>
          ))}
        </div>
      </section>
    ),
  };

  const ficheSoin = soinPage && (() => {
    const r = rendreCase(visuelSoinJeu(jeu, soinPage.slug), mode, 'page', { animationActive: true });
    return (
      <>
        <section className="ap-cadre" style={{ paddingBlock: mobile ? '24px 40px' : '40px 80px' }}>
          <p className="ap-mono" style={{ color: 'var(--encre-pale)' }}>Accueil / Soins / {soinPage.titre_court}</p>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.1fr 0.9fr', gap: 40, alignItems: 'end', borderTop: 'var(--filet-fort) solid var(--encre)', paddingTop: 24, marginTop: 16 }}>
            <div>
              <p className="ap-sur">{!pedago && <span className="ap-mono" style={{ opacity: 0.7 }}>01 / {String(soinsAffiches.length).padStart(2, '0')} —</span>}{titreSoins(d.voix)}</p>
              <p className="ap-h1" style={{ fontSize: mobile ? 40 : 64 }}>{soinPage.titre ? avecVille(soinPage.titre, ville) : soinPage.titre_court}</p>
              <p className="ap-chapo">{soinPage.resume}</p>
            </div>
            <Visuel registre={registre} rendu={r} filtre={filtre} hauteur={mobile ? 240 : 340} rayon={Math.round(j.rayon * 1.3)} />
          </div>
        </section>
        <section className="ap-section ap-douce">
          <div className="ap-cadre" style={{ maxWidth: 760 }}>
            <h2 className="ap-h2" style={{ fontSize: 30 }}>Déroulement de la séance</h2>
            <p style={{ color: 'var(--encre-douce)' }}>{avecVille(soinPage.corps ?? soinPage.resume, ville).replace(/[#*_>]/g, '').slice(0, 420)}…</p>
          </div>
        </section>
      </>
    );
  })();

  const pied = (
    <footer className="ap-pied" style={{ background: m.pied === 'clair' ? 'var(--doux)' : m.pied === 'accent' ? 'var(--accent-fonce)' : 'var(--encre)', color: m.pied === 'clair' ? 'var(--encre)' : 'var(--sur-sombre-doux)' }}>
      <div className="ap-cadre" style={{ paddingBlock: 48 }}>
        <p className="ap-h2" style={{ color: 'inherit', fontSize: mobile ? 28 : 40 }}>{r.rdvEnLigne ? 'Prendre rendez-vous en ligne' : r.aTelephone ? 'Prendre rendez-vous par téléphone' : REPLIS.rdvCabinet}</p>
        <p className="ap-mono" style={{ opacity: 0.7, marginTop: 24 }}>© {nomCabinet} · Illustrations : représentations schématiques, sans valeur de mesure</p>
      </div>
    </footer>
  );

  const ordre = m.accueil.sections;
  let douce = false;

  return (
    <div className={vignette ? 'overflow-hidden bg-white' : 'overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm'}>
      <style>{CSS + SURFACES_CSS}</style>
      {/* Commandes simples : la page montrée et l'appareil ; jamais le nom interne du modèle côté praticien */}
      {!vignette && <div className="flex flex-wrap items-center gap-2 border-b border-black/5 bg-neutral-50 px-3 py-2 text-xs">
        {technique && <span className="mr-auto truncate text-neutral-500">Modèle <strong className="text-neutral-800">{m.nom}</strong> · {jeu.label}</span>}
        <span role="group" aria-label="Page montrée" className={`flex gap-1 ${technique ? '' : 'mr-auto'}`}>
          {(['accueil', 'soin'] as Vue[]).map((v) => (
            <button key={v} type="button" onClick={() => setVue(v)} aria-pressed={vue === v} className={`min-h-9 rounded-md px-2.5 py-1 ${vue === v ? 'bg-white font-semibold shadow-sm ring-1 ring-black/10' : 'text-neutral-600'}`}>{v === 'accueil' ? 'Accueil' : 'Une page soin'}</button>
          ))}
        </span>
        <span role="group" aria-label="Appareil" className="flex gap-1">
          {(['bureau', 'mobile'] as Appareil[]).map((a) => (
            <button key={a} type="button" onClick={() => setAppareil(a)} aria-pressed={appareil === a} className={`min-h-9 rounded-md px-2.5 py-1 ${appareil === a ? 'bg-white font-semibold shadow-sm ring-1 ring-black/10' : 'text-neutral-600'}`}>{a === 'bureau' ? 'Ordinateur' : 'Téléphone'}</button>
          ))}
        </span>
      </div>}
      <div ref={boite} className={vignette ? 'overflow-hidden bg-neutral-100' : plein ? 'overflow-x-hidden bg-neutral-100' : 'max-h-[78vh] overflow-y-auto overflow-x-hidden bg-neutral-100'} style={vignette ? { height: vignette } : undefined}>
        <div style={{ height: hauteur * echelle, width: LARGEUR[appareil] * echelle, margin: '0 auto', position: 'relative' }}>
          <div
            ref={page}
            className="ap"
            data-motif={j.motif ?? 'plan'}
            data-titres={j.policeTitres}
            data-registre={registre}
            style={{ ...style, width: LARGEUR[appareil], transform: `scale(${echelle})`, transformOrigin: '0 0', position: 'absolute', top: 0, left: 0 }}
          >
            {gabaritModele(m) !== 'classique' ? (
              <ApercuGabarit draft={d} modele={m} soins={soinsAffiches} mobile={mobile} heros={herosApercu(gabaritModele(m) === 'village' ? 'paysage' : 'portrait', gabaritModele(m) === 'tableau' && !d.theme.styleIllustration ? 'releve' : undefined)} vue={vue} nomCabinet={nomCabinet} titre={titre} replis={r} dessinSoin={(slug) => visuelSoinJeu(jeu, slug).dessin}
                marque={d.theme.logoPerso.url ? <img src={d.theme.logoPerso.url} alt="" style={{ height: 40 }} /> : <span dangerouslySetInnerHTML={{ __html: marque }} />} />
            ) : (<>
            <header className={`ap-entete ${transparent ? 'ap-entete--transparent' : ''}`}>
              <div className="ap-cadre" style={{ display: 'flex', alignItems: 'center', gap: 24, minHeight: 74 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 'auto' }}>
                  {d.theme.logoPerso.url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={d.theme.logoPerso.url} alt="" style={{ height: 40, background: transparent ? 'var(--blanc)' : undefined, borderRadius: 8, padding: transparent ? 4 : 0 }} />
                    : <span dangerouslySetInnerHTML={{ __html: marque }} />}
                  {d.theme.logo.disposition !== 'monogramme' && !(d.theme.logoPerso.url && d.theme.logoPerso.complet) && (
                    <span style={{ lineHeight: 1.1 }}>
                      <strong style={{ display: 'block', fontFamily: traitement.police, fontWeight: traitement.graisse, fontSize: 18 }}>{nomCabinet}</strong>
                      <span className="ap-mono" style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.75 }}>{surTitre}</span>
                    </span>
                  )}
                </span>
                {!mobile && construireNavigation(d, soins).menu.map((l) => l.libelle).map((l) => <span key={l} style={{ fontSize: 15, opacity: 0.85 }}>{l}</span>)}
                {mobile
                  ? <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, flexShrink: 0, borderRadius: '50%', boxShadow: 'inset 0 0 0 1.5px currentColor', fontSize: 18 }}>☰</span>
                  : <span className="ap-bouton ap-bouton--plein" style={{ minHeight: 42, padding: '0 18px', fontSize: 14, ...(transparent ? { background: 'var(--blanc)', color: 'var(--encre)' } : {}) }}>{rdv}</span>}
              </div>
            </header>
            {/* Pas de <main> : l'aperçu est inclus dans une page de l'admin, qui a déjà le sien */}
            <div>
              {vue === 'accueil' ? (
                <>
                  {m.accueil.hero === 'lieu' ? heroLieu : m.accueil.hero === 'scinde' ? heroScinde : heroPlein}
                  {ordre.map((s, k) => {
                    if (s !== 'panorama') douce = !douce;
                    return <div key={s}>{sections[s]?.(k + 1, s !== 'panorama' && douce)}</div>;
                  })}
                </>
              ) : ficheSoin}
            </div>
            {pied}
            </>)}
          </div>
        </div>
      </div>
      {!vignette && (
        <p className="border-t border-black/5 px-3 py-2 text-[11px] text-neutral-500">
          Aperçu calculé avec les réglages du générateur ; textes et mises en page détaillés peuvent varier légèrement sur le site publié.
        </p>
      )}
    </div>
  );
}

// Styles de l'aperçu, repris du gabarit des sites (apps/sites/src/layouts/Gabarit.astro), limités à .ap
const CSS = `
.ap { font-family: var(--police-texte); color: var(--encre); background: var(--fond); font-size: 17px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
.ap * { box-sizing: border-box; }
.ap p { margin: 0 0 1em; }
.ap-cadre { width: min(1180px, 100% - 40px); margin-inline: auto; }
.ap-section { padding-block: 88px; position: relative; isolation: isolate; }
.ap-douce { background: var(--doux); }
.ap-douce::before { content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none; -webkit-mask-image: radial-gradient(ellipse 70% 80% at 88% 12%, #000 10%, transparent 75%); mask-image: radial-gradient(ellipse 70% 80% at 88% 12%, #000 10%, transparent 75%); }
.ap[data-motif='plan'] .ap-douce::before { background-image: linear-gradient(var(--quadrillage-clair) var(--filet), transparent var(--filet)), linear-gradient(90deg, var(--quadrillage-clair) var(--filet), transparent var(--filet)); background-size: var(--quadrillage-pas-majeur) var(--quadrillage-pas-majeur), var(--quadrillage-pas-majeur) var(--quadrillage-pas-majeur); }
.ap[data-motif='trame'] .ap-douce::before { background-image: radial-gradient(circle, var(--trame-couleur) var(--trame-point), transparent calc(var(--trame-point) + 0.5px)), radial-gradient(circle, var(--trame-couleur) var(--trame-point), transparent calc(var(--trame-point) + 0.5px)); background-size: var(--trame-pas) calc(var(--trame-pas) * 0.866); background-position: 0 0, calc(var(--trame-pas) / 2) calc(var(--trame-pas) * 0.433); }
.ap-h1, .ap-h2, .ap-h3 { font-family: var(--police-titres); font-weight: var(--graisse-titres); color: var(--encre); line-height: 1.05; letter-spacing: -0.035em; margin: 0; text-wrap: balance; }
.ap-h1 { font-size: 64px; letter-spacing: -0.05em; }
.ap p.ap-h1 { margin: 0; }
.ap-h2 { font-size: 44px; margin-bottom: 28px; }
.ap-h3 { font-size: 19px; letter-spacing: -0.02em; line-height: 1.25; }
.ap[data-titres='instrument'] .ap-h1 { font-size: 76px; letter-spacing: -0.02em; line-height: 1; }
.ap[data-titres='instrument'] .ap-h2 { font-size: 52px; }
.ap[data-titres='fraunces'] :is(.ap-h1, .ap-h2) { letter-spacing: -0.025em; font-variation-settings: 'SOFT' 50, 'opsz' 144; }
.ap-pale { color: var(--encre-pale); }
.ap[data-titres='fraunces'] .ap-pale, .ap[data-titres='instrument'] .ap-pale { font-style: italic; color: var(--accent-vif); }
.ap-sur { display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 650; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent-vif); margin: 0 0 18px; }
.ap-mono { font-family: var(--police-mono); font-size: 13px; letter-spacing: 0.04em; font-variant-numeric: tabular-nums; margin: 0; }
.ap-chapo { color: var(--encre-douce); font-size: 19px; max-width: 46ch; margin: 22px 0 28px; }
.ap-bouton { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 26px; border-radius: var(--rayon-bouton); font-weight: 600; font-size: 16px; white-space: nowrap; }
.ap-bouton--plein { background: var(--accent); color: var(--blanc); }
.ap-carte { background: var(--fond); border: var(--filet) solid var(--ligne); border-radius: var(--rayon); padding: 16px; }
.ap-entete { position: relative; z-index: 2; background: color-mix(in srgb, var(--fond) 92%, transparent); border-bottom: var(--filet) solid var(--ligne); }
.ap-entete--transparent { position: absolute; left: 0; right: 0; background: transparent; border-color: transparent; color: var(--blanc); }
.ap-svg svg { width: 100%; height: 100%; }
/* Registre pédagogique : texte à 18 px, titres sans interlettrage serré, sur-titres en casse normale */
.ap[data-registre='pedagogique'] { font-size: 18px; }
.ap[data-registre='pedagogique'] :is(.ap-h1, .ap-h2, .ap-h3) { letter-spacing: -0.015em; line-height: 1.15; }
.ap[data-registre='pedagogique'] .ap-h1 { font-size: 54px; }
.ap[data-registre='pedagogique'] .ap-h2 { font-size: 40px; }
.ap[data-registre='pedagogique'] .ap-sur { font-size: 17px; letter-spacing: 0; text-transform: none; font-weight: 700; }
.ap[data-registre='pedagogique'] .ap-pale { color: var(--encre-douce); }
.ap[data-registre='pedagogique'] .ap-douce::before { display: none; }
`;
