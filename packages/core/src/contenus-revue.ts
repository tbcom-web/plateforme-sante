// REVUE DES CONTENUS dans les Arrivages (demande de Paul du 2026-10-09 : « dans les Arrivages on devrait aussi avoir les
// CONTENUS créés »). Les textes livrés par Claude dans les packs de contenus (packages/contenus/professions/<id>/ : pages, fiches,
// FAQ, mentions, prise en charge, questions d'onboarding) deviennent des cartes de revue, une par texte publiable.
//
// Stockage SANS migration : journal des revues existant (illustrations_revues, 0021 ; statut courant illustrations_statuts) sous
// la clé `contenu:<profession>:<nature>:<id>`, avec l'EMPREINTE du texte (8 hexadécimaux) :
// - Accepter (bon pour publication) → statut « valide » (posé par Paul lui-même, comme dans la bibliothèque) ;
// - À retravailler → « a_retravailler » + commentaire (exporté vers retours/ pour que Claude corrige) ;
// - Refuser → « retire » ; Annuler → statut précédent, sinon « a_revoir » (de nouveau en attente).
// Une modification du texte (empreinte différente de celle de la revue) remet la carte en arrivage.
// Règle : un pack ne devient publiable (parcours client) que lorsque TOUS ses contenus obligatoires sont acceptés pour leur
// texte actuel (progressionPack). Pur, sans dépendance au paquet des contenus (forme structurelle PackContenus).

export type SectionContenu = { titre: string; corps: string; sources?: readonly string[]; si?: string };

/** Forme minimale d'un pack (packages/contenus/professions/<id>/index.ts, PACK_<ID>) */
export type PackContenus = {
  profession: string;
  statut: string;
  pages?: readonly { id: string; titreMenu: string; titre: string; description: string; sections: readonly SectionContenu[] }[];
  fiches?: readonly { slug: string; titreCourt: string; titre: string; resume: string; corps: string; faq: readonly { q: string; r: string; sources?: readonly string[] }[]; sources: readonly string[] }[];
  faq?: readonly { q: string; r: string; sources?: readonly string[]; si?: string }[];
  mentions?: readonly { id: string; ou?: string; texte: string; sources?: readonly string[] }[];
  onboarding?: readonly { id: string; question: string; aide?: string; effet: string; options?: readonly { libelle: string }[]; sources?: readonly string[] }[];
  priseEnCharge?: Readonly<Record<string, string>>;
  texteContratPco?: Readonly<Record<string, string>>;
  sources?: readonly { id: string; organisme: string; titre: string; url: string; verifie: boolean }[];
};

export type NatureContenu = 'page' | 'fiche' | 'faq' | 'mentions' | 'prise-en-charge' | 'onboarding';
export const LIBELLES_NATURES: Readonly<Record<NatureContenu, string>> = {
  page: 'Page', fiche: 'Fiche', faq: 'Question de la FAQ', mentions: 'Mentions', 'prise-en-charge': 'Prise en charge', onboarding: 'Questions d’onboarding',
};

export type BlocContenu = { titre?: string; corps: string; sources: string[]; condition?: string };

export type ContenuRevue = {
  cle: string;
  profession: string;
  nature: NatureContenu;
  id: string;
  titre: string;
  /** Description (meta) d'une page, résumé d'une fiche */
  chapo?: string;
  blocs: BlocContenu[];
  /** Sources citées (identifiants du pack), dans l'ordre d'apparition */
  sources: string[];
  obligatoire: boolean;
  empreinte: string;
  /** Préfixes des messages du contrôle des packs qui concernent ce contenu (« page accueil », « fiche x », « FAQ 3 »…) */
  prefixesControle: string[];
};

/** Empreinte FNV-1a 32 bits, 8 hexadécimaux (colonne empreinte de illustrations_revues) */
export function empreinteTexte(t: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Identifiant stable d'un texte libre (question de FAQ) : minuscules sans accents, tirets, 50 caractères au plus */
export const slugContenu = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50).replace(/-+$/, '') || 'x';

export const cleContenu = (profession: string, nature: NatureContenu, id: string) => `contenu:${profession}:${nature}:${id}`;
export const estCleContenu = (cle: unknown): cle is string => typeof cle === 'string' && /^contenu:[a-z0-9-]{2,40}:(page|fiche|faq|mentions|prise-en-charge|onboarding):[a-z0-9-]{1,60}$/.test(cle);

const uniques = (l: readonly (readonly string[] | undefined)[]) => [...new Set(l.flatMap((x) => x ?? []))];

function finir(c: Omit<ContenuRevue, 'empreinte' | 'sources'>): ContenuRevue {
  const sources = uniques(c.blocs.map((b) => b.sources));
  return { ...c, sources, empreinte: empreinteTexte(JSON.stringify([c.titre, c.chapo ?? '', c.blocs])) };
}

