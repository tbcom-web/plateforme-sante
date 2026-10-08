// Annuaire Santé (RPPS) de l'Agence du Numérique en Santé : NORMALISATION des réponses de l'API FHIR « Annuaire Santé en
// libre accès » vers les champs du site, et fiches de DÉMONSTRATION (fictives) pour les tests et le mode test de l'admin.
// Fonctions pures, sans réseau : l'appel est fait côté serveur seulement (apps/admin/src/lib/annuaire-sante.ts, clé
// ANNUAIRE_SANTE_API_KEY). Recherche documentée dans docs/rpps-annuaire.md (sources officielles).
//
// Ce que l'annuaire donne (IG Annuaire 1.1.0, profils as-dp-*) :
//  - Practitioner : identifiants (RPPS 11 chiffres, IDNPS = « 8 » + RPPS), nom et prénom d'EXERCICE, civilité, qualifications
//    (profession TRE_G15, diplômes : type TRE_R14 « DE » / « DU », code et libellé du diplôme, savoir-faire) ; pas d'adresse.
//  - PractitionerRole : situation d'exercice (mode TRE_R23 : L libéral, S salarié…), lien vers la structure.
//  - Organization : raison sociale, ADRESSE et TÉLÉPHONE de la structure d'exercice (coordonnées publiques depuis 2015).
// Les DU figurent parfois (déclarés à l'Ordre, rares, jamais exhaustifs) : proposés au praticien seulement s'ils existent.
//
// Règle : rien n'est gardé sans confirmation du praticien (onboarding.ts, IdentiteConfirmee) ; la fiche brute n'est jamais
// enregistrée.

/** Ressource FHIR minimale (seuls les champs lus sont typés) */
type Coding = { system?: string; code?: string; display?: string };
type CodeableConcept = { coding?: Coding[]; text?: string };
type Ressource = {
  resourceType?: string;
  id?: string;
  active?: boolean;
  meta?: { lastUpdated?: string };
  identifier?: { system?: string; value?: string; type?: CodeableConcept }[];
  name?: { family?: string; given?: string[]; prefix?: string[]; suffix?: string[]; text?: string }[] | string;
  qualification?: { code?: CodeableConcept }[];
  code?: CodeableConcept[];
  practitioner?: { reference?: string };
  organization?: { reference?: string };
  address?: { line?: string[]; postalCode?: string; city?: string; text?: string }[];
  telecom?: { system?: string; value?: string }[];
};
export type BundleFhir = { resourceType?: string; total?: number; entry?: { resource?: Ressource; search?: { mode?: string } }[] };

export type DiplomeAnnuaire = { code: string; libelle: string; type: 'DE' | 'DU' | 'autre' };
export type LieuAnnuaire = {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  /** TRE_R23 : liberal (L), salarie (S), benevole (B), autre */
  mode: 'liberal' | 'salarie' | 'benevole' | 'autre';
};
export type FicheAnnuaire = {
  /** Identifiant FHIR (pour relire les situations d'exercice), jamais affiché */
  idFhir: string;
  rpps: string;
  civilite: string;
  prenom: string;
  nom: string;
  /** Code TRE_G15 (« 80 » = pédicure-podologue) ; null si absent */
  professionCode: string | null;
  professionLibelle: string;
  diplomes: DiplomeAnnuaire[];
  lieux: LieuAnnuaire[];
  /** Date de mise à jour de la fiche (à citer : « Données issues du RPPS, mise à jour du … ») */
  miseAJour: string | null;
  source: 'annuaire' | 'demonstration';
};
/** Résultat de recherche (liste) : le strict nécessaire pour reconnaître sa fiche */
export type ResumeAnnuaire = { idFhir: string; prenom: string; nom: string; professionLibelle: string; villes: string[] };

// ---------------------------------------------------------------------------------------------------------------------
// Outils
// ---------------------------------------------------------------------------------------------------------------------

