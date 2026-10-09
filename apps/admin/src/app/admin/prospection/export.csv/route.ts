import { csvProspection, installation, libelleStatutProspection, lireFiltresProspection } from '@plateforme/core';
import { casseNom, telephoneLisible } from '@plateforme/core/annuaire-sante';
import { exigerAdmin } from '@/lib/admin';
import { lireProspection } from '@/lib/prospection';

// Export CSV de la prospection RPPS (/admin/prospection/export.csv, admin seulement) : mêmes filtres que la page, 5 000 lignes au plus.

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  await exigerAdmin();
  const f = lireFiltresProspection(Object.fromEntries(new URL(req.url).searchParams));
  const r = await lireProspection(f, { tout: true });
  if (!r) return new Response('Migration 0055 à exécuter.', { status: 503 });
  const csv = csvProspection(r.lignes.map((p) => {
    const inst = installation(p);
    return {
      nom: casseNom(p.nom ?? ''), prenom: casseNom(p.prenom ?? ''), profession: p.profession ?? '', cabinet: casseNom(p.enseigne || p.raison_sociale || p.entreprise_nom || ''),
      adresse: p.adresse ?? '', codePostal: p.code_postal ?? '', commune: casseNom(p.commune ?? ''), telephone: p.telephone ? telephoneLisible(p.telephone) : '', email: p.email ?? '',
      installation: inst?.date ?? '', signal: inst?.libelle ?? '', statut: libelleStatutProspection(p.statut), relance: p.relance_le ?? '', note: p.note ?? '', rpps: p.rpps,
    };
  }));
  const jour = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="prospection-rpps-${f.departement || 'france'}-${jour}.csv"`,
      'cache-control': 'no-store',
    },
  });
}
