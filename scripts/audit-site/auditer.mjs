// AUDIT DE SITE — commande locale. Produit rapport.html (lien web) + rapport.pdf (A4) + mesures.json.
// Pour la commerciale : /admin/audits (workflow auditer-site, script workflow.mjs) ; cette commande sert aux essais.
//
// Usage (racine du dépôt) :
//   npm run auditer -- <domaine> [--proposition <domaine ou url du site préparé>] [--libelle "Votre futur site webpodologue"]
//                       [--proposition-publiee] (par défaut, le site proposé est un site préparé non publié : noindex attendu)
//                       [--praticien "Nom Prénom"] [--commercial "Nom"] [--tel "06 …"] [--email …] [--sortie <dossier>] [--sans-pagespeed]
// Sortie par défaut : audits/<domaine>-<date>/ (ignoré par git : captures de sites tiers).
// Clé PageSpeed facultative : variable PAGESPEED_KEY (sans clé, Google limite le nombre d'appels).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEPOT, sortieAutorisee } from '../../packages/core/scripts/chemins.mjs';
import { produireAudit } from './produire.mjs';

const args = { _: [] };
for (let i = 2, v = process.argv; i < v.length; i++) {
  if (!v[i].startsWith('--')) { args._.push(v[i]); continue; }
  const s = v[i + 1]; args[v[i].slice(2)] = s !== undefined && !s.startsWith('--') ? (i++, s) : true;
}
if (!args._[0]) { console.error('Usage : npm run auditer -- <domaine> [--proposition <domaine>] [--praticien "…"] [--commercial "…" --tel "…"]'); process.exit(1); }

const debut = Date.now();
const journal = (m) => console.log(`[${String(Math.round((Date.now() - debut) / 1000)).padStart(3)} s] ${m}`);

const r = await produireAudit({
  cible: args._[0], proposition: args.proposition, propositionPubliee: Boolean(args['proposition-publiee']),
  libelle: args.libelle, praticien: args.praticien, sansPagespeed: Boolean(args['sans-pagespeed']), journal,
  commercial: args.commercial || args.tel || args.email ? { nom: args.commercial, tel: args.tel, email: args.email } : null,
  lienSite: args.proposition ? (/^https?:/.test(args.proposition) ? args.proposition : `https://${args.proposition}`) : null,
});

const dossier = sortieAutorisee(args.sortie || join(DEPOT, 'audits', `${r.d.hote.replace(/^www\./, '')}-${r.d.date.slice(0, 10)}`));
mkdirSync(dossier, { recursive: true });
writeFileSync(join(dossier, 'rapport.html'), r.html);
writeFileSync(join(dossier, 'rapport.pdf'), r.pdf);
writeFileSync(join(dossier, 'mesures.json'), JSON.stringify(r.mesures, null, 2));

journal(`Note globale : ${r.note.globale}/100${r.proposition ? ` (site proposé : ${r.proposition.note.globale}/100)` : ''}`);
for (const t of r.note.themes) console.log(`   ${t.nom.padEnd(36)} ${String(t.note ?? '–').padStart(3)}${r.proposition ? `   →  ${r.proposition.note.themes.find((x) => x.id === t.id).note}` : ''}`);
console.log(`\nRapport : ${join(dossier, 'rapport.html')}\nPDF     : ${join(dossier, 'rapport.pdf')}`);