const propre = (s: unknown, max = 160) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '');
const codings = (c: CodeableConcept | undefined) => (c?.coding ?? []).filter((x) => x && typeof x === 'object');
const dansSysteme = (c: Coding, motif: RegExp) => motif.test(c.system ?? '');
/** Majuscules de l'annuaire → casse lisible (« JEAN-MARIE » → « Jean-Marie », « DE LA TOUR » → « de la Tour ») */
export function casseNom(s: string): string {
  const t = propre(s, 80);
  if (!t || t !== t.toUpperCase()) return t;
  const petits = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'd', 'l', 'van', 'von', 'et']);
  return t.toLowerCase().replace(/[\p{L}]+/gu, (m, i: number) => (i > 0 && petits.has(m) ? m : m[0].toUpperCase() + m.slice(1)));
}
const casseVille = (s: string) => casseNom(s).replace(/\bSt\b/g, 'Saint').replace(/\bSte\b/g, 'Sainte');

/** Téléphone français lisible (« 0400000000 » / « +33400000000 » → « 04 00 00 00 00 ») ; autre format : tel quel */
export function telephoneLisible(s: string): string {
  const c = s.replace(/[^\d+]/g, '').replace(/^\+33/, '0').replace(/^0033/, '0');
  return /^0\d{9}$/.test(c) ? c.replace(/(\d{2})(?=\d)/g, '$1 ') : propre(s, 25);
}

/** RPPS saisi : 11 chiffres (espaces tolérés), sinon '' */
export const rppsSaisi = (s: string) => { const v = String(s ?? '').replace(/\s/g, ''); return /^\d{11}$/.test(v) ? v : ''; };

function rppsDe(r: Ressource): string {
  for (const i of r.identifier ?? []) {
    const v = String(i.value ?? '').replace(/\s/g, '');
    if (/rpps/i.test(i.system ?? '') && /^\d{11}$/.test(v)) return v;
  }
  for (const i of r.identifier ?? []) {
    const v = String(i.value ?? '').replace(/\s/g, '');
    // IDNPS : « 8 » + RPPS
    if ((/1\.2\.250\.1\.71\.4\.2\.1/.test(i.system ?? '') || codings(i.type).some((c) => c.code === 'IDNPS')) && /^8\d{11}$/.test(v)) return v.slice(1);
  }
  return '';
}

function nomDe(r: Ressource): { civilite: string; prenom: string; nom: string } {
  const n = Array.isArray(r.name) ? r.name[0] : undefined;
  return {
    civilite: propre(n?.prefix?.[0] ?? '', 20),
    prenom: casseNom(propre(n?.given?.[0] ?? '', 60)),
    nom: casseNom(propre(n?.family ?? '', 60)),
  };
}

const LIBELLES_PROFESSION: Record<string, string> = {
  '10': 'Médecin', '21': 'Pharmacien', '40': 'Chirurgien-dentiste', '50': 'Sage-femme', '60': 'Infirmier', '70': 'Masseur-kinésithérapeute',
  '80': 'Pédicure-podologue', '91': 'Orthophoniste', '92': 'Orthoptiste', '94': 'Ergothérapeute', '96': 'Psychomotricien',
};

function professionDe(r: Ressource): { code: string | null; libelle: string } {
  for (const q of r.qualification ?? []) {
    for (const c of codings(q.code)) {
      if (dansSysteme(c, /TRE[_-]G15|ProfessionSante/i) && c.code) return { code: c.code, libelle: propre(c.display) || LIBELLES_PROFESSION[c.code] || '' };
    }
  }
  return { code: null, libelle: '' };
}

/**
 * Diplômes d'une fiche : type lu dans TRE_R14 (« DE », « DU »…) quand il est donné, sinon déduit du code (« DE12 » : diplôme
 * d'État ; libellé commençant par « DU » ou « DIU » : diplôme universitaire). Seuls les diplômes présents sont rendus.
 */
function diplomesDe(r: Ressource): DiplomeAnnuaire[] {
  const sortie: DiplomeAnnuaire[] = [];
  for (const q of r.qualification ?? []) {
    const cs = codings(q.code);
    if (cs.some((c) => dansSysteme(c, /TRE[_-]G15|ProfessionSante|SavoirFaire|TRE[_-]R(38|39|40|42|43|44|45)/i))) continue;
    const type = cs.find((c) => dansSysteme(c, /TypeDiplome|TRE[_-]R14|J81/i))?.code?.toUpperCase();
    const dip = cs.find((c) => dansSysteme(c, /Diplome|Diplôme|J105|TRE[_-]R48/i) && !dansSysteme(c, /TypeDiplome|TRE[_-]R14|J81/i));
    if (!dip?.code) continue;
    const libelle = propre(dip.display || q.code?.text || '', 160);
    const t: DiplomeAnnuaire['type'] = type === 'DE' || (!type && /^DE\d+$/i.test(dip.code))
      ? 'DE'
      : type === 'DU' || type === 'DIU' || (!type && /^\s*D\.?I?\.?U\b/i.test(libelle))
        ? 'DU'
        : 'autre';
    if (!sortie.some((d) => d.code === dip.code)) sortie.push({ code: propre(dip.code, 20), libelle, type: t });
  }
  return sortie;
}

