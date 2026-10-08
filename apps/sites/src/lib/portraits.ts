// Portraits des praticiens sur les sites : images finales produites par le studio portrait de l'admin (WebP, plusieurs
// largeurs, 4:5 et carré), servies en srcset aux tailles d'affichage réelles. Aucun script : le navigateur choisit la
// largeur. Sans rendus du studio (photo simple), la photo enregistrée est servie telle quelle.
import type { PraticienPublic } from '@plateforme/core';
import { estPresentationPortraits, styleCouleursPortraits, type DonneesPortraits, type PortraitPraticien, type PresentationPortraits } from '@plateforme/core';
import { site } from './site';
import { zonePhoto } from './edition';
import { lienRdv, rdvEnLigne, viaPlateforme, libelleContact } from './textes';
import { altPortrait, POSITION_PORTRAIT, renduPour, srcsetPortrait } from '@plateforme/core/portrait';

type Attributs = { src: string; srcset?: string; sizes?: string; width: number; height: number; alt: string; style?: string };

/**
 * Attributs <img> du portrait :
 * - « portrait » (fiche des modèles éditoriaux) : 4:5, recadré en 4:3 ou en colonne haute par object-fit, tête gardée visible ;
 * - « carre » (pastille ronde de 64 px des gabarits tableau, village et revue).
 */
export function imagePortrait(p: PraticienPublic, format: 'portrait' | 'carre'): Attributs {
  const alt = altPortrait(p.prenom, p.nom, p.titre);
  const rendus = p.portrait?.[format] ?? [];
  if (!rendus.length) return format === 'portrait' ? { src: p.photo, width: 480, height: 600, alt } : { src: p.photo, width: 160, height: 160, alt };
  const defaut = renduPour(rendus, format === 'portrait' ? 640 : 128)!;
  return {
    src: defaut.url,
    srcset: srcsetPortrait(rendus),
    sizes: format === 'portrait' ? '(min-width: 1100px) 480px, (min-width: 760px) 45vw, calc(100vw - 60px)' : '64px',
    width: defaut.l,
    height: defaut.h,
    alt,
    ...(format === 'portrait' ? { style: `object-position:${POSITION_PORTRAIT}` } : {}),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Présentation des portraits (variante `portraits` de la recette, packages/core/src/portraits-praticiens.ts) : mêmes données que
// les fiches historiques (components/gabarits/Praticiens.astro, components/gabarit/Praticiens.astro), mêmes libellés.
// ---------------------------------------------------------------------------------------------------------------

const STATUTS: Record<string, string> = { titulaire: 'Titulaire du cabinet', collaborateur: 'En collaboration', remplacant: 'En remplacement' };

/** Présentation choisie par la recette (tous gabarits) ; « sobre » : composants historiques du gabarit, inchangés */
export const presentationPortraits: PresentationPortraits = estPresentationPortraits(site.modele.variantes?.portraits) ? site.modele.variantes!.portraits! : 'sobre';

/** Données du bloc (HTML du core) ; `classique` : boutons du gabarit classique, sinon ceux de la coquille des gabarits */
export function donneesPortraits(classique: boolean): DonneesPortraits {
  const plusieurs = site.praticiens.length > 1;
  const praticiens: PortraitPraticien[] = site.praticiens.map((p, i) => {
    const rendus = p.portrait?.portrait ?? [];
    const defaut = rendus.length ? [...rendus].sort((a, b) => a.l - b.l).find((r) => r.l >= 640) ?? rendus[rendus.length - 1] : null;
    return {
      prenom: p.prenom,
      nom: p.nom,
      titre: `${p.titre}${site.cabinet.ville ? ` à ${site.cabinet.ville}` : ''}`,
      metier: p.titre,
      statut: `${STATUTS[p.statut] ?? ''}${p.presence ? ` · ${p.presence}` : ''}`,
      orientations: p.orientations,
      photo: p.photo
        ? defaut
          ? { src: defaut.url, srcset: srcsetPortrait(rendus), largeur: defaut.l, hauteur: defaut.h, attributs: zonePhoto(`praticien.${i}.photo`) }
          : { src: p.photo, largeur: 480, hauteur: 600, attributs: zonePhoto(`praticien.${i}.photo`) }
        : null,
      detoure: Boolean(p.portrait?.detoure),
      detail: {
        bio: p.bio || undefined,
        lignes: [
          { dt: 'Diplôme', dd: p.diplome ? [p.diplome] : [] },
          { dt: 'Sports suivis', dd: p.sports.length ? [p.sports.join(', ')] : [] },
          { dt: 'Formations', dd: p.formations, liste: true },
          { dt: 'Inscription', dd: p.identifiants },
        ],
      },
      rdv: {
        href: lienRdv(`praticien-${i}`, rdvEnLigne && plusieurs ? i : undefined),
        libelle: rdvEnLigne ? (plusieurs ? `${classique ? 'Prendre rendez-vous' : 'Rendez-vous'} avec ${p.prenom || p.nom}` : 'Prendre rendez-vous') : libelleContact,
        via: viaPlateforme || null,
      },
    };
  });
  return {
    variante: presentationPortraits,
    praticiens,
    couleurs: styleCouleursPortraits(site.modele, { couleur: site.theme.couleur, gamme: site.theme.gamme }),
    classeBouton: classique ? 'bouton bouton--plein' : 'g-bouton g-bouton--ligne',
    classeVia: classique ? 'via' : 'g-via',
  };
}
