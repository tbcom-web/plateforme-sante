// Fichiers SVG externes des dessins (/dessins/<nom>.svg, référencés par <use href="…#d">) : assemblage du document avec ses styles
// EN LIGNE. WebKit (Safari et tous les navigateurs de l'iPhone) ignore la feuille <style> d'un document SVG externe référencé par
// <use> : sans styles en attributs, les étiquettes s'affichent géantes, les pointillés, épaisseurs et couleurs d'accent sont perdus.
// Les variables CSS (--dessin-*, --pression-*, accent de la gamme) héritées de la page traversent <use> dans les deux moteurs ; les
// sélecteurs de la page, eux, ne les traversent dans aucun moteur (d'où les réglages de surface par variables, dessins.css).
// Contrôle : npm run controle:charte (aucun <style> dans dist/dessins/*.svg) et npm run controle:webkit (rendu iPhone).

/**
 * Feuille réduite aux règles utiles au fichier : sans commentaires, sans animations ni règles d'apparition (.pret, réservées au dessin
 * posé dans la page) et sans les règles dont aucune classe n'apparaît dans le tracé.
 */
export function styleUtile(feuille: string, contenu: string): string {
  const classes = new Set([...contenu.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)));
  return feuille
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@(?:keyframes|media)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')
    .split('}')
    .map((r) => r.trim())
    .filter((r) => {
      const selecteur = r.split('{')[0];
      if (!r.includes('{') || selecteur.includes('.pret') || selecteur.includes(':')) return false;
      const utiles = [...selecteur.matchAll(/\.([\w-]+)/g)].map((m) => m[1]).filter((c) => c !== 'dessin');
      return utiles.length === 0 || utiles.some((c) => classes.has(c));
    })
    .map((r) => `${r.replace(/\s+/g, ' ').replace(/\s*([{};:,>])\s*/g, '$1')}}`)
    .join('');
}

/**
 * Reporte chaque règle de `feuille` en attribut style="" sur les éléments de `contenu` qu'elle cible. Sélecteurs gérés (ceux de
 * dessins.css) : « .a », « .a .b », « .a.b .c », « .a .b tag », groupés par virgules ; l'ordre des règles est conservé (la dernière
 * l'emporte, comme dans la feuille). Les ancêtres sont ceux du fichier : un sélecteur qui vise la page (.surface-plan …) ne s'applique pas.
 */
export function styleEnLigne(feuille: string, contenu: string): string {
  const regles = feuille.split('}').filter((r) => r.includes('{')).map((r) => {
    const [sel, decl] = r.split('{');
    return { sels: sel.split(',').map((x) => x.trim().split(/\s+/)), decl: decl.trim().replace(/;$/, '') };
  });
  const correspond = (comp: string, tag: string, classes: string[]) =>
    comp.split('.').filter(Boolean).every((c, i) => (i === 0 && !comp.startsWith('.') ? c === tag : classes.includes(c)));
  const pile: string[][] = [];
  return contenu.replace(/<(\/?)([\w:-]+)([^>]*?)(\/?)>/g, (tout, ferme: string, tag: string, attrs: string, auto: string) => {
    if (ferme) { pile.pop(); return tout; }
    const classes = (attrs.match(/\sclass="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean);
    const ancetres = pile.flat();
    const decls: string[] = [];
    for (const r of regles) for (const sel of r.sels) {
      if (!correspond(sel[sel.length - 1], tag, classes)) continue;
      if (sel.slice(0, -1).every((a) => a.split('.').filter(Boolean).every((c) => ancetres.includes(c)))) decls.push(r.decl);
    }
    if (!auto) pile.push(classes);
    if (!decls.length) return tout;
    const existant = attrs.match(/\sstyle="([^"]*)"/);
    const style = (existant ? `${existant[1]};` : '') + decls.join(';');
    return `<${tag}${existant ? attrs.replace(existant[0], ` style="${style}"`) : `${attrs} style="${style}"`}${auto}>`;
  });
}

/** Document SVG complet d'un fichier de dessin : symbole « d » et styles en ligne (aucune feuille <style>) */
export const fichierSvg = (contenu: string, feuille: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg">${styleEnLigne(styleUtile(feuille, contenu), contenu)}</svg>`;
