// Contrôle du pack Psychomotricien (lancé par `npm run controle:packs -w @plateforme/contenus`).
// 1. Pratique : controlerPratique du core (identifiants, renvois, hashtags, thème différé hors des profils) ; libellés courts ≤ 10.
// 2. Renvois : fiches des thèmes, thèmes des fiches, sources citées.
// 3. Textes (pages, fiches, FAQ, mentions, accroche) : lexique bloquant du core (verifierTexte, niveau strict + formulations à
//    préférer) et mots interdits propres au métier (docs/professions/psychomotricien.md §7).
// 4. Toute phrase réglementaire (prescription, remboursement, Assurance maladie, PCO, MDPH, Code de la santé publique, RPPS…)
//    porte au moins une source.
// 5. Scènes d'images : aucun motif refusé par prompts-images.ts (motifsRefus) ni par les refus propres au pack.
// 6. Statut : jamais « publiable » sans relecture.

import { controlerPratique, motifsRefus, verifierTexte } from '@plateforme/core';
import { FICHES_PSYCHOMOT, TEXTE_CONTRAT_PCO } from './fiches';
import { FAQ_PSYCHOMOT, PAGES_PSYCHOMOT, PRISE_EN_CHARGE } from './pages';
import { PRATIQUE_PSYCHOMOTRICIEN } from './pratique';
import { sourcePsychomot } from './sources';
import { MENTIONS_PSYCHOMOT, PACK_SITE_PSYCHOMOT } from './textes';
import { MOTIFS_INTERDITS_PSYCHOMOT, SCENE_SALLE_PSYCHOMOT, SCENES_FICHES_PSYCHOMOT, SCENES_SUJETS_PSYCHOMOT } from './visuels';

