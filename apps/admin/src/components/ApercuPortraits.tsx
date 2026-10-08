'use client';

// Présentation des portraits des praticiens dans l'admin : EXACTEMENT le HTML et la feuille du site (packages/core/src/
// portraits-praticiens.ts, htmlPortraits et CSS_PORTRAITS). Deux usages :
// - BlocPortraits : bloc praticiens de l'aperçu (ApercuGabarit, ApercuTheme : Studio, duels), praticiens du brouillon ;
// - PlanchePortraits : tuile « Donner mon avis » (composant:portraits:<présentation>) : la présentation avec 1, 2 et 3 praticiens
//   de démonstration (portraits FICTIFS du kit démo s'il existe, sinon silhouettes dessinées ; monogrammes ; jamais une vraie
//   personne), dans le cadre de l'appareil.
import {
  CSS_PORTRAITS, estPresentationPortraits, htmlPortraits, kitDemoDe, POLICES, praticiensDemo, styleCouleursPortraits,
  type ModeleManifeste, type PortraitPraticien, type PresentationPortraits, type SiteDraft,
} from '@plateforme/core';
import CadreApercu from '@/components/CadreApercu';

/** Présentation des portraits du modèle (recette) ; « sobre » : rendu historique de l'aperçu */
export const presentationApercu = (m: Pick<ModeleManifeste, 'variantes'>): PresentationPortraits => (estPresentationPortraits(m.variantes?.portraits) ? m.variantes!.portraits! : 'sobre');

/** Praticiens du brouillon → données du bloc (mêmes libellés que le site, lib/portraits.ts) */
export function portraitsDuDraft(d: SiteDraft, metier: string, ville: string, libelleOrientation: (slug: string) => string = (s) => s): PortraitPraticien[] {
  const STATUTS: Record<string, string> = { titulaire: 'Titulaire du cabinet', collaborateur: 'En collaboration', remplacant: 'En remplacement' };
  const l = d.praticiens.filter((p) => p.nom.trim() || p.prenom.trim());
  return l.map((p) => {
    const rendus = p.portrait?.rendus?.portrait ?? [];
    const r = [...rendus].sort((a, b) => a.l - b.l).find((x) => x.l >= 640) ?? rendus.at(-1);
    return {
      prenom: p.prenom, nom: p.nom, titre: `${metier}${ville ? ` à ${ville}` : ''}`, metier,
      statut: `${STATUTS[p.statut] ?? ''}${p.presence ? ` · ${p.presence}` : ''}`,
      orientations: p.orientations.map(libelleOrientation),
      photo: p.photo ? (r ? { src: r.url, srcset: [...rendus].sort((a, b) => a.l - b.l).map((x) => `${x.url} ${x.l}w`).join(', '), largeur: r.l, hauteur: r.h } : { src: p.photo, largeur: 480, hauteur: 600 }) : null,
      detail: { bio: p.bio || undefined, lignes: [{ dt: 'Diplôme', dd: p.diplome ? [p.diplome] : [] }, { dt: 'Formations', dd: p.formations, liste: true }] },
      rdv: { href: '#', libelle: l.length > 1 ? `Rendez-vous avec ${p.prenom || p.nom}` : 'Prendre rendez-vous' },
    };
  });
}

type Couleurs = { modele: ModeleManifeste; couleur: string; gamme?: string | null };

/** Bloc praticiens (HTML du core) ; `zone` : repère « On compare / Vous notez » (data-zone) */
export function BlocPortraits({ variante, praticiens, modele, couleur, gamme }: { variante: PresentationPortraits; praticiens: PortraitPraticien[] } & Couleurs) {
  const html = htmlPortraits({ variante, praticiens, couleurs: styleCouleursPortraits(modele, { couleur, gamme }) });
  return <div data-zone="portraits" dangerouslySetInnerHTML={{ __html: `<style>${CSS_PORTRAITS}</style>${html}` }} />;
}

/** Tuile de notation : la présentation avec 1, 2 et 3 praticiens de démonstration, dans le cadre de l'appareil */
export function PlanchePortraits({ variante, mobile, vignette, hauteur, modele, couleur, gamme }: { variante: PresentationPortraits; mobile: boolean; vignette?: number; hauteur?: number } & Couleurs) {
  const couleurs = styleCouleursPortraits(modele, { couleur, gamme });
  const groupes = [1, 2, 3].map((n) => `<section class="ppl"><p class="ppl__n">${n} praticien${n > 1 ? 's' : ''}</p>${htmlPortraits({ variante, praticiens: praticiensDemo(n, 'mixte', kitDemoDe()?.portraits ?? []), couleurs })}</section>`).join('');
  const style = {
    '--police-titres': POLICES[modele.jetons.policeTitres], '--graisse-titres': String(modele.jetons.graisseTitres ?? 650),
    fontFamily: POLICES[modele.jetons.policeTexte], background: 'var(--ppl-fond)', minHeight: '100vh',
  } as React.CSSProperties;
  return (
    <CadreApercu appareil={mobile ? 'mobile' : 'bureau'} vignette={hauteur ? undefined : vignette ?? (mobile ? 600 : 560)} hauteur={hauteur} titre="Présentation des portraits des praticiens">
      <div style={style}>
        <div dangerouslySetInnerHTML={{ __html: `<style>${CSS_PORTRAITS}.ppl{--ppl-fond:inherit;max-width:1180px;margin:0 auto;padding:${mobile ? '28px 20px' : '48px 40px'};border-bottom:1px dashed rgb(0 0 0 / .12)}.ppl__n{margin:0 0 14px;font:600 13px/1.2 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:rgb(0 0 0 / .55)}</style><div style="${couleurs};background:var(--pp-page)">${groupes}</div>` }} />
      </div>
    </CadreApercu>
  );
}
