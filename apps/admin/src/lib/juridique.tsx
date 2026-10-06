import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ReactNode } from 'react';

// Textes juridiques de l'essai (docs/juridique/*.md, BROUILLONS à faire relire par un juriste), lus au build et rendus
// en HTML statique par un petit lecteur Markdown (titres, paragraphes, listes, citations, tableaux, gras, liens).

export const DOCUMENTS = {
  cgu: { fichier: 'cgu-essai.md', titre: 'Conditions de l’essai gratuit' },
  confidentialite: { fichier: 'confidentialite.md', titre: 'Politique de confidentialité' },
} as const;

export async function lireDocument(id: keyof typeof DOCUMENTS): Promise<string | null> {
  // Build lancé depuis apps/admin (Vercel, npm run build) ou depuis la racine du dépôt.
  for (const racine of [join(process.cwd(), '..', '..'), process.cwd()]) {
    try {
      return await readFile(join(racine, 'docs', 'juridique', DOCUMENTS[id].fichier), 'utf8');
    } catch {
      // essai suivant
    }
  }
  return null;
}

/** Gras et liens internes ou https dans une ligne. */
function enLigne(texte: string, cle: string): ReactNode[] {
  const morceaux: ReactNode[] = [];
  const motif = /\*\*(.+?)\*\*|\[([^\]]+)\]\(((?:\/|https:\/\/)[^)\s]*)\)/g;
  let dernier = 0;
  let i = 0;
  for (const m of texte.matchAll(motif)) {
    if (m.index! > dernier) morceaux.push(texte.slice(dernier, m.index));
    if (m[1]) morceaux.push(<strong key={`${cle}-${i++}`}>{m[1]}</strong>);
    else morceaux.push(<a key={`${cle}-${i++}`} href={m[3]} className="font-semibold text-teal-800 underline underline-offset-2">{m[2]}</a>);
    dernier = m.index! + m[0].length;
  }
  if (dernier < texte.length) morceaux.push(texte.slice(dernier));
  return morceaux;
}

export function rendreMarkdown(md: string): ReactNode[] {
  const blocs = md.replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocs.map((b, n) => {
    const lignes = b.split('\n').filter((l) => l.trim());
    const k = `b${n}`;
    if (!lignes.length) return null;
    const premiere = lignes[0];
    if (premiere.startsWith('# ')) return <h1 key={k} className="text-2xl font-bold sm:text-3xl">{premiere.slice(2)}</h1>;
    if (premiere.startsWith('## ')) return <h2 key={k} className="mt-4 text-xl font-semibold">{premiere.slice(3)}</h2>;
    if (premiere.startsWith('> ')) {
      return <p key={k} className="rounded-xl bg-amber-50 px-4 py-3 text-amber-950">{enLigne(lignes.map((l) => l.replace(/^>\s?/, '')).join(' '), k)}</p>;
    }
    if (lignes.every((l) => l.startsWith('- '))) {
      return <ul key={k} className="grid list-disc gap-1 pl-6">{lignes.map((l, i) => <li key={i}>{enLigne(l.slice(2), `${k}-${i}`)}</li>)}</ul>;
    }
    if (lignes.every((l) => l.startsWith('|'))) {
      const cellules = (l: string) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const [entete, , ...corps] = lignes;
      return (
        <div key={k} className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead><tr>{cellules(entete).map((c, i) => <th key={i} className="border-b border-neutral-300 py-2 pr-3 font-semibold">{c}</th>)}</tr></thead>
            <tbody>{corps.map((l, j) => <tr key={j}>{cellules(l).map((c, i) => <td key={i} className="border-b border-neutral-100 py-2 pr-3 align-top">{enLigne(c, `${k}-${j}-${i}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    }
    return <p key={k}>{enLigne(lignes.join(' '), k)}</p>;
  });
}
