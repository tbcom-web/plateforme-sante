// Marques de logo importées par l'admin (fichier SVG), en plus des marques dessinées par le code (logos.ts).
//
// Le SVG est NETTOYÉ, jamais inséré tel quel : seules des formes simples et des attributs géométriques
// sont conservés (aucun script, style, lien, image, texte, attribut d'événement). Les couleurs d'origine
// sont remplacées par des rôles de la charte, pour qu'une marque importée suive la gamme et le modèle
// comme les marques intégrées :
//   - fill/stroke « none »             → none
//   - couleur la plus foncée du fichier → « trait » (couleur principale de la marque)
//   - autres couleurs                   → « second » (version adoucie de la couleur principale)

const ELEMENTS = new Set(['g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
const NOMBRE = /^-?\d*\.?\d+(e-?\d+)?$/i;
const ATTRIBUTS: Record<string, RegExp> = {
  d: /^[MmLlHhVvCcSsQqTtAaZz0-9\s.,eE+-]{1,20000}$/,
  points: /^[0-9\s.,eE+-]{1,5000}$/,
  transform: /^((translate|scale|rotate|matrix)\([0-9\s.,eE+-]{1,120}\)\s*){1,6}$/,
  cx: NOMBRE, cy: NOMBRE, r: NOMBRE, rx: NOMBRE, ry: NOMBRE, x: NOMBRE, y: NOMBRE, width: NOMBRE, height: NOMBRE,
  x1: NOMBRE, y1: NOMBRE, x2: NOMBRE, y2: NOMBRE,
  'stroke-width': NOMBRE, opacity: NOMBRE, 'fill-opacity': NOMBRE, 'stroke-opacity': NOMBRE,
  'stroke-linecap': /^(butt|round|square)$/, 'stroke-linejoin': /^(miter|round|bevel)$/,
  'stroke-dasharray': /^[0-9\s.,]{1,60}$/, 'fill-rule': /^(nonzero|evenodd)$/,
};

export type MarqueImportee = { id: string; nom: string; sens: string; viewBox: string; contenu: string };
export type ResultatImportMarque = { erreurs: string[]; marque?: MarqueImportee };

const luminance = (hex: string) => {
  const h = hex.length === 4 ? hex.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3') : hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Nettoie un SVG importé et le convertit en marque utilisable par le moteur de logos. */
export function importerMarqueSvg(source: string, meta: { id: string; nom: string; sens?: string }): ResultatImportMarque {
  const erreurs: string[] = [];
  if (!/^[a-z0-9-]{3,40}$/.test(meta.id)) erreurs.push('Identifiant : 3 à 40 caractères (minuscules, chiffres, tirets).');
  if (!meta.nom?.trim() || meta.nom.length > 40) erreurs.push('Nom : obligatoire, 40 caractères maximum.');
  if (source.length > 200_000) erreurs.push('Fichier trop lourd (200 Ko maximum) : simplifiez le dessin.');
  const racine = source.match(/<svg\b[^>]*>/i);
  const viewBox = racine?.[0].match(/viewBox\s*=\s*"([^"]+)"/i)?.[1]?.trim() ?? '';
  if (!racine) erreurs.push('Le fichier n’est pas un SVG.');
  else if (!/^-?[\d.]+(\s+-?[\d.]+){3}$/.test(viewBox)) erreurs.push('Le SVG doit avoir un attribut viewBox (ex. « 0 0 48 48 »).');
  if (erreurs.length) return { erreurs };

  // Couleurs du fichier : la plus foncée devient le trait principal, les autres la couleur secondaire.
  const couleurs = [...new Set([...source.matchAll(/(?:fill|stroke)\s*[:=]\s*"?\s*(#[0-9a-f]{3}(?:[0-9a-f]{3})?)\b/gi)].map((m) => m[1].toLowerCase()))];
  const principale = couleurs.sort((a, b) => luminance(a) - luminance(b))[0];
  const role = (valeur: string) => {
    const v = valeur.trim().toLowerCase();
    if (v === 'none' || v === 'transparent') return 'none';
    if (v === 'var(--marque-trait)' || v === 'var(--marque-second)') return v; // déjà converti (relecture depuis la base)
    if (v === 'currentcolor' || !principale || v === principale) return 'var(--marque-trait)';
    return 'var(--marque-second)';
  };

  // Reconstruction : on ne recopie que les balises et attributs autorisés.
  const corps = source.slice((racine!.index ?? 0) + racine![0].length, source.search(/<\/svg>/i) >= 0 ? source.search(/<\/svg>/i) : undefined)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(defs|style|script|title|desc|metadata|text|foreignObject|image|use|a|clipPath|mask|filter|linearGradient|radialGradient|pattern|symbol)\b[\s\S]*?<\/\1>/gi, '');
  let sortie = '';
  let profondeur = 0;
  let formes = 0;
  for (const m of corps.matchAll(/<(\/?)([a-zA-Z]+)\b([^>]*?)(\/?)>/g)) {
    const [, fermante, balise, attrs, autoFermante] = m;
    const nom = balise.toLowerCase();
    if (!ELEMENTS.has(nom)) continue;
    if (fermante) { if (nom === 'g' && profondeur > 0) { sortie += '</g>'; profondeur--; } continue; }
    const garde: string[] = [];
    for (const a of attrs.matchAll(/([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g)) {
      const [, cle, valeur] = a;
      const k = cle.toLowerCase();
      if (k === 'fill' || k === 'stroke') garde.push(`${k}="${role(valeur)}"`);
      else if (ATTRIBUTS[k]?.test(valeur.trim())) garde.push(`${k}="${valeur.trim()}"`);
    }
    // Couleurs déclarées en style="fill:…;stroke:…" (export courant des logiciels de dessin)
    const style = attrs.match(/style\s*=\s*"([^"]*)"/i)?.[1] ?? '';
    for (const [, k, v] of style.matchAll(/(fill|stroke)\s*:\s*([^;]+)/gi)) {
      if (!garde.some((g) => g.startsWith(`${k.toLowerCase()}=`))) garde.push(`${k.toLowerCase()}="${role(v)}"`);
    }
    if (nom === 'g') { if (autoFermante) continue; sortie += `<g ${garde.join(' ')}>`; profondeur++; continue; }
    // Forme sans géométrie valide (tracé refusé…) : ignorée.
    const geometrie = { path: 'd=', polyline: 'points=', polygon: 'points=' }[nom as 'path'];
    if (geometrie && !garde.some((g) => g.startsWith(geometrie))) continue;
    sortie += `<${nom} ${garde.join(' ')}/>`;
    formes++;
  }
  sortie += '</g>'.repeat(profondeur);
  if (formes === 0) return { erreurs: ['Aucune forme dessinée trouvée (tracés, cercles, lignes…).'] };
  if (formes > 600) return { erreurs: ['Dessin trop complexe (600 formes maximum) : il serait illisible en petit.'] };

  return { erreurs: [], marque: { id: meta.id, nom: meta.nom.trim(), sens: (meta.sens ?? '').trim().slice(0, 200), viewBox, contenu: sortie } };
}

/**
 * Rendu d'une marque importée : couleur principale (trait) et secondaire, avec le fond de tuile éventuel.
 * Les couleurs sont des valeurs CSS (#hex ou var(--…)).
 */
/** Relit une marque stockée en base en la renettoyant (défense en profondeur avant tout affichage). */
export function assainirMarque(m: MarqueImportee): MarqueImportee | null {
  return importerMarqueSvg(`<svg viewBox="${m.viewBox.replace(/[^\d\s.-]/g, '')}">${m.contenu}</svg>`, m).marque ?? null;
}

export function svgMarqueImportee(m: MarqueImportee, couleurs: { trait: string; second: string; fond?: string; rayon?: number }, taille = 48, titre?: string): string {
  const [x, y, l, h] = m.viewBox.split(/\s+/).map(Number);
  const marge = +(Math.max(l, h) * 0.14).toFixed(2);
  const arrondi = (v: number) => +v.toFixed(2);
  const [tx, ty, tl, th] = [x - marge, y - marge, l + 2 * marge, h + 2 * marge].map(arrondi);
  const tuile = couleurs.fond ? `<rect x="${tx}" y="${ty}" width="${tl}" height="${th}" rx="${arrondi(((couleurs.rayon ?? 0) / 48) * tl)}" fill="${couleurs.fond}"/>` : '';
  const vb = couleurs.fond ? `${tx} ${ty} ${tl} ${th}` : m.viewBox;
  const etiquette = titre ? ` role="img" aria-label="${titre.replace(/[<>&"]/g, '')}"` : ' aria-hidden="true"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${taille}" height="${taille}"${etiquette} style="--marque-trait:${couleurs.trait};--marque-second:${couleurs.second}">${tuile}${m.contenu}</svg>`;
}