function modeDe(role: Ressource): LieuAnnuaire['mode'] {
  for (const c of (role.code ?? []).flatMap(codings)) {
    if (dansSysteme(c, /TRE[_-]R23|ModeExercice|J95/i)) return c.code === 'L' ? 'liberal' : c.code === 'S' ? 'salarie' : c.code === 'B' ? 'benevole' : 'autre';
  }
  return 'autre';
}

function lieuDe(org: Ressource | undefined, role: Ressource): LieuAnnuaire | null {
  if (!org) return null;
  const a = org.address?.[0];
  const lignes = (a?.line ?? []).map((l) => propre(l, 120)).filter(Boolean);
  const tel = (org.telecom ?? []).find((t) => t.system === 'phone' && t.value)?.value ?? '';
  const lieu: LieuAnnuaire = {
    nom: casseNom(propre(typeof org.name === 'string' ? org.name : '', 120)),
    adresse: casseNom(lignes.join(', ')).slice(0, 160),
    codePostal: propre(a?.postalCode ?? '', 10),
    ville: casseVille(propre(a?.city ?? '', 80)),
    telephone: tel ? telephoneLisible(tel) : '',
    mode: modeDe(role),
  };
  return lieu.adresse || lieu.ville || lieu.telephone ? lieu : null;
}

const ressources = (b: BundleFhir | null | undefined) => (b?.entry ?? []).map((e) => e?.resource).filter((r): r is Ressource => Boolean(r && typeof r === 'object'));
const refId = (ref: string | undefined) => (ref ?? '').split('/').pop() ?? '';

// ---------------------------------------------------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------------------------------------------------

/** Résumés d'une recherche Practitioner (+ éventuels PractitionerRole/Organization inclus pour la ville) */
export function resumesDepuisBundle(b: BundleFhir | null | undefined, roles?: BundleFhir | null): ResumeAnnuaire[] {
  const praticiens = ressources(b).filter((r) => r.resourceType === 'Practitioner' && r.id && r.active !== false);
  const tout = [...ressources(b), ...ressources(roles)];
  const orgs = new Map(tout.filter((r) => r.resourceType === 'Organization' && r.id).map((r) => [r.id!, r]));
  return praticiens.slice(0, 20).map((p) => {
    const { prenom, nom } = nomDe(p);
    const villes = [...new Set(tout
      .filter((r) => r.resourceType === 'PractitionerRole' && r.active !== false && refId(r.practitioner?.reference) === p.id)
      .map((r) => casseVille(propre(orgs.get(refId(r.organization?.reference))?.address?.[0]?.city ?? '', 80)))
      .filter(Boolean))].slice(0, 3);
    return { idFhir: p.id!, prenom, nom, professionLibelle: professionDe(p).libelle, villes };
  });
}

/** Fiche complète : un Practitioner et le bundle de ses PractitionerRole (organisations incluses) */
export function ficheDepuisBundles(praticien: BundleFhir | Ressource | null | undefined, roles: BundleFhir | null | undefined, source: FicheAnnuaire['source'] = 'annuaire'): FicheAnnuaire | null {
  const p = (praticien as BundleFhir)?.entry
    ? ressources(praticien as BundleFhir).find((r) => r.resourceType === 'Practitioner')
    : (praticien as Ressource | null | undefined);
  if (!p || p.resourceType !== 'Practitioner' || !p.id) return null;
  const orgs = new Map(ressources(roles).filter((r) => r.resourceType === 'Organization' && r.id).map((r) => [r.id!, r]));
  const lieux = ressources(roles)
    .filter((r) => r.resourceType === 'PractitionerRole' && r.active !== false && (!r.practitioner?.reference || refId(r.practitioner.reference) === p.id))
    .map((r) => lieuDe(orgs.get(refId(r.organization?.reference)), r))
    .filter((l): l is LieuAnnuaire => Boolean(l))
    // Libéral d'abord (le cabinet), puis le reste ; doublons d'adresse retirés
    .sort((a, b) => (a.mode === 'liberal' ? 0 : 1) - (b.mode === 'liberal' ? 0 : 1))
    .filter((l, i, t) => t.findIndex((x) => x.adresse === l.adresse && x.ville === l.ville) === i)
    .slice(0, 3);
  const prof = professionDe(p);
  return {
    idFhir: p.id,
    rpps: rppsDe(p),
    ...nomDe(p),
    professionCode: prof.code,
    professionLibelle: prof.libelle,
    diplomes: diplomesDe(p),
    lieux,
    miseAJour: typeof p.meta?.lastUpdated === 'string' && !Number.isNaN(Date.parse(p.meta.lastUpdated)) ? p.meta.lastUpdated.slice(0, 10) : null,
    source,
  };
}

