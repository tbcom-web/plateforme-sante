// Composition : Sujet (contenu) × format → Publication (contenu seul), puis × Identité → PublicationPersonnalisee.
// Fonctions pures, sans DOM : utilisables dans l'admin, dans l'aperçu gratuit et dans le générateur Node.

import { mention } from './mentions';
import type { Diapositive, Format, Identite, Publication, PublicationPersonnalisee, Style, Sujet } from './types';

/** Style de rendu d'une identité : choisi, sinon déduit du modèle (simple → simple ; registre pédagogique → pédagogique) */
export function styleIdentite(i: Pick<Identite, 'style' | 'modele'>): Style {
  if (i.style) return i.style;
  if (i.modele.id === 'simple') return 'simple';
  return i.modele.jetons.registre === 'pedagogique' ? 'pedagogique' : 'releve';
}

/** Diapositives d'un sujet pour un format */
export function diapositives(s: Sujet, format: Format): Diapositive[] {
  const m = mention(s.mention, s.texteM5);
  const couverture: Diapositive = { role: 'couverture', surtitre: s.couverture.surtitre, titre: s.couverture.titre, visuel: s.couverture.visuel, alt: s.couverture.alt };
  if (format === 'carrousel') {
    return [
      couverture,
      ...s.points.map((p): Diapositive => ({ role: 'point', titre: p.titre, texte: p.texte, visuel: p.visuel, alt: p.alt })),
      { role: 'pratique', surtitre: 'En pratique', liste: s.pratique, alt: `En pratique : ${s.pratique.join(' ; ')}.` },
      { role: 'mention', mention: m.lignes, alt: m.long },
      { role: 'signature', alt: 'Signature du cabinet' },
    ];
  }
  // Image unique (post, Story, fiche Google) : message clé + visuel + mention, au plus 12 + 12 mots (grammaire §6)
  return [{
    role: 'affiche',
    surtitre: s.couverture.surtitre,
    titre: s.messageCle,
    liste: format === 'story' ? s.pratique : undefined,
    visuel: s.couverture.visuel,
    mention: m.lignes,
    alt: `${s.couverture.alt} ${s.messageCle} ${m.long}`.slice(0, 250),
  }];
}

/** Publication (contenu seul) d'un sujet dans un format */
export function composer(s: Sujet, format: Exclude<Format, 'reel'>): Publication {
  return {
    id: `${s.id}.${format}`,
    sujet: s.id,
    format,
    diapositives: diapositives(s, format),
    legende: s.legende.join('\n\n'),
    hashtags: s.hashtags,
    soin: s.soins[0],
    texteGoogle: format === 'google' ? s.google : undefined,
    mention: s.mention,
  };
}

/** Lien vers la fiche du soin lié sur le site du cabinet (page d'information), sinon l'accueil du site */
export function lienFiche(i: Pick<Identite, 'domaine' | 'soinsDuSite'>, soins: string[]): string {
  const slug = soins.find((x) => !i.soinsDuSite || i.soinsDuSite.includes(x));
  return `https://${i.domaine}${slug ? `/soins/${slug}` : ''}`;
}

/** Personnalisation : légende complète, lien, textes alternatifs (la signature prend le nom du cabinet) */
export function personnaliser(p: Publication, s: Sujet, i: Identite): PublicationPersonnalisee {
  const m = mention(s.mention, s.texteM5);
  const lien = lienFiche(i, s.soins);
  const style = styleIdentite(i);
  const alts = p.diapositives.map((d) => (d.role === 'signature' ? `${i.nom}, ${i.metier.toLocaleLowerCase('fr-FR')} à ${i.ville}. Plus d'informations sur ${i.domaine}.` : d.alt));
  const hashtags = p.hashtags.map((h) => `#${h}`).join(' ');
  const legendeComplete = p.format === 'google'
    ? [s.google, m.long, `En savoir plus : ${lien}`].join('\n\n')
    : [p.legende, m.long, `Plus d'informations sur le site du cabinet : lien en bio (${i.domaine}).`, hashtags].join('\n\n');
  return {
    ...p,
    texteGoogle: p.format === 'google' ? legendeComplete : undefined,
    identite: { nom: i.nom, domaine: i.domaine, style },
    legendeComplete,
    lien,
    alts,
  };
}
