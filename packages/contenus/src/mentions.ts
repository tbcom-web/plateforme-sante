// Mentions d'orientation figées : reprises MOT POUR MOT du référentiel éthique ÉcranZen
// (C:\Users\pault\Desktop\TBCOM CLAUDE\ecranzen\studio\referentiels\ethique\podologie.md, tableau « Mentions figées » et
// « Variantes de conclusion validées », décisions de Paul du 2026-09-29 au 2026-10-02 ; copie du 2026-10-05).
// Ne jamais les réécrire ici : une mention modifiée dans ÉcranZen se recopie à l'identique. Règles reprises :
// - une seule mention par contenu, toujours en dernier (avant la seule signature du cabinet, sur un carton séparé) ;
// - jamais en capitales, jamais extraite seule ;
// - diabète + doute, lésion ou signe ⇒ famille M2 (médecin obligatoire) ; M3 interdite pour un contenu diabète ;
// - M5 = médecin seul (hors champ L.4322-1, traumatisme, tabac, source qui oriente vers le médecin seul) ;
// - M4 (deux temps) n'est pas gérée par le générateur : M4c si le sujet est la semelle elle-même.

import type { CodeMention } from './types';

export type Mention = {
  code: CodeMention;
  /** Coupures d'écran (référentiel) */
  lignes: string[];
  /** Texte long (légende, site, fiche Google) */
  long: string;
  famille: 'M1' | 'M2' | 'M3' | 'M4c' | 'M5';
  /** Oriente vers le médecin */
  medecin: boolean;
};

const m = (code: CodeMention, ecran: string, long: string, medecin = false): Mention => ({
  code,
  lignes: ecran.split(' / '),
  long,
  famille: code.replace(/-[abc]$/, '') as Mention['famille'],
  medecin,
});

export const MENTIONS: Record<Exclude<CodeMention, 'M5'>, Mention> = {
  M1: m('M1', 'Au moindre doute, / parlez-en / à votre pédicure-podologue.', 'Au moindre doute, parlez-en à votre pédicure-podologue.'),
  'M1-a': m('M1-a', 'Une question sur vos pieds ? / Posez-la / à votre pédicure-podologue.', 'Une question sur vos pieds ? Posez-la à votre pédicure-podologue.'),
  'M1-b': m('M1-b', 'Un doute ? / Montrez vos pieds / à votre pédicure-podologue.', 'Un doute ? Montrez vos pieds à votre pédicure-podologue.'),
  'M1-c': m('M1-c', 'Un doute sur vos pieds ? / Votre pédicure-podologue / peut vous conseiller.', 'Un doute sur vos pieds ? Votre pédicure-podologue peut vous conseiller.'),
  M2: m('M2', 'Au moindre doute, / parlez-en sans attendre / à votre médecin / ou pédicure-podologue.', 'Au moindre doute, parlez-en sans attendre à votre médecin ou à votre pédicure-podologue.', true),
  'M2-a': m('M2-a', 'Un doute ? / Montrez vos pieds sans attendre / à votre médecin / ou pédicure-podologue.', 'Un doute ? Montrez vos pieds sans attendre à votre médecin ou à votre pédicure-podologue.', true),
  'M2-b': m('M2-b', 'Au moindre doute, / consultez sans attendre / votre médecin / ou pédicure-podologue.', 'Au moindre doute, consultez sans attendre votre médecin ou votre pédicure-podologue.', true),
  'M2-c': m('M2-c', 'Un doute, même petit ? / Parlez-en sans attendre / à votre médecin / ou pédicure-podologue.', 'Un doute, même petit ? Parlez-en sans attendre à votre médecin ou à votre pédicure-podologue.', true),
  M3: m('M3', 'Douleur, gêne ou doute ? / Parlez-en / à votre pédicure-podologue.', 'Douleur, gêne ou doute ? Parlez-en à votre pédicure-podologue.'),
  'M3-a': m('M3-a', 'Vos pieds vous gênent ? / Parlez-en / à votre pédicure-podologue.', 'Vos pieds vous gênent ? Parlez-en à votre pédicure-podologue.'),
  'M3-b': m('M3-b', 'Une douleur, une gêne ? / Votre pédicure-podologue / peut vous conseiller.', 'Une douleur, une gêne ? Votre pédicure-podologue peut vous conseiller.'),
  'M3-c': m('M3-c', 'Mal aux pieds ou un doute ? / Montrez-les / à votre pédicure-podologue.', 'Mal aux pieds ou un doute ? Montrez-les à votre pédicure-podologue.'),
  M4c: m('M4c', 'Semelles : parlez-en / à votre pédicure-podologue.', 'Semelles : parlez-en à votre pédicure-podologue.'),
  'M4c-a': m('M4c-a', 'Semelles : une question ? / Parlez-en / à votre pédicure-podologue.', 'Semelles : une question ? Parlez-en à votre pédicure-podologue.'),
  'M4c-b': m('M4c-b', 'Pour vos semelles, / demandez conseil / à votre pédicure-podologue.', 'Pour vos semelles, demandez conseil à votre pédicure-podologue.'),
  'M4c-c': m('M4c-c', 'Semelles : un doute ? / Votre pédicure-podologue / peut vous conseiller.', 'Semelles : un doute ? Votre pédicure-podologue peut vous conseiller.'),
};

/** Mention d'un sujet (M5 : texte propre au sujet, coupé aux virgules et deux-points pour l'écran) */
export function mention(code: CodeMention, texteM5?: string): Mention {
  if (code === 'M5') {
    const t = (texteM5 ?? '').trim();
    return { code, lignes: t.split(/(?<=[,:?])\s+/), long: t, famille: 'M5', medecin: true };
  }
  return MENTIONS[code];
}