/** Contenus à revoir d'un pack : une carte par page, fiche, question de FAQ ; mentions, prise en charge et onboarding groupés */
export function contenusDuPack(p: PackContenus): ContenuRevue[] {
  const prof = p.profession;
  const l: ContenuRevue[] = [];
  for (const pg of p.pages ?? []) {
    l.push(finir({
      cle: cleContenu(prof, 'page', pg.id), profession: prof, nature: 'page', id: pg.id, titre: pg.titre, chapo: pg.description, obligatoire: true,
      blocs: pg.sections.map((s) => ({ titre: s.titre, corps: s.corps, sources: [...(s.sources ?? [])], ...(s.si ? { condition: s.si } : {}) })),
      prefixesControle: [`page ${pg.id} `, `page ${pg.id}:`, ...(pg.id === 'accueil' ? ['accroche'] : [])],
    }));
  }
  for (const f of p.fiches ?? []) {
    l.push(finir({
      cle: cleContenu(prof, 'fiche', f.slug), profession: prof, nature: 'fiche', id: f.slug, titre: f.titre, chapo: f.resume, obligatoire: true,
      blocs: [{ corps: f.corps, sources: [...f.sources] }, ...f.faq.map((q) => ({ titre: q.q, corps: q.r, sources: [...(q.sources ?? f.sources)] }))],
      prefixesControle: [`fiche ${f.slug} `, `fiche ${f.slug}:`],
    }));
  }
  const vus = new Set<string>();
  (p.faq ?? []).forEach((q, i) => {
    let id = slugContenu(q.q);
    while (vus.has(id)) id = `${id}-${i + 1}`;
    vus.add(id);
    l.push(finir({
      cle: cleContenu(prof, 'faq', id), profession: prof, nature: 'faq', id, titre: q.q, obligatoire: true,
      blocs: [{ corps: q.r, sources: [...(q.sources ?? [])], ...(q.si ? { condition: q.si } : {}) }],
      prefixesControle: [`FAQ ${i + 1} `, `FAQ ${i + 1}:`],
    }));
  });
  if (p.mentions?.length) {
    l.push(finir({
      cle: cleContenu(prof, 'mentions', 'toutes'), profession: prof, nature: 'mentions', id: 'toutes', titre: 'Mentions déontologiques et légales', obligatoire: true,
      blocs: p.mentions.map((m) => ({ titre: m.ou ? `${m.id} · ${m.ou}` : m.id, corps: m.texte, sources: [...(m.sources ?? [])] })),
      prefixesControle: ['mention '],
    }));
  }
  const pec = Object.entries(p.priseEnCharge ?? {});
  const pco = Object.entries(p.texteContratPco ?? {});
  if (pec.length || pco.length) {
    l.push(finir({
      cle: cleContenu(prof, 'prise-en-charge', 'textes'), profession: prof, nature: 'prise-en-charge', id: 'textes', titre: 'Textes de prise en charge', obligatoire: true,
      blocs: [...pec.map(([k, v]) => ({ titre: k, corps: v, sources: [] as string[] })), ...pco.map(([k, v]) => ({ titre: `Contrat avec la plateforme (PCO) : ${k}`, corps: v, sources: [] as string[] }))],
      prefixesControle: ['prise en charge ', 'contrat PCO '],
    }));
  }
  if (p.onboarding?.length) {
    l.push(finir({
      cle: cleContenu(prof, 'onboarding', 'questions'), profession: prof, nature: 'onboarding', id: 'questions', titre: 'Questions d’onboarding du métier', obligatoire: true,
      blocs: p.onboarding.map((q) => ({
        titre: q.question,
        corps: [q.aide ?? '', q.options?.length ? q.options.map((o) => `- ${o.libelle}`).join('\n') : '', `Effet sur le site : ${q.effet}`].filter(Boolean).join('\n\n'),
        sources: [...(q.sources ?? [])],
      })),
      prefixesControle: ['onboarding '],
    }));
  }
  return l;
}

/** Messages du contrôle des packs (controle:packs) qui concernent un contenu */
export const messagesDuContenu = (c: Pick<ContenuRevue, 'prefixesControle'>, messages: readonly string[]) =>
  messages.filter((m) => c.prefixesControle.some((p) => m.startsWith(p)));

export type EtatContenu = 'en_attente' | 'accepte' | 'a_retravailler' | 'refuse';
export type RevueContenu = { statut: string; empreinte?: string | null; commentaire?: string | null };

/** État d'un contenu : sans revue, « à revoir » ou texte modifié depuis la revue → en attente */
export function etatContenu(c: Pick<ContenuRevue, 'empreinte'>, r: RevueContenu | null | undefined): EtatContenu {
  if (!r || r.statut === 'a_revoir') return 'en_attente';
  if (r.empreinte && r.empreinte !== c.empreinte) return 'en_attente';
  if (r.statut === 'valide' || r.statut === 'accepte') return 'accepte';
  if (r.statut === 'a_retravailler') return 'a_retravailler';
  if (r.statut === 'retire') return 'refuse';
  return 'en_attente';
}

