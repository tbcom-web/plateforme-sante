// Export des retours de Paul vers le dépôt (workflow .github/workflows/exporter-retours.yml, chaque nuit ou bouton
// « Envoyer mes retours à Claude maintenant »). Lit Supabase avec la clé secrète (secrets GitHub seulement) et écrit dans
// retours/ (ou $RETOURS_DIR) :
//   assets-notes.json, atelier-notes.json, illustrations-revues.json, illustrations-statuts.json : données brutes, triées
//   assets-sujets.json : sujets des visuels ajoutés / retirés par Paul (état courant par clé, table assets_sujets, 0028)
//   assets-hashtags.json : hashtags libres des visuels (état courant par clé, table assets_hashtags, 0029 ; hashtags.ts)
//   inspirations.json : métadonnées des inspirations (étiquettes, objectif, sujet, type, palette, domaine du lien) — JAMAIS
//   l'image, son chemin dans le stockage privé, une URL signée ni l'adresse complète du lien
//   CALIBRATION.md : section « Mesure automatique » recalculée (prédictions du juge, predictions.json, vs notes de Paul ;
//   juge.ts) ; le reste du fichier, tenu à la main, est conservé
//   SYNTHESE.md : tendances lisibles (fonctions pures du core : syntheseAssets, markdownAssets, syntheseAtelier, markdownAtelier),
//   et « Animations en attente d'ingrédients validés » (markdownAnimationsEnAttente, animations-sources.ts)
//   0034 : appareil (ordinateur, mobile, les-deux) et zones signalées (coordonnées 0-1, étiquette, commentaire, appareil,
//   empreinte) dans assets-notes.json et atelier-notes.json ; recettes-notes.json (notes de recette et PAR PAGE, sans auteur) ;
//   defauts-mobile.json (retours « Rendu mobile » : adaptation téléphone) ; sections « Retours mobile » (dont « Rendu mobile à
//   revoir »), « Par page » et « Zones signalées » (une ligne par zone) dans SYNTHESE.md
// Le dépôt est PUBLIC : seules des colonnes explicites sont lues — jamais d'auteur, d'e-mail, d'identifiant de compte, ni
// aucune table de leads, prospects ou sites. Dates réduites au jour. Aucune date d'export dans les fichiers : un export
// sans nouveau retour ne change rien (pas de commit).
// Variables : SUPABASE_URL, SUPABASE_SECRET_KEY (requises), RETOURS_DIR (facultative). Usage : node scripts/exporter-retours.mjs
import { build } from 'esbuild';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');
const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('SUPABASE_URL et SUPABASE_SECRET_KEY sont requis.');
const sortie = process.env.RETOURS_DIR ? join(process.cwd(), process.env.RETOURS_DIR) : join(racine, 'retours');

/**
 * Lecture paginée d'une table (colonnes explicites) ; table absente (migration pas encore exécutée) → null. `repli` : colonnes
 * sans celles d'une migration plus récente (ex. positif / negatif de 0028), relues si la première lecture échoue.
 */
