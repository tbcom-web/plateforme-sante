// Aperçu d'une proposition du générateur (parcours /creer « Votre site » et atelier /admin/atelier) : la structure est
// appliquée localement comme le fait le serveur au choix, puis les réglages de la proposition et les soins de base.
// Une seule fonction pour les deux écrans : l'atelier note exactement ce que voit le praticien.
import {
  appliquerProposition, appliquerUniversParcours, modeleDuSite, modeleIntegre, soinsDeBaseParcours,
  type ModeleManifeste, type Proposition, type SiteDraft, type Univers,
} from '@plateforme/core';

export type ContexteApercu = {
  proposes: readonly Univers[];
  modeles: readonly { id: string; manifeste: ModeleManifeste }[];
  slugs: readonly string[];
  themesActives: readonly string[];
};

export function apercuProposition(d: SiteDraft, p: Proposition, c: ContexteApercu): { draft: SiteDraft; modele: ModeleManifeste } | null {
  const u = c.proposes.find((x) => x.id === p.univers);
  if (!u) return null;
  const manifeste = (id: string) => c.modeles.find((m) => m.id === id)?.manifeste ?? modeleIntegre(id);
  const r = appliquerUniversParcours(d, u, { modeles: c.modeles.map((m) => m.manifeste), soinsConnus: [...c.slugs], themesActives: [...c.themesActives] });
  const x = appliquerProposition(r.draft, p);
  const soins = d.soins.length ? d.soins : soinsDeBaseParcours(d, u, [...c.slugs]);
  return { draft: { ...x, soins }, modele: modeleDuSite(manifeste(x.theme.modele), x.theme) };
}
