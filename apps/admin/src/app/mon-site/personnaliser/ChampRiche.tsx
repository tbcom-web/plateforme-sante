'use client';

// Champ de texte enrichi de l'éditeur de blocs (« Personnaliser mon site ») : boutons « Gras » et « Italique » (et Ctrl+B / Ctrl+I)
// au lieu de la syntaxe ** visible. Le texte reste stocké en Markdown restreint (**gras**, *italique*), que les sites rendent déjà
// (marked) : seul l'affichage de la saisie change. Rien d'autre n'est gardé (ni lien, ni couleur, ni taille : collage en texte brut).
import { useEffect, useRef, useState } from 'react';

const echapper = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Markdown restreint → HTML de la saisie */
export function versHtml(md: string): string {
  return echapper(md)
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\n/g, '<br>');
}

/** HTML de la saisie → Markdown restreint (gras, italique, retours à la ligne) */
export function versMarkdown(racine: Node): string {
  const parcourir = (n: Node): string => {
    if (n.nodeType === 3) return (n.textContent ?? '').replace(/ /g, ' ');
    if (n.nodeType !== 1) return '';
    const e = n as HTMLElement;
    const tag = e.tagName.toLowerCase();
    const dedans = [...e.childNodes].map(parcourir).join('');
    if (tag === 'br') return '\n';
    const gras = tag === 'strong' || tag === 'b' || /^(bold|[6-9]00)$/.test(e.style?.fontWeight ?? '');
    const ital = tag === 'em' || tag === 'i' || e.style?.fontStyle === 'italic';
    let t = dedans;
    if (t.trim() && (gras || ital)) {
      // Espaces hors des marques (« * fin* » ne serait pas de l'italique en Markdown)
      const [, avant, coeur, apres] = /^(\s*)([\s\S]*?)(\s*)$/.exec(t)!;
      t = `${avant}${gras ? '**' : ''}${ital ? '*' : ''}${coeur}${ital ? '*' : ''}${gras ? '**' : ''}${apres}`;
    }
    // Lignes créées par Entrée (Chrome : <div>, Firefox : <br>)
    if ((tag === 'div' || tag === 'p') && e !== racine) return `\n${t}`;
    return t;
  };
  return [...racine.childNodes].map(parcourir).join('').replace(/^\n/, '').replace(/\*\*\*\*/g, '').replace(/\n{3,}/g, '\n\n');
}

export default function ChampRiche({ valeur, max, label, onChange }: { valeur: string; max: number; label: string; onChange: (v: string) => void }) {
  const zone = useRef<HTMLDivElement>(null);
  const dernier = useRef<string | null>(null);
  const [etat, setEtat] = useState({ gras: false, italique: false });
  // Valeur reçue différente de la dernière saisie (chargement, « Revenir au modèle », reformulation) : contenu réécrit
  useEffect(() => {
    if (zone.current && valeur !== dernier.current) { zone.current.innerHTML = versHtml(valeur); dernier.current = valeur; }
  }, [valeur]);
  const lire = () => {
    if (!zone.current) return;
    const md = versMarkdown(zone.current).slice(0, max);
    dernier.current = md;
    onChange(md);
  };
  const suivre = () => { try { setEtat({ gras: document.queryCommandState('bold'), italique: document.queryCommandState('italic') }); } catch { /* navigateur sans état */ } };
  const appliquer = (cmd: 'bold' | 'italic') => { zone.current?.focus(); document.execCommand(cmd); lire(); suivre(); };
  const outil = (actif: boolean) => `inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 text-sm ${actif ? 'border-teal-700 bg-teal-50 text-teal-900' : 'border-black/15 bg-white text-neutral-800 hover:bg-neutral-50'}`;
  return (
    <div className="grid gap-1 text-sm">
      <div className="flex gap-1" role="toolbar" aria-label={`Mise en forme : ${label}`}>
        <button type="button" className={`${outil(etat.gras)} font-bold`} aria-pressed={etat.gras} onMouseDown={(e) => e.preventDefault()} onClick={() => appliquer('bold')} title="Gras (Ctrl+B)">Gras</button>
        <button type="button" className={`${outil(etat.italique)} italic`} aria-pressed={etat.italique} onMouseDown={(e) => e.preventDefault()} onClick={() => appliquer('italic')} title="Italique (Ctrl+I)">Italique</button>
      </div>
      <div
        ref={zone}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        contentEditable
        suppressContentEditableWarning
        onInput={lire}
        onKeyUp={suivre}
        onMouseUp={suivre}
        onFocus={suivre}
        onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }}
        className="min-h-[5.5rem] w-full whitespace-pre-wrap break-words rounded-lg border border-black/15 bg-white px-3 py-2 text-[16px] leading-snug outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 [&_em]:italic [&_strong]:font-bold"
      />
      <span className={`justify-self-end text-[11px] ${valeur.length > max * 0.9 ? 'text-amber-800' : 'text-neutral-500'}`}>{valeur.length} / {max}</span>
    </div>
  );
}