/** Diplômes universitaires RÉELLEMENT présents sur la fiche (libellés) ; [] le plus souvent */
export const diplomesUniversitairesDe = (f: Pick<FicheAnnuaire, 'diplomes'> | null | undefined) => (f?.diplomes ?? []).filter((d) => d.type === 'DU' && d.libelle).map((d) => d.libelle);

/** Diplôme d'État présent sur la fiche, parmi les codes reconnus pour le métier */
export const diplomeEtatPresent = (f: Pick<FicheAnnuaire, 'diplomes'> | null | undefined, codes: readonly string[]) =>
  (f?.diplomes ?? []).some((d) => d.type === 'DE' && (!codes.length || codes.includes(d.code.toUpperCase())));

/** Mention de source à afficher sous les informations préremplies (CGU de l'ANS : source et date de mise à jour) */
export function mentionSource(f: Pick<FicheAnnuaire, 'source' | 'miseAJour'>): string {
  if (f.source === 'demonstration') return 'Fiche de démonstration (fictive) : aucune donnée réelle.';
  const date = f.miseAJour ? new Date(`${f.miseAJour}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }) : '';
  return `Données issues du RPPS (Annuaire Santé, Agence du Numérique en Santé)${date ? `, fiche mise à jour le ${date}` : ''}.`;
}

/** Recherche par nom : nom saisi normalisé pour l'API (sans accents ni ponctuation superflue) */
export const nomPourRecherche = (s: string) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z' -]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
/** Comparaison de villes tolérante (accents, tirets, « Saint »/« St ») */
export const memeVille = (a: string, b: string) => {
  const n = (s: string) => nomPourRecherche(s).toLowerCase().replace(/\bst\b/g, 'saint').replace(/\bste\b/g, 'sainte').replace(/[-' ]+/g, ' ').trim();
  return Boolean(n(a)) && n(a) === n(b);
};

// ---------------------------------------------------------------------------------------------------------------------
// Fiches de DÉMONSTRATION (fictives : noms d'exemple, adresses « rue de l'Exemple », téléphones de la plage réservée aux
// œuvres de fiction 01 99 00, RPPS non attribuables « 1000000000x »). Même structure que les réponses documentées de l'API :
// elles passent par la même normalisation. Jamais un vrai praticien.
// ---------------------------------------------------------------------------------------------------------------------

const S_PROF = 'https://mos.esante.gouv.fr/NOS/TRE_G15-ProfessionSante/FHIR/TRE-G15-ProfessionSante';
const S_TYPE_DIP = 'https://mos.esante.gouv.fr/NOS/TRE_R14-TypeDiplome/FHIR/TRE-R14-TypeDiplome';
const S_DIP = 'https://mos.esante.gouv.fr/NOS/TRE_R48-DiplomeEtatFrancais/FHIR/TRE-R48-DiplomeEtatFrancais';
const S_DU = 'https://mos.esante.gouv.fr/NOS/TRE_R49-DiplomeUniversitaire/FHIR/TRE-R49-DiplomeUniversitaire';
const S_MODE = 'https://mos.esante.gouv.fr/NOS/TRE_R23-ModeExercice/FHIR/TRE-R23-ModeExercice';

type Demo = { id: string; rpps: string; civilite: string; prenom: string; nom: string; ville: string; cp: string; adresse: string; tel: string; cabinet: string; du?: { code: string; libelle: string }[]; profession?: string };

/** Personas de démonstration (mode test de l'admin, Playwright) */
export const DEMOS_ANNUAIRE: readonly (Demo & { persona: string; titre: string })[] = [
  { persona: 'sport-basket', titre: 'Sport · basket', id: 'demo-sport', rpps: '10000000001', civilite: 'M', prenom: 'CAMILLE', nom: 'EXEMPLE', ville: 'LYON', cp: '69003', adresse: "12 RUE DE L'EXEMPLE", tel: '0199000101', cabinet: 'CABINET DE PODOLOGIE EXEMPLE', du: [{ code: 'DIP284', libelle: 'DU Podologie du sport' }] },
  { persona: 'diabete-senior', titre: 'Diabète senior', id: 'demo-diabete', rpps: '10000000002', civilite: 'MME', prenom: 'DOMINIQUE', nom: 'MODELE', ville: 'SAINT-ETIENNE', cp: '42000', adresse: '4 PLACE DE LA DEMONSTRATION', tel: '0199000102', cabinet: '' },
  { persona: 'enfant', titre: 'Enfant', id: 'demo-enfant', rpps: '10000000003', civilite: 'MME', prenom: 'ALEXANDRA', nom: 'FICTIVE', ville: 'NANTES', cp: '44000', adresse: "8 BOULEVARD DE L'ESSAI", tel: '0199000103', cabinet: 'CABINET DES PETITS PAS' },
];

/** Bundle Practitioner d'une démo (structure de l'API v2) */
export function bundlePraticienDemo(d: Demo): BundleFhir {
  return {
    resourceType: 'Bundle', total: 1,
    entry: [{ resource: {
      resourceType: 'Practitioner', id: d.id, active: true, meta: { lastUpdated: '2026-10-01T08:00:00+02:00' },
      identifier: [
        { system: 'urn:oid:1.2.250.1.71.4.2.1', type: { coding: [{ code: 'IDNPS' }] }, value: `8${d.rpps}` },
        { system: 'https://rpps.esante.gouv.fr', type: { coding: [{ code: 'RPPS' }] }, value: d.rpps },
      ],
      name: [{ family: d.nom, given: [d.prenom], prefix: [d.civilite] }],
      qualification: [
        { code: { coding: [{ system: S_PROF, code: d.profession ?? '80', display: 'Pédicure-Podologue' }] } },
        { code: { coding: [{ system: S_TYPE_DIP, code: 'DE' }, { system: S_DIP, code: 'DE12', display: 'Diplôme d’État français de Pédicure-Podologue' }] } },
        ...(d.du ?? []).map((x) => ({ code: { coding: [{ system: S_TYPE_DIP, code: 'DU' }, { system: S_DU, code: x.code, display: x.libelle }] } })),
      ],
    } }],
  };
}

/** Bundle PractitionerRole + Organization d'une démo */
export function bundleRolesDemo(d: Demo): BundleFhir {
  return {
    resourceType: 'Bundle',
    entry: [
      { resource: { resourceType: 'PractitionerRole', id: `${d.id}-role`, active: true, practitioner: { reference: `Practitioner/${d.id}` }, organization: { reference: `Organization/${d.id}-org` }, code: [{ coding: [{ system: S_MODE, code: 'L', display: 'Libéral' }] }] } },
      { resource: { resourceType: 'Organization', id: `${d.id}-org`, name: d.cabinet, address: [{ line: [d.adresse], postalCode: d.cp, city: d.ville }], telecom: [{ system: 'phone', value: d.tel }] }, search: { mode: 'include' } },
    ],
  };
}

/** Fiche de démonstration d'un persona ou d'un RPPS fictif (null sinon) */
export function ficheDemo(cle: string): FicheAnnuaire | null {
  const d = DEMOS_ANNUAIRE.find((x) => x.persona === cle || x.rpps === cle || x.id === cle);
  return d ? ficheDepuisBundles(bundlePraticienDemo(d), bundleRolesDemo(d), 'demonstration') : null;
}

/** Recherche de démonstration par nom (et ville) : résumés des fiches fictives qui correspondent */
export function rechercheDemo(nom: string, ville: string): ResumeAnnuaire[] {
  const n = nomPourRecherche(nom).toLowerCase();
  return DEMOS_ANNUAIRE
    .filter((d) => n && d.nom.toLowerCase().startsWith(n) && (!ville.trim() || memeVille(d.ville, ville)))
    .map((d) => resumesDepuisBundle(bundlePraticienDemo(d), bundleRolesDemo(d))[0]);
}
