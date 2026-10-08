'use client';

// Aperçu des pages SUJET (/themes/<id>) et ARTICLE (/actualites/<slug>) dans le studio de recettes et « Donner mon avis »,
// pour tous les gabarits (classique : jetons --encre, --accent-vif… ; tableau, village, revue : --g-*), avec la présentation
// choisie (variante « theme » : liste, rangees, heros, colonnes ; « article » : standard, lecture, laterale, chapo). Même
// contenu et même ordre de titres que les pages Astro (apps/sites/src/pages/themes/[theme].astro, actualites/[slug].astro) ;
// contenu de démonstration réaliste : le sujet n° 1 du scénario (intro et soins du catalogue), l'article ARTICLE_DEMO (core).
// Pas de <h1> (l'aperçu est inclus dans une page de l'admin qui a le sien) ; les intertitres restent des <h2>.
import { useMetierApercu } from './ApercuMetier';
import type { CSSProperties, ReactNode } from 'react';
import { ARTICLE_DEMO, minutesLecture, pictoSoin, sommaireMarkdown, svgPicto, type Article, type Theme, type Variantes } from '@plateforme/core';
import type { SoinCatalogue } from '@/lib/sites';
import { HerosVue, type HerosApercu } from './ApercuGabarit';

const v = {
  encre: 'var(--g-encre, var(--encre))',
  douce: 'var(--g-encre-douce, var(--encre-douce))',
  ligne: 'var(--g-ligne, var(--ligne))',
  accent: 'var(--g-accent-texte, var(--accent-vif))',
  bulle: 'var(--g-bulle, var(--accent-tres-pale, var(--doux)))',
  plein: 'var(--g-plein, var(--accent-vif))',
  pleinTexte: 'var(--g-plein-texte, var(--blanc))',
  doux: 'var(--g-doux, var(--doux))',
};

type Commun = { mobile: boolean; nomCabinet: string; libelleRdv: string; adresse: string; telephone: string | null; ville: string | null };

const cadre = (mobile: boolean, max = 1180): CSSProperties => ({ width: `min(${max}px, 100% - ${mobile ? 32 : 40}px)`, marginInline: 'auto' });
const fil = (items: string[]) => <p style={{ margin: 0, fontSize: 14, color: v.douce }}>{items.join(' / ')}</p>;
const sur = (t: string) => <p style={{ margin: 0, fontSize: 13, fontWeight: 650, letterSpacing: '0.12em', textTransform: 'uppercase', color: v.accent }}>{t}</p>;
const bouton = (plein: boolean): CSSProperties => ({ display: 'inline-grid', placeItems: 'center', minHeight: 52, padding: '6px 22px', borderRadius: 'var(--rayon-bouton, 999px)', fontWeight: 650, background: plein ? v.plein : 'transparent', color: plein ? v.pleinTexte : v.encre, boxShadow: plein ? 'none' : `inset 0 0 0 2px ${v.ligne}` });

