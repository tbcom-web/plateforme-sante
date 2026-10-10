// AUDIT DE SITE — production complète d'un audit (commun à la commande auditer.mjs et au workflow auditer-site) :
// collecte du site du prospect et, s'il y en a un, du site proposé ; notation ; rapport HTML ; PDF A4.
import { chromium } from 'playwright';
import { collecter } from './collecter.mjs';
import { noter } from './noter.mjs';
import { rendreRapport } from './rapport.mjs';

const sansCaptures = (x) => ({ ...x, mobile: { ...x.mobile, capture: undefined, defilement: undefined, requetes: x.mobile.requetes.length }, bureau: { ...x.bureau, capture: undefined, requetes: x.bureau.requetes.length } });

/**
 * @param o.cible domaine ou adresse du site audité
 * @param o.proposition adresse du site proposé (facultatif) ; o.propositionPubliee : déjà public (sinon préparé, noindex attendu)
 * @param o.libelle, o.praticien, o.commercial { nom, tel, email }, o.lienSite (adresse du site proposé à montrer au praticien)
 */
export async function produireAudit(o) {
  const journal = o.journal ?? console.log;
  const opts = { journal, sansPagespeed: Boolean(o.sansPagespeed) };
  // L'un après l'autre : mesurés en parallèle, les deux sites se disputeraient le processeur (vitesse faussée)
  const d = await collecter(o.cible, opts);
  const dp = o.proposition ? await collecter(o.proposition, { ...opts, journal: (m) => journal(`(proposition) ${m}`) }) : null;
  const note = noter(d);
  const proposition = dp ? { d: dp, note: noter(dp, { preparation: !o.propositionPubliee }), libelle: o.libelle || 'Le site que nous vous proposons' } : null;
  const html = rendreRapport(d, note, { proposition, praticien: o.praticien, commercial: o.commercial, lienSite: o.lienSite });

  journal('PDF…');
  const nav = await chromium.launch();
  let pdf;
  try {
    const page = await nav.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  } finally { await nav.close(); }

  const mesures = { site: sansCaptures(d), note, proposition: dp ? { site: sansCaptures(dp), note: proposition.note } : null };
  return { d, note, proposition, html, pdf, mesures };
}
