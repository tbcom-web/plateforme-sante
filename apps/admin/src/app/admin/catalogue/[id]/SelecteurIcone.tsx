'use client';

// Choix de l'icône d'un soin : recherche dans l'API publique Iconify, limitée aux jeux intégrés aux sites.
// Les sites publics, eux, rendent l'icône au build depuis les fichiers locaux (aucun appel externe).
import { useEffect, useState } from 'react';
import { JEUX_ICONES, PREFIXES_ICONES, iconeSoin, urlIconeApi } from '@plateforme/core';

type Props = { slug: string; valeur: string; onChange: (nom: string) => void };

// L'index Iconify est en anglais : traduction des termes courants.
const FR_EN: Record<string, string> = {
  pied: 'foot', pieds: 'foot', chaussure: 'shoe', semelle: 'footprints', marche: 'walking', course: 'running',
  enfant: 'child', bebe: 'baby', bébé: 'baby', sport: 'running', diabete: 'diabetes', diabète: 'diabetes',
  coeur: 'heart', cœur: 'heart', dent: 'tooth', dents: 'tooth', os: 'bone', dos: 'back', main: 'hand',
  oeil: 'eye', œil: 'eye', yeux: 'eye', peau: 'skin', cerveau: 'brain', poumon: 'lungs', femme: 'woman',
  grossesse: 'pregnant', massage: 'massage', soin: 'care', medecin: 'doctor', médecin: 'doctor',
  infirmier: 'nurse', infirmiere: 'nurse', infirmière: 'nurse', fauteuil: 'wheelchair', ordonnance: 'prescription',
  vaccin: 'vaccine', sang: 'blood', oreille: 'ear', nutrition: 'nutrition', sommeil: 'sleep', stress: 'mental-health',
};

const champ = 'w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20';

export default function SelecteurIcone({ slug, valeur, onChange }: Props) {
  const [requete, setRequete] = useState('');
  const [resultats, setResultats] = useState<string[]>([]);
  const [etat, setEtat] = useState<'repos' | 'charge' | 'erreur'>('repos');
  const [prefixe, setPrefixe] = useState<string>('');
  const actuelle = iconeSoin(slug, valeur);

  useEffect(() => {
    const q = requete.trim().toLowerCase();
    if (q.length < 2) return setResultats([]);
    const terme = FR_EN[q] ?? q;
    const ctrl = new AbortController();
    const minuteur = setTimeout(async () => {
      setEtat('charge');
      try {
        const prefixes = prefixe || PREFIXES_ICONES.join(',');
        const r = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(terme)}&prefixes=${prefixes}&limit=96`,
          { signal: ctrl.signal },
        );
        const j = (await r.json()) as { icons?: string[] };
        setResultats(j.icons ?? []);
        setEtat('repos');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setEtat('erreur');
      }
    }, 300);
    return () => {
      clearTimeout(minuteur);
      ctrl.abort();
    };
  }, [requete, prefixe]);

  return (
    <fieldset className="grid gap-3">
      <legend className="text-sm font-medium">Icône du soin (cartes sur les sites)</legend>
      <div className="flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-xl bg-teal-50 text-teal-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlIconeApi(actuelle)} alt="" width={32} height={32} />
        </span>
        <div className="text-sm">
          <p className="font-mono text-xs text-neutral-600">{actuelle}</p>
          <p className="text-xs text-neutral-500">{valeur ? 'Icône choisie' : 'Icône par défaut de ce soin'}</p>
          {valeur && (
            <button type="button" className="text-xs text-red-700" onClick={() => onChange('')}>
              Revenir à l’icône par défaut
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className={`${champ} flex-1`}
          placeholder="Rechercher : pied, enfant, running, heart…"
          value={requete}
          onChange={(e) => setRequete(e.target.value)}
        />
        <select className="rounded-lg border border-neutral-300 px-2 text-sm" value={prefixe} onChange={(e) => setPrefixe(e.target.value)}>
          <option value="">Tous les jeux</option>
          {JEUX_ICONES.map((j) => (
            <option key={j.prefixe} value={j.prefixe}>{j.nom} · {j.usage}</option>
          ))}
        </select>
      </div>
      {etat === 'charge' && <p className="text-xs text-neutral-500">Recherche…</p>}
      {etat === 'erreur' && <p className="text-xs text-red-700">Recherche impossible (connexion à Iconify).</p>}
      {etat === 'repos' && requete.trim().length >= 2 && resultats.length === 0 && (
        <p className="text-xs text-neutral-500">Aucun résultat. L’index est en anglais : essayez foot, child, heart…</p>
      )}
      {resultats.length > 0 && (
        <ul className="grid max-h-64 grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-1.5 overflow-y-auto rounded-xl bg-neutral-50 p-2">
          {resultats.map((nom) => (
            <li key={nom}>
              <button
                type="button"
                title={nom}
                aria-label={nom}
                aria-pressed={nom === valeur}
                onClick={() => onChange(nom)}
                className={`grid size-12 place-items-center rounded-lg border bg-white hover:border-teal-700 ${nom === valeur ? 'border-teal-700 ring-2 ring-teal-700/20' : 'border-transparent'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlIconeApi(nom)} alt="" width={28} height={28} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-neutral-500">
        Jeux intégrés, tous sous licence libre (MIT/ISC, sans attribution) :{' '}
        {JEUX_ICONES.map((j, i) => (
          <span key={j.prefixe}>{i > 0 && ', '}<a className="underline" href={j.url} target="_blank" rel="noopener">{j.nom}</a></span>
        ))}
        .
      </p>
    </fieldset>
  );
}
