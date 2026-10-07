// Avis sur le directeur artistique gardés dans le navigateur tant que la migration 0035 (directeur_avis) n'est pas exécutée :
// lecture / ajout protégés (stockage indisponible : liste vide), export manuel en JSON (à déposer dans retours/directeur-avis.json).
import type { AvisDirecteur } from '@/lib/directeur-format';

const CLE = 'studio:directeur-avis:v1';

export function avisLocaux(): AvisDirecteur[] {
  try {
    const l = JSON.parse(window.localStorage.getItem(CLE) ?? '[]');
    return Array.isArray(l) ? l.filter((a) => a && typeof a.cle === 'string' && typeof a.decision === 'string') : [];
  } catch {
    return [];
  }
}

export function ajouterAvisLocal(a: AvisDirecteur): AvisDirecteur[] {
  const l = [...avisLocaux(), a].slice(-500);
  try { window.localStorage.setItem(CLE, JSON.stringify(l)); } catch { /* stockage indisponible : avis perdu au rechargement */ }
  return l;
}

export function exporterAvisLocaux(l: readonly AvisDirecteur[]) {
  const sans = l.map((a) => ({ nature: a.nature, cle: a.cle, decision: a.decision, remarque: a.remarque, jour: a.le?.slice(0, 10) ?? null }));
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(sans, null, 2)}\n`], { type: 'application/json' }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = 'directeur-avis.json';
  lien.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
