import { assainirMarque, marquesLogo, svgMarqueImportee } from '@plateforme/core';
import { createClient } from '@/lib/supabase/server';
import { ActionsMarque, ImportMarque } from './ImportMarque';
import Propagation from '@/components/Propagation';

export const metadata = { title: 'Super admin · Logos' };

type Ligne = { id: string; nom: string; sens: string; view_box: string; contenu: string; actif: boolean };

// Aperçus : couleur du cabinet de démonstration, au trait et sur tuile pleine.
const APERCUS = [
  { trait: '#1f6b64', second: '#8bbfb8' },
  { trait: '#ffffff', second: '#cfe7e3', fond: '#1f6b64', rayon: 12 },
];

export default async function Logos() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('marques_logo').select('id, nom, sens, view_box, contenu, actif').order('nom');
  const lignes = (data ?? []) as Ligne[];

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-bold">Logos</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Les marques proposées aux praticiens. Les marques intégrées sont dessinées par la charte ; vous pouvez en importer d’autres.
          Toute marque prend automatiquement les couleurs de la gamme et le style du modèle de chaque site.
        </p>
      </div>
      {error && <p className="text-sm text-red-700">Lecture impossible : la base de données n’est pas à jour (mise à jour 0013, logos, à installer).</p>}

      <section>
        <h2 className="mb-3 font-semibold">Marques intégrées</h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {marquesLogo('podologie').map((m) => (
            <li key={m.id} className="rounded-xl border border-black/5 bg-white p-4 text-sm">
              <span className="block font-semibold">{m.nom}</span>
              <span className="block text-neutral-600">{m.sens}</span>
              <code className="mt-1 block text-xs text-neutral-400">{m.id}</code>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-neutral-500">Planche complète : /modeles/logos sur le site de démonstration.</p>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Marques importées</h2>
        <ul className="grid gap-2">
          {lignes.length === 0 && !error && <li className="text-sm text-neutral-500">Aucune marque importée.</li>}
          {lignes.map((l) => {
            const marque = assainirMarque({ id: l.id, nom: l.nom, sens: l.sens, viewBox: l.view_box, contenu: l.contenu });
            return (
              <li key={l.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-black/5 bg-white p-4">
                {marque && APERCUS.map((c, k) => (
                  // Contenu nettoyé à l'import (formes et attributs géométriques uniquement)
                  <span key={k} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgMarqueImportee(marque, c, 48) }} />
                ))}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{l.nom}</span>
                  <span className="block text-sm text-neutral-600">{l.sens}</span>
                  <code className="text-xs text-neutral-400">{l.id}</code>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${l.actif ? 'bg-teal-100 text-teal-900' : 'bg-neutral-100 text-neutral-700'}`}>{l.actif ? 'Active' : 'Inactive'}</span>
                <ActionsMarque id={l.id} actif={l.actif} />
                {l.actif && <div className="w-full"><Propagation cible={{ marque: l.id }} libelle="cette marque" /></div>}
              </li>
            );
          })}
        </ul>
      </section>

      <ImportMarque />
    </div>
  );
}
