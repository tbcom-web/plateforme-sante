'use client';

import { definirContexteImages, type KitCompact } from '@plateforme/core';

// Registre du contexte d'images dans le navigateur : posé pendant le rendu (avant les pages, rendues après ce composant), rien n'est affiché.
export default function ContexteImagesClient({ exclues, kits }: { exclues: string[]; kits: Record<string, KitCompact> }) {
  definirContexteImages({ exclues, kits });
  return null;
}
