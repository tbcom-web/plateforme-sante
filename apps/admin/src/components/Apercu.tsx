import { buildTheme, iconeSoin, urlIconeApi, PAYS, type SiteDraft } from '@plateforme/core';
import type { SoinCatalogue } from '@/lib/sites';

// Aperçu miniature du site (gabarit Proximité), calculé avec le même thème que le générateur.
const enListe = (mots: string[]) => (mots.length > 1 ? `${mots.slice(0, -1).join(', ')} et ${mots.at(-1)}` : mots[0] ?? '');
const pluriel = (t: string) => t.split(' ').map((m, i) => (i === 0 ? m.split('-').map((x) => `${x}s`).join('-') : m)).join(' ');

export default function Apercu({ draft, catalogue }: { draft: SiteDraft; catalogue: SoinCatalogue[] }) {
  const t = buildTheme(draft.theme.couleur);
  const lieu = draft.lieux[0];
  const ville = draft.cabinet.ville || lieu?.ville || 'votre ville';
  const titre = PAYS.find((p) => p.value === draft.pays)?.titre ?? 'Pédicure-podologue';
  const nomsListe = draft.praticiens.map((p) => [p.prenom, p.nom].filter(Boolean).join(' ')).filter(Boolean);
  const plusieurs = draft.praticiens.length > 1;
  const metier = (plusieurs ? pluriel(titre) : titre).toLowerCase();
  const noms = enListe(nomsListe) || 'Votre nom';
  const ou = lieu?.nom ? `à la ${lieu.nom}` : `à ${draft.cabinet.quartier || ville}`;
  const phrase =
    draft.voix === 'je'
      ? `Je vous accueille ${ou}.`
      : draft.voix === 'nous'
        ? `${noms}, ${metier}, vous accueillent ${ou}.`
        : `${noms}, ${metier}, accueille${plusieurs ? 'nt' : ''} ${plusieurs ? 'leurs' : 'ses'} patients ${ou}.`;
  const soins = catalogue.filter((s) => draft.soins.includes(s.slug));
  const rdv = draft.rdv.mode === 'telephone' ? 'Appeler pour un RDV' : 'Prendre rendez-vous';

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-black/5 bg-neutral-50 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-neutral-300" />
        <span className="size-2.5 rounded-full bg-neutral-300" />
        <span className="size-2.5 rounded-full bg-neutral-300" />
        <span className="ml-3 truncate text-xs text-neutral-500">Aperçu de votre site · modèle Proximité</span>
      </div>

      {draft.message.texte && (
        <p className="px-4 py-1.5 text-center text-[11px] font-semibold text-white" style={{ background: t['--brand-ink'] }}>
          {draft.message.texte}
        </p>
      )}

      <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
        <div className="leading-tight">
          <p className="text-sm font-semibold">{plusieurs ? 'Cabinet de podologie' : noms}</p>
          <p className="text-[11px] text-neutral-500">{plusieurs ? pluriel(titre) : titre} · {ville}</p>
        </div>
        <span className="text-xs font-semibold" style={{ color: t['--brand-ink'] }}>{draft.cabinet.telephone || '00 00 00 00 00'}</span>
      </div>

      <div className="px-5 py-6">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t['--brand-ink'] }}>
          {plusieurs ? pluriel(titre) : titre} · {ville}
        </p>
        <p className="mt-2 text-xl font-bold leading-tight">
          Cabinet de {draft.pays === 'FR' ? 'pédicurie-podologie' : 'podologie'} à {ville}
        </p>
        <p className="mt-2 text-xs text-neutral-600">{phrase}</p>
        <span className="mt-4 inline-block rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: t['--brand-ink'] }}>
          {rdv}
        </span>
      </div>

      <div className="px-5 pb-5" style={{ background: t['--brand-softer'] }}>
        <p className="pt-4 pb-3 text-sm font-semibold">
          {draft.voix === 'je' ? 'Mes compétences' : draft.voix === 'nous' ? 'Nos compétences' : 'Compétences du cabinet'}
        </p>
        {soins.length === 0 ? (
          <p className="pb-2 text-xs text-neutral-400">Choisissez vos compétences pour les voir apparaître.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {soins.slice(0, 6).map((s) => (
              <div key={s.slug} className="rounded-lg border border-neutral-200 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlIconeApi(iconeSoin(s.slug, s.icone))} alt="" width={20} height={20} className="mb-1.5" />
                <p className="text-xs font-bold">{s.titre_court}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-neutral-500">{s.resume}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-4">
        <p className="pb-2 text-sm font-semibold">{plusieurs ? 'Les praticiens' : 'Le praticien'}</p>
        <div className="flex flex-wrap gap-2">
          {draft.praticiens.map((p) => (
            <span key={p.id} className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: t['--brand-soft'], color: t['--brand-ink'] }}>
              {[p.prenom, p.nom].filter(Boolean).join(' ') || 'Praticien'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
