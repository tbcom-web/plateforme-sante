// Rendu SVG des icônes à partir des jeux Iconify installés localement.
// À n'importer que côté serveur ou au build (chaque jeu pèse plusieurs Mo).
import { getIconData, iconToSVG, iconToHTML, replaceIDs } from '@iconify/utils';
import type { IconifyJSON } from '@iconify/types';
import healthicons from '@iconify-json/healthicons/icons.json' with { type: 'json' };
import lucide from '@iconify-json/lucide/icons.json' with { type: 'json' };
import ph from '@iconify-json/ph/icons.json' with { type: 'json' };
import tabler from '@iconify-json/tabler/icons.json' with { type: 'json' };
import { FORMAT_ICONE } from './icones-meta';

const jeux: Record<string, IconifyJSON> = {
  healthicons: healthicons as IconifyJSON,
  lucide: lucide as IconifyJSON,
  ph: ph as IconifyJSON,
  tabler: tabler as IconifyJSON,
};

function donnees(nom: string) {
  if (!FORMAT_ICONE.test(nom)) return null;
  const [prefixe, icone] = nom.split(':');
  const jeu = jeux[prefixe];
  return jeu ? getIconData(jeu, icone) : null;
}

export const iconeExiste = (nom: string) => donnees(nom) !== null;

/**
 * SVG en ligne de l'icône, coloré par currentColor, ou null si inconnue.
 * `taille` en px ou unité CSS (défaut 1em). `titre` rend l'icône porteuse de sens (role="img").
 */
export function svgIcone(nom: string, opts: { taille?: string | number; classe?: string; titre?: string } = {}): string | null {
  const d = donnees(nom);
  if (!d) return null;
  const taille = opts.taille ?? '1em';
  const rendu = iconToSVG(d, { height: taille, width: taille });
  const attributs: Record<string, string> = { ...rendu.attributes, focusable: 'false' };
  if (opts.classe) attributs.class = opts.classe;
  let corps = replaceIDs(rendu.body);
  if (opts.titre) {
    attributs.role = 'img';
    attributs['aria-label'] = opts.titre;
    corps = `<title>${opts.titre.replace(/[<&>"]/g, '')}</title>${corps}`;
  } else {
    attributs['aria-hidden'] = 'true';
  }
  return iconToHTML(corps, attributs);
}