/** Statuts de revue posés par les gestes des Arrivages sur un contenu */
export const STATUT_GESTE_CONTENU = { accepter: 'valide', retravailler: 'a_retravailler', refuser: 'retire' } as const;

export type ProgressionPack = { profession: string; acceptes: number; total: number; aRetravailler: number; refuses: number; enAttente: number; publiable: boolean };

/**
 * Progression d'un pack : contenus obligatoires acceptés pour leur texte ACTUEL. Publiable (statut disponible pour le parcours
 * client) seulement si tous le sont, que le contrôle des packs n'a aucune erreur et que le pack n'est pas « en préparation ».
 */
export function progressionPack(contenus: readonly ContenuRevue[], revues: Readonly<Record<string, RevueContenu | undefined>>, opts: { erreursControle?: number; statutPack?: string } = {}): ProgressionPack {
  const ob = contenus.filter((c) => c.obligatoire);
  const etats = ob.map((c) => etatContenu(c, revues[c.cle]));
  const acceptes = etats.filter((e) => e === 'accepte').length;
  return {
    profession: contenus[0]?.profession ?? '',
    acceptes, total: ob.length,
    aRetravailler: etats.filter((e) => e === 'a_retravailler').length,
    refuses: etats.filter((e) => e === 'refuse').length,
    enAttente: etats.filter((e) => e === 'en_attente').length,
    publiable: ob.length > 0 && acceptes === ob.length && !(opts.erreursControle ?? 0) && opts.statutPack !== 'en-preparation',
  };
}

/** « Pack Psychomotricien : 12/30 contenus acceptés » */
export const libelleProgression = (nomProfession: string, p: Pick<ProgressionPack, 'acceptes' | 'total'>) => `Pack ${nomProfession} : ${p.acceptes}/${p.total} contenus acceptés`;

/**
 * Section « Contenus à retravailler » de retours/SYNTHESE.md : dernière revue de chaque contenu (journal dans l'ordre), celles
 * au statut « a_retravailler », avec le commentaire de Paul et l'empreinte du texte revu.
 */
export function markdownContenusARetravailler(journal: readonly { cle: string; statut: string; commentaire?: string | null; empreinte?: string | null; jour?: string | null }[]): string {
  const dernier = new Map<string, (typeof journal)[number]>();
  for (const r of journal) if (estCleContenu(r.cle)) dernier.set(r.cle, r);
  const l = [...dernier.values()].filter((r) => r.statut === 'a_retravailler').sort((a, b) => (a.cle < b.cle ? -1 : 1));
  const md = ['## Contenus à retravailler (Arrivages)', ''];
  if (!l.length) return [...md, 'Aucun contenu à retravailler.'].join('\n');
  md.push('Textes des packs (packages/contenus/professions/<profession>/) renvoyés par Paul. Corriger le texte (son empreinte change : la carte revient dans les Arrivages), puis noter la correction dans retours/CHANGEMENTS.md.', '');
  for (const r of l) md.push(`- \`${r.cle}\`${r.jour ? ` — ${r.jour}` : ''}${r.empreinte ? ` · empreinte ${r.empreinte}` : ''} : ${r.commentaire?.trim() || '(sans commentaire)'}`);
  return md.join('\n');
}

/** Rendu Markdown minimal et sûr des textes de pack (titres ##, listes - et 1., **gras**, paragraphes), échappé */
export function htmlContenu(md: string, champs: Readonly<Record<string, string>> = {}): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ligne = (s: string) => esc(s)
    .replace(/\{([a-z_]+)\}/g, (m, k: string) => (champs[k] ? `<span class="ct-champ">${esc(champs[k])}</span>` : `<span class="ct-champ ct-vide">${k}</span>`))
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const out: string[] = [];
  let liste: 'ul' | 'ol' | null = null;
  const fermer = () => { if (liste) { out.push(`</${liste}>`); liste = null; } };
  for (const bloc of md.replace(/\r/g, '').split(/\n/)) {
    const t = bloc.trim();
    if (!t) { fermer(); continue; }
    const h = /^(#{2,4})\s+(.*)$/.exec(t);
    const ul = /^[-*]\s+(.*)$/.exec(t);
    const ol = /^\d+\.\s+(.*)$/.exec(t);
    if (h) { fermer(); out.push(`<h${h[1].length + 1}>${ligne(h[2])}</h${h[1].length + 1}>`); }
    else if (ul || ol) {
      const type = ul ? 'ul' : 'ol';
      if (liste !== type) { fermer(); out.push(`<${type}>`); liste = type; }
      out.push(`<li>${ligne((ul ?? ol)![1])}</li>`);
    } else { fermer(); out.push(`<p>${ligne(t)}</p>`); }
  }
  fermer();
  return out.join('');
}
