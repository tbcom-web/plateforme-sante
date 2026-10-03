import { buildTheme, iconeSoin, urlIconeApi, type SiteDraft } from '@plateforme/core';
import type { SoinCatalogue } from '@/lib/sites';

// Aperçu miniature du site, calculé avec le même thème que le générateur de sites.
const POLICES = {
  sobre: { titre: 'var(--font-inter), system-ui, sans-serif', poids: 650, rayon: 8, fond: '#ffffff' },
  chaleureux: { titre: 'ui-rounded, "Nunito", system-ui, sans-serif', poids: 800, rayon: 18, fond: '#fffdfa' },
  premium: { titre: 'Georgia, "Fraunces", serif', poids: 500, rayon: 4, fond: '#fcfbf8' },
} as const;

export default function Apercu({ draft, catalogue }: { draft: SiteDraft; catalogue: SoinCatalogue[] }) {
  const t = buildTheme(draft.theme.couleur);
  const p = POLICES[draft.theme.mise_en_page];
  const nom = [draft.praticien.prenom, draft.praticien.nom].filter(Boolean).join(' ') || 'Votre nom';
  const ville = draft.cabinet.ville || 'votre ville';
  const soins = catalogue.filter((s) => draft.soins.includes(s.slug));

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-black/5 bg-neutral-50 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-neutral-300" />
        <span className="size-2.5 rounded-full bg-neutral-300" />
        <span className="size-2.5 rounded-full bg-neutral-300" />
        <span className="ml-3 truncate text-xs text-neutral-500">Aperçu de votre site</span>
      </div>

      <div style={{ background: p.fond, color: '#1d2523' }}>
        <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: t['--brand-soft'] }}>
          <div className="flex items-center gap-2">
            <span
              className="grid size-8 place-items-center rounded-full text-xs font-bold text-white"
              style={{ background: t['--brand-ink'] }}
            >
              {(draft.praticien.prenom[0] ?? 'V') + (draft.praticien.nom[0] ?? 'N')}
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{nom}</p>
              <p className="text-[11px] text-neutral-500">Pédicure-podologue · {ville}</p>
            </div>
          </div>
          <span
            className="px-3 py-1.5 text-xs font-bold text-white"
            style={{ background: t['--brand-ink'], borderRadius: draft.theme.mise_en_page === 'chaleureux' ? 999 : p.rayon }}
          >
            Prendre RDV
          </span>
        </div>

        <div
          className="grid grid-cols-[1.4fr_1fr] items-center gap-4 px-5 py-8"
          style={{ background: `linear-gradient(180deg, ${t['--brand-softer']}, ${p.fond})` }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: t['--brand-ink'] }}>
              Pédicure-podologue · {draft.cabinet.quartier || ville}
            </p>
            <p className="mt-2 text-2xl leading-tight" style={{ fontFamily: p.titre, fontWeight: p.poids }}>
              Prendre soin de vos pieds, à chaque étape de la vie
            </p>
            <span
              className="mt-4 inline-block px-4 py-2 text-xs font-bold text-white"
              style={{ background: t['--brand-ink'], borderRadius: draft.theme.mise_en_page === 'chaleureux' ? 999 : p.rayon }}
            >
              Prendre rendez-vous
            </span>
          </div>
          <Decor style={draft.theme.style_images} t={t} initiales={(draft.praticien.prenom[0] ?? '') + (draft.praticien.nom[0] ?? '')} />
        </div>

        <div className="px-5 pb-6">
          <p className="mb-3 text-sm font-semibold" style={{ fontFamily: p.titre }}>
            Les soins proposés
          </p>
          {soins.length === 0 ? (
            <p className="text-xs text-neutral-400">Choisissez vos soins pour les voir apparaître.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {soins.slice(0, 6).map((s) => (
                <div key={s.slug} className="border p-3" style={{ borderColor: '#e6e8e6', borderRadius: p.rayon, background: '#fff' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlIconeApi(iconeSoin(s.slug, s.icone))} alt="" width={20} height={20} className="mb-1.5" />
                  <p className="text-xs font-bold">{s.titre_court}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-neutral-500">{s.resume}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Decor({ style, t, initiales }: { style: SiteDraft['theme']['style_images']; t: ReturnType<typeof buildTheme>; initiales: string }) {
  if (style === 'lignes')
    return (
      <svg viewBox="0 0 200 200" fill="none" aria-hidden>
        <circle cx="100" cy="100" r="85" stroke={t['--brand-line']} strokeWidth="2" />
        <circle cx="100" cy="100" r="55" stroke={t['--brand']} strokeWidth="2" />
        <path d="M45 140c20-28 38-40 55-40s35 12 55 40" stroke={t['--brand-ink']} strokeWidth="2" />
      </svg>
    );
  if (style === 'minimal')
    return (
      <svg viewBox="0 0 200 200" aria-hidden>
        <circle cx="100" cy="100" r="80" fill={t['--brand-soft']} />
        <text x="100" y="118" textAnchor="middle" fontSize="48" fontWeight="700" fill={t['--brand-ink']}>
          {initiales || 'VN'}
        </text>
      </svg>
    );
  return (
    <svg viewBox="0 0 200 200" aria-hidden>
      <path fill={t['--brand-soft']} d="M168 119c-8 38-46 67-85 58S12 132 20 92 62 20 104 24s71 56 64 95Z" />
      <ellipse cx="90" cy="122" rx="18" ry="29" fill={t['--brand-ink']} transform="rotate(-12 90 122)" />
      <ellipse cx="125" cy="104" rx="14" ry="22" fill={t['--brand']} transform="rotate(14 125 104)" />
      <circle cx="155" cy="42" r="11" fill={t['--brand']} opacity=".85" />
    </svg>
  );
}