/** Page d'un sujet : tête (titre, intro, visuel), soins du sujet, conseils, rendez-vous ; mise en page selon la variante */
export function ApercuPageSujet({ theme, soins, visuel, variante, conseils, mobile, nomCabinet, libelleRdv, adresse, telephone, ville }: Commun & {
  theme: Theme; soins: SoinCatalogue[]; visuel: HerosApercu | null; variante: Variantes['theme']; conseils: { titre: string; date: string }[];
}) {
  const metierPack = useMetierApercu();
  const heros = variante === 'heros' && !mobile;
  const rangees = variante === 'rangees';
  const colonnes = variante === 'colonnes' && !mobile;
  const titre = <p className="ap-h1" style={{ margin: 0, fontSize: mobile ? 38 : heros ? 60 : 56, lineHeight: 1.05, maxWidth: heros ? '24ch' : '17ch' }}>{theme.libelle}{ville && <> <span style={{ color: v.douce }}>à {ville}</span></>}</p>;
  const tete = (
    <header style={{ ...cadre(mobile), paddingTop: mobile ? 20 : 36 }}>
      <div style={{ display: 'grid', gridTemplateColumns: mobile || heros ? '1fr' : '1.1fr 0.9fr', gap: mobile ? 22 : 48, alignItems: 'end', paddingTop: 24, borderTop: `var(--filet-fort, 2px) solid ${v.encre}` }}>
        <div style={{ display: 'grid', gap: 14 }}>
          {fil(['Accueil', 'Soins', theme.libelle])}
          {sur(`${(metierPack?.titre ?? 'Pédicure-podologue').replace(/-/g, '‑')}${ville ? ` · ${ville}` : ''}`)}
          {titre}
          <p style={{ margin: 0, fontSize: mobile ? 17 : 19, color: v.douce, maxWidth: '60ch' }}>{theme.intro}</p>
        </div>
        {visuel && (
          <div style={{ position: 'relative', aspectRatio: heros ? '21 / 8' : '4 / 3', borderRadius: 'var(--rayon, 24px)', background: v.doux, overflow: 'hidden', display: 'grid', placeItems: 'center', '--dessin-trait': v.encre, '--dessin-accent': v.accent } as CSSProperties}>
            <div style={{ position: 'absolute', inset: visuel.type === 'photo' ? 0 : '6% 8%' }}><HerosVue h={visuel} /></div>
          </div>
        )}
      </div>
    </header>
  );
  const titreSection = (t: string) => <h2 className="ap-h2" style={{ margin: '0 0 16px', fontSize: mobile ? 24 : 30 }}>{t}</h2>;
  const listeSoins = (
    <section>
      {titreSection('Les soins proposés')}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: !mobile && variante === 'liste' ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr', columnGap: 28, borderTop: `var(--filet-fort, 2px) solid ${v.encre}` }}>
        {soins.map((s) => (
          <li key={s.slug} style={{ borderBottom: `var(--filet, 1px) solid ${v.ligne}` }}>
            <span style={{ display: 'grid', gridTemplateColumns: rangees ? `${mobile ? 56 : 72}px 1fr` : '40px 1fr', gap: rangees ? (mobile ? 14 : 20) : 14, alignItems: rangees ? 'center' : 'start', padding: rangees ? '22px 0' : '16px 0' }}>
              <span aria-hidden="true" style={rangees ? { display: 'grid', placeItems: 'center', width: mobile ? 56 : 72, height: mobile ? 56 : 72, borderRadius: 'var(--rayon, 18px)', background: v.bulle, color: v.accent } : { color: v.accent, display: 'grid' }}
                dangerouslySetInnerHTML={{ __html: svgPicto(pictoSoin(s.slug) ?? 'pied-dessus', { taille: rangees ? (mobile ? 32 : 40) : 36 }) ?? '' }} />
              <span style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontWeight: 700, color: v.accent, textDecoration: 'underline', textUnderlineOffset: 3, fontSize: rangees ? (mobile ? 19 : 22) : undefined }}>{s.titre_court}</span>
                <span style={{ color: v.douce, fontSize: rangees ? 17 : 16, lineHeight: 1.45, maxWidth: '62ch' }}>{s.resume}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
  const conseilsSection = conseils.length > 0 && (
    <section>
      {titreSection('Conseils à lire')}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
        {conseils.map((a) => <li key={a.titre} style={{ display: 'grid', gap: 2, padding: '10px 0', borderBottom: `var(--filet, 1px) solid ${v.ligne}` }}><span style={{ fontWeight: 600, color: v.accent, minHeight: 44, display: 'flex', alignItems: 'center' }}>{a.titre}</span><span style={{ color: v.douce, fontSize: 15 }}>{a.date}</span></li>)}
      </ul>
    </section>
  );
  const rdv = (
    <section style={variante === 'colonnes' ? { padding: mobile ? 20 : 28, borderRadius: 'var(--rayon, 18px)', background: v.bulle } : undefined}>
      {titreSection('Prendre rendez-vous')}
      <p style={{ margin: '0 0 14px', color: v.douce }}>{nomCabinet}{adresse ? `, ${adresse}` : ''}</p>
      <div style={{ display: mobile ? 'grid' : 'flex', flexWrap: 'wrap', gap: 10 }}>
        <span style={bouton(true)}>{libelleRdv}</span>
        {telephone && <span style={bouton(false)}>{telephone}</span>}
      </div>
    </section>
  );
  return (
    <>
      {tete}
      <div style={{ ...cadre(mobile), paddingBlock: mobile ? '40px 56px' : '64px 88px', display: 'grid', gap: mobile ? 36 : 56, ...(colonnes ? { gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)', alignItems: 'start', columnGap: 56 } : {}) }}>
        <div style={colonnes ? { gridRow: 'span 2' } : undefined}>{listeSoins}</div>
        {conseilsSection}
        {rdv}
      </div>
    </>
  );
}

/** Texte Markdown simple (intertitres ##, listes, gras) en éléments, avec les ancres du sommaire */
function Prose({ corps, style }: { corps: string; style: CSSProperties }) {
  const sommaire = sommaireMarkdown(corps);
  let i = 0;
  const gras = (t: string): ReactNode[] => t.split(/(\*\*[^*]+\*\*)/g).map((x, k) => (x.startsWith('**') ? <strong key={k}>{x.slice(2, -2)}</strong> : x));
  const blocs = corps.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div style={style}>
      {blocs.map((b, k) => {
        if (b.startsWith('## ')) { const s = sommaire[i++]; return <h2 key={k} id={s?.id} className="ap-h2" style={{ fontSize: 28, margin: '1.6em 0 0.5em' }}>{b.slice(3)}</h2>; }
        const lignes = b.split('\n');
        if (lignes.every((l) => /^- /.test(l))) return <ul key={k} style={{ paddingLeft: '1.2em', margin: '0.6em 0' }}>{lignes.map((l, j) => <li key={j} style={{ marginBottom: '0.4em' }}>{gras(l.slice(2))}</li>)}</ul>;
        if (lignes.every((l) => /^\d+\. /.test(l))) return <ol key={k} style={{ paddingLeft: '1.4em', margin: '0.6em 0' }}>{lignes.map((l, j) => <li key={j} style={{ marginBottom: '0.4em' }}>{gras(l.replace(/^\d+\. /, ''))}</li>)}</ol>;
        return <p key={k} style={{ margin: '0 0 1em', ...(k === 0 ? { fontSize: '1.09em', color: v.encre } : {}) }}>{gras(b)}</p>;
      })}
    </div>
  );
}

/** Page d'un article : tête, (sommaire), image, texte à la mesure de lecture, rendez-vous, autres conseils */
export function ApercuArticle({ variante, mobile, nomCabinet, libelleRdv, adresse, article = ARTICLE_DEMO, auteur, autres }: Commun & {
  variante: Variantes['article']; article?: Article; auteur: string; autres: { titre: string; theme: string }[];
}) {
  const lecture = variante === 'lecture';
  const laterale = variante === 'laterale' && !mobile && Boolean(article.image);
  const chapo = variante === 'chapo';
  const sommaire = sommaireMarkdown(article.corps);
  const colonne: CSSProperties = lecture ? { maxWidth: 'calc(68ch + 40px)', marginInline: 'auto' } : { maxWidth: 860 };
  const tete = (
    <header style={{ ...cadre(mobile), ...colonne, display: 'grid', gap: 12, textAlign: lecture ? 'center' : undefined, justifyItems: lecture ? 'center' : 'start' }}>
      {fil(['Accueil', 'Conseils', article.titre])}
      {sur(`${article.theme} · ${new Date(article.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · ${minutesLecture(article.corps)} min de lecture`)}
      <p className="ap-h1" style={{ margin: '4px 0 10px', fontSize: mobile ? 34 : 56, lineHeight: 1.05 }}>{article.titre}</p>
      <p style={chapo
        ? { margin: 0, fontSize: mobile ? 21 : 27, lineHeight: 1.45, color: v.encre, paddingLeft: 18, borderLeft: `var(--filet-fort, 2px) solid ${v.accent}`, maxWidth: '46ch', textAlign: 'left' }
        : { margin: 0, fontSize: mobile ? 18 : 20, color: v.douce, maxWidth: '52ch' }}>{article.resume}</p>
      <p style={{ margin: '14px 0 0', paddingTop: 14, borderTop: `var(--filet, 1px) solid ${v.ligne}`, fontSize: 15, color: v.douce, justifySelf: 'stretch' }}>Par <strong style={{ color: v.encre }}>{auteur}</strong></p>
    </header>
  );
  const nav = chapo && sommaire.length >= 2 && (
    <nav aria-label="Sommaire de l’article" style={{ ...cadre(mobile), maxWidth: 860, marginTop: 24 }}>
      {sur('Sommaire')}
      <ol style={{ margin: '6px 0 0', paddingLeft: '1.2em' }}>{sommaire.map((s) => <li key={s.id} style={{ minHeight: 44, display: 'list-item', fontWeight: 600, paddingTop: 10 }}>{s.titre}</li>)}</ol>
    </nav>
  );
  const image = article.image && (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={article.image} alt={article.imageAlt ?? ''} style={{ width: '100%', aspectRatio: laterale ? '4 / 5' : '16 / 9', objectFit: 'cover', borderRadius: 'var(--rayon, 24px)', display: 'block' }} />
  );
  const corps = (
    <div style={{ ...cadre(mobile), ...colonne, ...(laterale ? { width: 'auto', margin: 0 } : {}) }}>
      <Prose corps={article.corps} style={{ maxWidth: '68ch', lineHeight: 1.7, fontSize: mobile ? 17 : 18, marginInline: lecture ? 'auto' : undefined }} />
      <aside style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 18, marginTop: 40, padding: mobile ? '24px 20px' : '26px 28px', borderRadius: 'var(--rayon, 18px)', background: v.doux }}>
        <p style={{ margin: 0, display: 'grid', gap: 4 }}><strong>Une question sur vos pieds ?</strong><span style={{ color: v.douce, fontSize: 15 }}>{nomCabinet}{adresse ? `, ${adresse}` : ''}.</span></p>
        <span style={{ ...bouton(true), width: mobile ? '100%' : undefined }}>{libelleRdv}</span>
      </aside>
    </div>
  );
  const autresBloc = autres.length > 0 && (
    <nav aria-label="Autres conseils" style={{ ...cadre(mobile), ...colonne, marginTop: mobile ? 56 : 88 }}>
      {sur('Autres conseils')}
      <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, borderTop: `var(--filet, 1px) solid ${v.ligne}` }}>
        {autres.map((a) => <li key={a.titre} style={{ borderBottom: `var(--filet, 1px) solid ${v.ligne}`, padding: '18px 0', display: 'grid', gap: 4 }}><span style={{ fontSize: 12, fontWeight: 650, letterSpacing: '0.12em', textTransform: 'uppercase', color: v.accent }}>{a.theme}</span><strong style={{ fontSize: 18 }}>{a.titre}</strong></li>)}
      </ul>
    </nav>
  );
  if (laterale) {
    return (
      <article style={{ ...cadre(mobile), paddingBlock: '48px 88px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 0.62fr)', columnGap: 48, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 32 }}>{tete}{corps}{autresBloc}</div>
        <div style={{ position: 'sticky', top: 24, marginTop: 40 }}>{image}</div>
      </article>
    );
  }
  return (
    <article style={{ paddingBlock: mobile ? '28px 56px' : '48px 88px', display: 'grid', gap: 0 }}>
      {lecture && image && <div style={{ ...cadre(mobile, 1040), marginBottom: mobile ? 24 : 44 }}>{image}</div>}
      {tete}
      {nav}
      {!lecture && image && <div style={{ ...cadre(mobile), marginBlock: mobile ? 28 : 48 }}>{image}</div>}
      {lecture && <div style={{ height: mobile ? 24 : 36 }} />}
      {corps}
      {autresBloc}
    </article>
  );
}