/** Mots interdits propres au métier : [motif, raison] */
export const INTERDITS_PSYCHOMOT: readonly [RegExp, string][] = [
  [/gu[ée]ri(r|t|s|e|son)?\b/i, 'promesse de guérison'],
  [/diagnostic psychomoteur|(poser|pose|posons|posé) (un|le) diagnostic(?! m[ée]dical)/i, 'le diagnostic relève du médecin'],
  [/diagnostiqu\w*/i, 'le diagnostic relève du médecin'],
  [/sans ordonnance|acc[eè]s direct/i, 'actes sur prescription médicale'],
  [/bien-[êe]tre|\bstress\b|\bzen\b|d[ée]tente/i, 'hors du décret d’actes (offre de bien-être)'],
  [/(^|[^\p{L}])(psycho)?th[ée]rapeutes?/iu, 'titre de psychothérapeute réglementé'],
  [/sp[ée]cialis[ée]e?s?(?!\p{L})(?! Alzheimer)|sp[ée]cialiste/iu, 'titre de spécialiste non reconnu (sauf « équipes spécialisées Alzheimer », nom du dispositif)'],
  [/!/, 'point d’exclamation'],
  [/pr[ée]vien\w* (les )?chutes|pr[ée]vention des chutes|r[ée]dui\w* (le risque de )?chutes?/i, 'promesse non sourcée sur les chutes'],
  [/rembours[ée]e?s? par (les |votre )?(mutuelles?|compl[ée]mentaires?)/i, 'remboursement par les complémentaires : « selon le contrat »'],
  [/\b[ée]vit(e|er|ez|ent)\b/i, '« éviter » promet un résultat'],
  [/dyslexi|(?<!exclusion de la )r[ée][ée]ducation (de l’|de l'|du )?(orthographe|langage [ée]crit|lecture)/i, 'langue écrite : orthophoniste'],
  [/rapide(ment)?|en quelques s[ée]ances|r[ée]sultats?/i, 'promesse de délai ou de résultat'],
  [/t[ée]moignage|nos patients|un patient de/i, 'témoignage, secret'],
];

/** Phrases qui portent une affirmation réglementaire : une source est exigée */
const REGLEMENTAIRE = /prescription|rembours|assurance maladie|\bPCO\b|plateforme de coordination|\bMDPH\b|\bAEEH\b|\bPCH\b|code de la sant[ée]|\bRPPS\b|dipl[ôo]m[ée] d’[ÉE]tat|douzi[eè]me anniversaire/i;

type Texte = { ou: string; texte: string; sources?: readonly string[] };

function textesDuPack(): Texte[] {
  const t: Texte[] = [];
  for (const p of PAGES_PSYCHOMOT) {
    // Titre et description résument les sections : ils héritent de leurs sources
    const dePage = [...new Set(p.sections.flatMap((s) => s.sources ?? []))];
    t.push({ ou: `page ${p.id} : titre`, texte: p.titre, sources: dePage }, { ou: `page ${p.id} : description`, texte: p.description, sources: dePage });
    for (const s of p.sections) t.push({ ou: `page ${p.id} · ${s.titre}`, texte: `${s.titre}\n${s.corps}`, sources: s.sources });
  }
  for (const f of FICHES_PSYCHOMOT) {
    t.push({ ou: `fiche ${f.slug}`, texte: [f.titreCourt, f.titre, f.resume, f.corps].join('\n'), sources: f.sources });
    f.faq.forEach((q, i) => t.push({ ou: `fiche ${f.slug} · FAQ ${i + 1}`, texte: `${q.q}\n${q.r}`, sources: q.sources ?? f.sources }));
  }
  FAQ_PSYCHOMOT.forEach((q, i) => t.push({ ou: `FAQ ${i + 1}`, texte: `${q.q}\n${q.r}`, sources: q.sources }));
  for (const m of MENTIONS_PSYCHOMOT) t.push({ ou: `mention ${m.id}`, texte: m.texte, sources: m.sources });
  for (const [k, v] of Object.entries(PRISE_EN_CHARGE)) t.push({ ou: `prise en charge ${k}`, texte: v, sources: ['mph-remboursement'] });
  for (const [k, v] of Object.entries(TEXTE_CONTRAT_PCO)) t.push({ ou: `contrat PCO ${k}`, texte: v, sources: ['decret-2025-770'] });
  t.push({ ou: 'accroche', texte: PACK_SITE_PSYCHOMOT.accrocheTitre, sources: ['-'] });
  return t;
}

export function controlerPackPsychomot(pack: { statut: string }): { erreurs: string[]; avertissements: string[] } {
  const E: string[] = [], A: string[] = [];
  const p = PRATIQUE_PSYCHOMOTRICIEN;

  // 1. Pratique
  E.push(...controlerPratique(p));
  for (const th of p.themes) if (th.court.length > 10) E.push(`thème ${th.id} : libellé court > 10 caractères (« ${th.court} »).`);

  // 2. Renvois
  const fiches = new Set(FICHES_PSYCHOMOT.map((f) => f.slug));
  if (fiches.size !== FICHES_PSYCHOMOT.length) E.push('fiches : slug en double.');
  const themes = new Set(p.themes.map((x) => x.id));
  for (const th of p.themes) for (const s of th.soins) if (!fiches.has(s)) E.push(`thème ${th.id} : fiche inconnue ${s}.`);
  for (const a of p.activites) for (const s of a.soins) if (!fiches.has(s)) E.push(`activité ${a.id} : fiche inconnue ${s}.`);
  for (const f of FICHES_PSYCHOMOT) for (const th of f.themes) if (!themes.has(th)) E.push(`fiche ${f.slug} : thème inconnu ${th}.`);

  // 3 et 4. Textes
  for (const { ou, texte, sources } of textesDuPack()) {
    for (const al of verifierTexte(texte, 'strict')) {
      if (/pédicure-podologue/.test(al.suggestion ?? '')) continue; // règle propre à la podologie
      E.push(`${ou} : « ${al.extrait} » — ${al.raison}${al.suggestion ? ` (préférer « ${al.suggestion} »)` : ''}`);
    }
    for (const [re, raison] of INTERDITS_PSYCHOMOT) { const m = texte.match(re); if (m) E.push(`${ou} : « ${m[0]} » — ${raison}`); }
    const sans = (sources ?? []).filter((s) => s !== '-');
    for (const s of sans) if (!sourcePsychomot(s)) E.push(`${ou} : source inconnue ${s}.`);
    if (REGLEMENTAIRE.test(texte) && !sources?.length) E.push(`${ou} : affirmation réglementaire sans source.`);
    for (const s of sans) { const src = sourcePsychomot(s); if (src && !src.verifie) A.push(`${ou} : source « ${s} » à revérifier (non relue sur la page officielle).`); }
  }
  for (const pg of PAGES_PSYCHOMOT) if (pg.description.length > 160) E.push(`page ${pg.id} : description > 160 caractères (${pg.description.length}).`);

  // 5. Scènes d'images
  const scenes = { ...SCENES_SUJETS_PSYCHOMOT, ...SCENES_FICHES_PSYCHOMOT, salle: SCENE_SALLE_PSYCHOMOT };
  for (const [id, sc] of Object.entries(scenes)) {
    for (const langue of ['fr', 'en'] as const) {
      for (const r of motifsRefus(sc[langue])) E.push(`scène ${id} (${langue}) : ${r}`);
      for (const m of MOTIFS_INTERDITS_PSYCHOMOT) if (m.re.test(sc[langue])) E.push(`scène ${id} (${langue}) : ${m.motif}`);
    }
  }

  // 6. Statut
  if (pack.statut === 'publiable') E.push('Le pack ne peut pas être « publiable » avant la relecture de Paul et d’un psychomotricien.');
  return { erreurs: E, avertissements: [...new Set(A)] };
}
