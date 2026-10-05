// Aperçu local d'un univers du catalogue : construit la démo (identité fictive de Lyon) avec le préréglage complet
// de l'univers, puis la sert en local sur un port libre. Rien n'est publié.
// Usage : npm run univers:apercu -- <id>      (sans id : liste des univers)
//         npm run univers:apercu -- <id> --port 4400
import { catalogue, construire, servir } from './univers-commun.mjs';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const iPort = args.indexOf('--port');
const port = iPort >= 0 ? Number(args[iPort + 1]) : 0;
const { CATALOGUE_UNIVERS, LIBELLES_STATUTS_UNIVERS } = await catalogue();

const univers = CATALOGUE_UNIVERS.find((u) => u.id === id);
if (!univers) {
  console.log(id ? `Univers inconnu : ${id}\n` : 'Indiquer un univers :\n');
  for (const u of CATALOGUE_UNIVERS) console.log(`  ${u.id.padEnd(22)} ${u.nom} — ${LIBELLES_STATUTS_UNIVERS[u.statut]}`);
  console.log('\nExemple : npm run univers:apercu -- pied-diabetique');
  process.exit(id ? 1 : 0);
}

console.log(`→ Construction de la démo avec l'univers « ${univers.nom} » (${LIBELLES_STATUTS_UNIVERS[univers.statut]})…`);
const dossier = construire(univers.id, { silencieux: true });
const { url } = await servir(dossier, port);
const p = univers.preReglage;
console.log(`\n✓ Aperçu local : ${url}`);
console.log(`  Pour qui : ${univers.pourQui}`);
console.log(`  Modèle ${p.modele} · gamme ${p.gamme} · spécialité ${p.specialite}${p.specialiteSecondaire ? ` + ${p.specialiteSecondaire}` : ''} · registre ${p.registre} · ${p.modeVisuel} · animation ${p.animation ? 'oui' : 'non'} · logo ${p.logo.marque}`);
console.log(`  Soins en avant : ${p.soinsEnAvant.join(', ')} (la démo n'a que 6 soins : les autres n'apparaissent pas)`);
console.log('\nCtrl+C pour arrêter.');
