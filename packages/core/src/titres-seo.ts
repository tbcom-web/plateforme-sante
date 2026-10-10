// Titres et méta descriptions des pages des sites (tickets du testeur du 2026-10-11 : « Title de 99 caractères (> 65) »,
// « Méta description de 195 caractères ») : Google coupe un title vers 60-65 caractères et une description vers 160-170.
// Les pages composent librement leur titre (« Soin – Noms, métier à Ville ») ; la mise en page commune le RACCOURCIT ici,
// sans jamais couper un mot : on garde la première partie (le sujet de la page) et les parties suivantes tant qu'elles tiennent,
// en préférant la plus courte quand la partie suivante est trop longue.

export const TITRE_MAX = 65;
export const DESCRIPTION_MAX = 165;

const SEPARATEURS = /\s+[–—|·]\s+|\s*\|\s*/;

/** Coupe au dernier espace avant `max` (jamais au milieu d'un mot), ponctuation finale retirée, « … » si coupé */
function couperAuMot(t: string, max: number): string {
  if (t.length <= max) return t;
  const bout = t.slice(0, max - 1);
  const i = bout.lastIndexOf(' ');
  return `${(i > max * 0.5 ? bout.slice(0, i) : bout).replace(/[\s,;:–—|·.-]+$/, '')}…`;
}

/** Title d'au plus `max` caractères : première partie, puis les suivantes qui tiennent ; sinon la première coupée au mot */
export function titreSeo(titre: string, max = TITRE_MAX): string {
  const t = titre.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const parties = t.split(SEPARATEURS).map((p) => p.trim()).filter(Boolean);
  const [tete, ...reste] = parties;
  if (!tete) return couperAuMot(t, max);
  if (tete.length > max) return couperAuMot(tete, max);
  // Partie suivante entière si elle tient ; sinon sa forme courte (« Noms, podologue à Lyon » → « Noms »)
  let r = tete;
  for (const p of reste) {
    const essai = `${r} – ${p}`;
    if (essai.length <= max) { r = essai; continue; }
    const court = p.split(/,\s*/)[0];
    if (court !== p && `${r} – ${court}`.length <= max) r = `${r} – ${court}`;
    break;
  }
  return r;
}

/** Méta description d'au plus `max` caractères : phrases entières tant qu'elles tiennent, sinon coupée au mot */
export function descriptionSeo(description: string, max = DESCRIPTION_MAX): string {
  const t = description.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const phrases = t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [];
  let r = '';
  for (const p of phrases) {
    if ((r + p).trim().length > max) break;
    r += p;
  }
  r = r.trim();
  return r.length >= 70 ? r : couperAuMot(t, max);
}