async function lireTout(table, colonnes, ordre, repli) {
  const l = await lireColonnes(table, colonnes, ordre);
  return l === null && repli ? lireColonnes(table, repli, ordre) : l;
}
async function lireColonnes(table, colonnes, ordre) {
  const lignes = [];
  for (let debut = 0; ; debut += 1000) {
    const r = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?select=${colonnes}&order=${ordre}`, {
      headers: { apikey: SUPABASE_SECRET_KEY, Range: `${debut}-${debut + 999}`, 'Range-Unit': 'items' },
    });
    if (r.status === 404 || (r.status === 400 && /does not exist|PGRST205|42P01/.test(await r.clone().text()))) return null;
    if (!r.ok && r.status !== 206) throw new Error(`Supabase ${r.status} sur ${table} : ${await r.text()}`);
    const page = await r.json();
    lignes.push(...page);
    if (page.length < 1000) return lignes;
  }
}

// Fonctions pures du core, assemblées par esbuild (TypeScript, imports sans extension), comme les tests du core
const tmp = mkdtempSync(join(tmpdir(), 'exporter-retours-'));
let core;
try {
  await build({
    stdin: {
      contents: "export { syntheseAssets, markdownAssets, titresAssets, typeDeCle, estEtiquetteDuType } from './assets'; export { syntheseAtelier, markdownAtelier, estEtiquetteAtelier } from './atelier'; export { inspirationPourExport, markdownInspirations } from './inspirations'; export { surchargesDepuisLignes, markdownSujets, sujetsSansVisuel } from './sujets-visuels'; export { inventaireAssets, inventaireStudio } from './assets'; export { markdownAnimationsEnAttente } from './animations-sources'; export { lirePredictions, pairesJuge, markdownCalibration, empreinteImage } from './juge'; export { markdownRecettes, recetteDepuisLigne, resumeRenforts, markdownParPage, normaliserComposition } from './recettes'; export { normaliserZones, lignesZones } from './zones'; export { appareilDe, retourMobileDepuisLigne, markdownRetoursMobile, empreinteMobile } from './rendu-mobile'; export { empreinteAsset } from './avant-apres';",
      resolveDir: join(racine, 'packages', 'core', 'src'), loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile: join(tmp, 'core.mjs'), logLevel: 'warning', loader: { '.svg': 'text' },
  });
  core = await import(pathToFileURL(join(tmp, 'core.mjs')).href);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// Hashtags des visuels (0029) : fonctions pures de hashtags.ts, assemblées à part
const tmpHashtags = mkdtempSync(join(tmpdir(), 'exporter-hashtags-'));
let coreHashtags;
try {
  await build({ entryPoints: [join(racine, 'packages', 'core', 'src', 'hashtags.ts')], bundle: true, platform: 'node', format: 'esm', outfile: join(tmpHashtags, 'hashtags.mjs'), logLevel: 'warning' });
  coreHashtags = await import(pathToFileURL(join(tmpHashtags, 'hashtags.mjs')).href);
} finally {
  rmSync(tmpHashtags, { recursive: true, force: true });
}

const jour = (d) => (typeof d === 'string' ? d.slice(0, 10) : null);
const texte = (t) => (typeof t === 'string' && t.trim() ? t.trim() : null);

/** Lecture avec les colonnes de 0034 (appareil, zones…), sinon sans elles, sinon le repli plus ancien */
const lireAvec0034 = async (table, colonnes0034, colonnes, ordre, repli) => (await lireColonnes(table, colonnes0034, ordre)) ?? lireTout(table, colonnes, ordre, repli);

const [assets, atelier, revues, statuts, inspirations, sujets, hashtags, recettesBrutes, recettesNotesBrutes, defautsMobileBruts] = await Promise.all([
  // Remarques « ce qui va bien / ce qui ne va pas » (0028) ; jamais l'instantané « apercu » (lourd, inutile à Claude)
  lireAvec0034('assets_notes', 'cle_asset,type,note,etiquettes,commentaire,positif,negatif,empreinte,appareil,zones,created_at', 'cle_asset,type,note,etiquettes,commentaire,positif,negatif,empreinte,created_at', 'created_at.asc,cle_asset.asc', 'cle_asset,type,note,etiquettes,commentaire,empreinte,created_at'),
  lireAvec0034('atelier_notes', 'cle_combinaison,ingredients,note,etiquettes,commentaire,positif,negatif,appareil,zones,created_at', 'cle_combinaison,ingredients,note,etiquettes,commentaire,positif,negatif,created_at', 'created_at.asc,cle_combinaison.asc', 'cle_combinaison,ingredients,note,etiquettes,commentaire,created_at'),
  lireTout('illustrations_revues', 'cle,statut,commentaire,empreinte,created_at', 'created_at.asc,cle.asc'),
  lireTout('illustrations_statuts', 'cle,statut,empreinte,maj_le', 'cle.asc'),
  // Colonnes explicites : ni chemin (stockage privé), ni auteur, ni identifiant
  lireTout('inspirations', 'etiquettes,objectif,sujet,type_element,lien,palette,created_at', 'created_at.asc,objectif.asc'),
  // Journal des sujets (sans auteur) → état courant
  lireTout('assets_sujets', 'cle_asset,sujet,action,created_at', 'created_at.asc,cle_asset.asc,sujet.asc'),
  // Journal des hashtags (sans auteur) → état courant
  lireTout('assets_hashtags', 'cle_asset,hashtag,action,created_at', 'created_at.asc,cle_asset.asc,hashtag.asc'),
  // Recettes du studio (0032) : sans auteur
  lireTout('recettes', 'id,nom,sujets,couleurs_preferees,composition,note,etiquettes,positif,negatif,statut,created_at,updated_at', 'created_at.asc,id.asc'),
  // Journal des notes de recettes : par page et par appareil (0034), sans auteur
  lireAvec0034('recettes_notes', 'recette,page,appareil,note,etiquettes,positif,negatif,zones,composition,created_at', 'recette,note,etiquettes,positif,negatif,composition,created_at', 'created_at.asc,recette.asc'),
  // Retours « Rendu mobile » (0034) : adaptation téléphone, sans auteur ni recette
  lireTout('defauts_mobile', 'cle,page,verdict,note,etiquettes,remarque,zones,empreinte,statut,created_at', 'created_at.asc,cle.asc'),
]);

const notesAssets = (assets ?? []).map((l) => ({ cle: l.cle_asset, type: l.type, note: l.note, etiquettes: l.etiquettes ?? [], commentaire: texte(l.commentaire), positif: texte(l.positif), negatif: texte(l.negatif), empreinte: l.empreinte ?? null, appareil: core.appareilDe(l.appareil), zones: core.normaliserZones(l.zones), jour: jour(l.created_at) }));
const notesAtelier = (atelier ?? []).map((l) => ({ cle: l.cle_combinaison, ingredients: l.ingredients ?? {}, note: l.note, etiquettes: l.etiquettes ?? [], commentaire: texte(l.commentaire), positif: texte(l.positif), negatif: texte(l.negatif), appareil: core.appareilDe(l.appareil), zones: core.normaliserZones(l.zones), jour: jour(l.created_at) }));
const surchargesSujets = core.surchargesDepuisLignes((sujets ?? []).map((l) => ({ cle: l.cle_asset, sujet: l.sujet, action: l.action, le: l.created_at })));
const journal = (revues ?? []).map((l) => ({ cle: l.cle, statut: l.statut, commentaire: texte(l.commentaire), empreinte: l.empreinte ?? null, jour: jour(l.created_at) }));
const courants = (statuts ?? []).map((l) => ({ cle: l.cle, statut: l.statut, empreinte: l.empreinte ?? null, jour: jour(l.maj_le) }));
const listeInspirations = (inspirations ?? []).map((l) => core.inspirationPourExport(l));

const recettes = (recettesBrutes ?? []).map((l) => core.recetteDepuisLigne(l)).filter(Boolean);
const nomsRecettes = new Map(recettes.map((r) => [r.id, r]));
const notesRecettes = (recettesNotesBrutes ?? []).map((l) => {
  const r = nomsRecettes.get(l.recette);
  const composition = r ? core.normaliserComposition(l.composition ?? r.composition, { sujets: r.sujets, principaux: Math.min(3, r.sujets.length) }) : null;
  return { recette: l.recette, nom: r?.nom ?? null, page: l.page ?? null, appareil: core.appareilDe(l.appareil), note: l.note, etiquettes: l.etiquettes ?? [], positif: texte(l.positif), negatif: texte(l.negatif), zones: core.normaliserZones(l.zones), composition, jour: jour(l.created_at) };
});
const retoursMobile = (defautsMobileBruts ?? []).map((l) => core.retourMobileDepuisLigne(l)).filter(Boolean).map((r) => ({ ...r, le: jour(r.le) }));

mkdirSync(sortie, { recursive: true });
const ecrire = (nom, contenu) => writeFileSync(join(sortie, nom), typeof contenu === 'string' ? contenu : `${JSON.stringify(contenu, null, 2)}\n`);
ecrire('assets-notes.json', notesAssets);
ecrire('atelier-notes.json', notesAtelier);
ecrire('recettes.json', recettes.map((r) => ({ id: r.id, nom: r.nom, sujets: r.sujets, couleursPreferees: r.couleursPreferees, composition: r.composition, note: r.note, etiquettes: r.etiquettes, positif: texte(r.positif), negatif: texte(r.negatif), statut: r.statut, jour: jour(r.modifieLe) })));
ecrire('recettes-notes.json', notesRecettes);
ecrire('defauts-mobile.json', retoursMobile);
ecrire('illustrations-revues.json', journal);
ecrire('illustrations-statuts.json', courants);
ecrire('inspirations.json', listeInspirations);
ecrire('assets-sujets.json', surchargesSujets);
const hashtagsAssets = coreHashtags.hashtagsDepuisLignes((hashtags ?? []).map((l) => ({ cle: l.cle_asset, hashtag: l.hashtag, action: l.action, le: l.created_at })));
ecrire('assets-hashtags.json', hashtagsAssets);

// Synthèse : dernier commentaire de revue par clé pour « à retravailler » ; dates au jour (ordre des commentaires)
const derniers = new Map();
for (const r of journal) if (r.commentaire) derniers.set(r.cle, r);
const titres = core.titresAssets();
const sAssets = core.syntheseAssets(notesAssets.map((n) => ({ ...n, le: n.jour })), {
  statuts: courants.map((s) => ({ cle: s.cle, statut: s.statut, commentaire: derniers.get(s.cle)?.commentaire ?? null, le: s.jour })),
  titres,
});
const sAtelier = core.syntheseAtelier(notesAtelier.map((n) => ({ ...n, le: n.jour })));
const dernierJour = [...notesAssets, ...notesAtelier, ...journal].map((x) => x.jour).filter(Boolean).sort().pop() ?? null;
const descendre = (md) => md.split('\n').map((l) => (/^#{1,5} /.test(l) ? `#${l}` : l)).join('\n');
const manquantes = [[assets, 'assets_notes (0027)'], [atelier, 'atelier_notes (0026)'], [revues, 'illustrations_revues (0021)'], [inspirations, 'inspirations (0028)'], [sujets, 'assets_sujets (0028)'], [hashtags, 'assets_hashtags (0029)'], [recettesBrutes, 'recettes (0032)'], [defautsMobileBruts, 'defauts_mobile (0034)']].filter(([d]) => d === null).map(([, n]) => n);
// Empreinte mobile courante (rendu-mobile.ts) : un défaut signalé sur une empreinte antérieure est « Modifié (mobile) »
const inventaireCode = new Map([...core.inventaireAssets(), ...core.inventaireStudio()].map((a) => [a.cle, a]));
const empreinteMobileActuelle = (cle) => { const a = inventaireCode.get(cle); return core.empreinteMobile(cle, a ? core.empreinteAsset(a) : null); };
// Zones signalées : une ligne par zone, rattachée à sa note (assets, thèmes complets, pages de recettes)
const zonesMd = (() => {
  const l = ['## Zones signalées', ''];
  const avec = [
    ...notesAssets.filter((n) => n.zones).map((n) => ({ titre: `${titres[n.cle] ?? n.cle} (\`${n.cle}\`)`, n })),
    ...notesAtelier.filter((n) => n.zones).map((n) => ({ titre: `Thème complet \`${n.cle}\``, n })),
    ...notesRecettes.filter((n) => n.zones).map((n) => ({ titre: `Recette « ${n.nom ?? n.recette} »${n.page ? `, page ${n.page}` : ''}`, n })),
  ];
  if (!avec.length) { l.push('Aucune zone signalée.'); return l.join('\n'); }
  l.push('Corriger chaque zone et la mentionner dans retours/CHANGEMENTS.md (PNG avec les zones : node scripts/rendre-assets.mjs --sortie <dossier> --zones).', '');
  for (const { titre, n } of avec) {
    l.push(`- ${titre} — ${n.jour ?? ''} · ${n.note}★ · ${n.appareil}${n.zones.empreinte ? ` · empreinte ${n.zones.empreinte}` : ''}`);
    for (const z of core.lignesZones(n.zones)) l.push(`  - ${z}`);
  }
  return l.join('\n');
})();

const md = [
  '# Retours de Paul — synthèse',
  '',
  `Export automatique (scripts/exporter-retours.mjs). Données jusqu’au ${dernierJour ?? '—'} : ${notesAssets.length} avis sur les assets, ${notesAtelier.length} sur les thèmes complets, ${journal.length} changements de statut.`,
  'Lire ensuite les JSON du dossier pour le détail ; noter chaque correction faite dans retours/CHANGEMENTS.md (docs/retours.md).',
  ...(manquantes.length ? ['', `Tables absentes (migrations à exécuter) : ${manquantes.join(', ')}.`] : []),
  '',
  core.markdownAssets(sAssets, { titre: '## Assets (icônes, illustrations, photos, gammes, structures)' }),
  '',
  descendre(core.markdownAtelier(sAtelier)),
  '',
  coreHashtags.markdownHashtags(hashtagsAssets, { titres }),
  '',
  core.markdownSujets(surchargesSujets, { titres, sansVisuel: core.sujetsSansVisuel(core.inventaireAssets(), surchargesSujets) }),
  '',
  core.markdownAnimationsEnAttente(Object.fromEntries(courants.map((x) => [x.cle, x.statut]))),
  '',
  core.markdownInspirations(listeInspirations, { titre: '## Inspirations (références seulement, jamais réutilisées)' }),
  '',
  core.markdownRecettes(recettes, { titre: '## Recettes du studio (/admin/atelier/studio)' }),
  ...(recettes.length ? ['', 'Renforts des ingrédients (recettes notées) :', ...core.resumeRenforts(recettes, 10).map((x) => `- ${x}`)] : []),
  '',
  core.markdownParPage(notesRecettes.filter((n) => n.composition), core.lignesZones),
  '',
  core.markdownRetoursMobile(notesAssets.map((n) => ({ cle: n.cle, note: n.note, appareil: n.appareil })), retoursMobile, { titres, empreinteActuelle: empreinteMobileActuelle }),
  '',
  zonesMd,
  '',
].join('\n');
ecrire('SYNTHESE.md', md);

// Juge du goût de Paul (juge.ts) : prédictions de retours/predictions.json comparées aux notes sur le même élément (clé +
// empreinte ; photos et structures : adresse de l'image) → section automatique de CALIBRATION.md, entre les marqueurs
const cheminPredictions = [join(sortie, 'predictions.json'), join(racine, 'retours', 'predictions.json')].find((c) => existsSync(c));
const cheminCalibration = join(sortie, 'CALIBRATION.md');
if (cheminPredictions && existsSync(cheminCalibration)) {
  const predictions = core.lirePredictions(JSON.parse(readFileSync(cheminPredictions, 'utf8')));
  const images = new Map(core.inventaireAssets().filter((a) => a.rendu.kind === 'image').map((a) => [a.cle, core.empreinteImage(a.rendu.src)]));
  const paires = core.pairesJuge(predictions, notesAssets.map((n) => ({ ...n, le: n.jour })), (cle) => images.get(cle) ?? null);
  const ancien = readFileSync(cheminCalibration, 'utf8');
  const debut = '<!-- mesure-auto -->', fin = '<!-- /mesure-auto -->';
  const i = ancien.indexOf(debut), j = ancien.indexOf(fin);
  if (i >= 0 && j > i) writeFileSync(cheminCalibration, `${ancien.slice(0, i + debut.length)}\n${core.markdownCalibration(paires, { jour: dernierJour })}${ancien.slice(j)}`);
}
// Références d'illustration (0033) : pour chaque élément, les images de référence cochées par Paul — page d'origine PUBLIQUE,
// licence, étiquettes « ce qui m'inspire », texte, classement accepté. Jamais de vignette, de chemin du stockage privé, d'URL
// signée ni d'auteur du compte (colonnes explicites). Suggestions de classement refusées → section de SYNTHESE.md.
{
  const tmpRef = mkdtempSync(join(tmpdir(), 'exporter-references-'));
  let coreRef;
  try {
    await build({
      stdin: { contents: "export { referencesPourExport } from './references-illustrations'; export { markdownSuggestionsRefusees } from './classement-visuels';", resolveDir: join(racine, 'packages', 'core', 'src'), loader: 'ts' },
      bundle: true, platform: 'node', format: 'esm', outfile: join(tmpRef, 'references.mjs'), logLevel: 'warning', loader: { '.svg': 'text' },
    });
    coreRef = await import(pathToFileURL(join(tmpRef, 'references.mjs')).href);
  } finally {
    rmSync(tmpRef, { recursive: true, force: true });
  }
  const [lignesRef, suggestions] = await Promise.all([
    lireTout('inspirations', 'cle_asset,origine,page_origine,licence_origine,licence_url_origine,etiquettes,objectif,sujets,hashtags,requete,created_at', 'created_at.asc,page_origine.asc'),
    lireTout('classement_suggestions', 'nature,valeur,decision', 'created_at.asc,valeur.asc'),
  ]);
  ecrire('references-illustrations.json', coreRef.referencesPourExport((lignesRef ?? []).filter((l) => l.cle_asset), core.titresAssets()));
  if (suggestions !== null) {
    const synthese = readFileSync(join(sortie, 'SYNTHESE.md'), 'utf8').replace(/\n+$/, '');
    ecrire('SYNTHESE.md', `${synthese}\n\n${coreRef.markdownSuggestionsRefusees(suggestions)}\n`);
  }
}

// Avis sur le directeur artistique (0035) : propositions « Pas convaincu » / enregistrées, manques « À faire » / « Pas utile »
// (sans auteur) ; absent tant que la migration n'est pas exécutée
{
  const avis = await lireTout('directeur_avis', 'nature,cle,decision,remarque,profil,created_at', 'created_at.asc,cle.asc');
  if (avis !== null) ecrire('directeur-avis.json', avis.map((l) => ({ nature: l.nature, cle: l.cle, decision: l.decision, remarque: texte(l.remarque), profil: l.profil ?? null, jour: jour(l.created_at) })));
}

// Duels « A ou B ? » (0037, duels.ts) et couverture par sujet (couverture-sujets.ts) : duels.json (sans auteur, dates au jour),
// sections « Duels : classements par sujet » et « Couverture par sujet » de SYNTHESE.md, section automatique de MANQUES.md
// (entre <!-- couverture-auto --> et <!-- /couverture-auto -->, ajoutée en fin de fichier la première fois ; le reste est conservé)
{
  const tmpDuels = mkdtempSync(join(tmpdir(), 'exporter-duels-'));
  let cd;
  try {
    await build({
      stdin: { contents: "export { duelDepuisLigne, duelPourExport, markdownDuels } from './duels'; export { couvertureParSujet, markdownCouverture } from './couverture-sujets'; export { inventaireAssets, titresAssets } from './assets'; export { SUJETS_VISUELS } from './photos-libres'; export { NOMS_SECTIONS_VARIABLES } from './recettes'; export { jeuPhotosDepuisLigne, photosDuJeu } from './jeux-photos';", resolveDir: join(racine, 'packages', 'core', 'src'), loader: 'ts' },
      bundle: true, platform: 'node', format: 'esm', outfile: join(tmpDuels, 'duels.mjs'), logLevel: 'warning', loader: { '.svg': 'text' },
    });
    cd = await import(pathToFileURL(join(tmpDuels, 'duels.mjs')).href);
  } finally {
    rmSync(tmpDuels, { recursive: true, force: true });
  }
  const [lignesDuels, libresCouv, jeuxCouv] = await Promise.all([
    lireTout('duels', 'type,scenario,a_cle,b_cle,a_ingredients,b_ingredients,dimension_differente,resultat,etiquettes,remarque,appareil,prediction,created_at', 'created_at.asc,a_cle.asc'),
    // Photos importées (comptes seulement : aucune adresse n'est écrite dans les fichiers)
    lireTout('photos_libres', 'url,sujet,statut', 'created_at.asc'),
    lireTout('jeux_photos', 'nom,specialite,photos,site_id', 'nom.asc'),
  ]);
  const libelleSujetCouv = (id) => cd.SUJETS_VISUELS.find((s) => s.id === id)?.libelle ?? id;
  const titresCouv = cd.titresAssets();
  const duels = (lignesDuels ?? []).map((l) => { const d = cd.duelDepuisLigne(l); return d ? { ...d, remarque: texte(l.remarque) } : null; }).filter(Boolean);
  if (lignesDuels !== null) ecrire('duels.json', duels.map((d) => cd.duelPourExport(d)));
  const photosCouv = [
    ...(jeuxCouv ?? []).filter((j) => !j.site_id).flatMap((j) => { const x = cd.jeuPhotosDepuisLigne({ ...j, id: '', source: 'banque', actif: true }); return x.photos ? cd.photosDuJeu(x.photos).filter((u) => !u.startsWith('/photos/')).map((url) => ({ url, jeu: j.nom, specialite: j.specialite })) : []; }),
    ...(libresCouv ?? []).filter((l) => l.url && l.statut !== 'retiree').map((l) => ({ url: l.url, jeu: 'Banque libre', sujet: l.sujet, specialite: 'generale' })),
  ];
  const couverture = cd.couvertureParSujet(cd.inventaireAssets({ photosJeux: photosCouv }).map((a) => ({ cle: a.cle, type: a.type, soins: a.soins, statut: courants.find((s) => s.cle === a.cle)?.statut ?? null })), surchargesSujets);
  const synthese = readFileSync(join(sortie, 'SYNTHESE.md'), 'utf8').replace(/\n+$/, '');
  ecrire('SYNTHESE.md', `${synthese}\n\n${cd.markdownDuels(duels, { libelleSujet: libelleSujetCouv, titres: titresCouv, nomsSections: cd.NOMS_SECTIONS_VARIABLES })}\n\n${cd.markdownCouverture(couverture)}\n`);
  const cheminManques = join(sortie, 'MANQUES.md');
  if (existsSync(cheminManques)) {
    const ancien = readFileSync(cheminManques, 'utf8');
    const debut = '<!-- couverture-auto -->', fin = '<!-- /couverture-auto -->';
    const bloc = `${debut}\n${cd.markdownCouverture(couverture, { titre: '## Couverture par sujet (export automatique)' })}\n${fin}`;
    const i = ancien.indexOf(debut), j = ancien.indexOf(fin);
    writeFileSync(cheminManques, i >= 0 && j > i ? `${ancien.slice(0, i)}${bloc}${ancien.slice(j + fin.length)}` : `${ancien.replace(/\n+$/, '')}\n\n${bloc}\n`);
  }
}

console.log(`Retours exportés dans ${sortie} : ${notesAssets.length} notes d’assets, ${notesAtelier.length} notes de l’atelier, ${journal.length} revues, ${courants.length} statuts, ${listeInspirations.length} inspirations.`);
