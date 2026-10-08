'use client';

import { definirContexteImages, type KitCompact } from '@plateforme/core';

// Registre du contexte d'images dans le navigateur : posé pendant le rendu (avant les pages, rendues après ce composant), rien n'est affiché.
export default function ContexteImagesClient({ exclues, kits, vivier }: { exclues: string[]; kits: Record<string, KitCompact>; vivier?: Record<string, string[]> }) {
  definirContexteImages({ exclues, kits, vivier: vivier ?? null });
  return null;
}
