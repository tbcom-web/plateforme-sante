import 'server-only';
import { definitionPoids } from '@/lib/atelier';
import { definitionPolitique } from '@/lib/politique-evaluation';
import { definitionTranches } from '@/lib/tranches';
import { definitionContexteImages } from '@/lib/kits-images';
import { definitionProfilsDemo } from '@/app/chaine/donnees';
import { definitionSujetsKits } from '@/lib/sujets-validation';
import { definitionComposeur } from '@/lib/composeur';
import type { DefinitionInstantane } from '@/lib/apprentissage-instantane';

// Instantanés que la route de recalcul (api/apprentissage/recalcul) sait recalculer : MÊMES définitions que les pages (même clé, même
// calcul, même forme JSON), évaluées avec la session et les cookies de la personne (profession de la Dégustation, rôle).
export type DefinitionRecalcul = DefinitionInstantane<unknown, unknown> & { portee: 'admin' | 'equipe' | null };

export async function definitionRecalcul(cle: string, portee: string): Promise<DefinitionRecalcul | null> {
  const nom = cle.split('|')[0];
  const d = await (nom === 'poids' ? definitionPoids()
    : nom === 'politique' ? definitionPolitique()
      : nom === 'tranches' ? definitionTranches()
        : nom === 'contexte-images' ? definitionContexteImages()
          : nom === 'profils-demo' ? definitionProfilsDemo()
            // Kits des profils du point d'entrée « À valider » (sujets-validation.ts)
            : nom === 'sujets-kits' ? definitionSujetsKits(cle.split('|')[1] ?? '')
              // Propositions du composeur par profession et profil (lib/composeur.ts)
              : nom === 'composeur' ? definitionComposeur(cle)
              : null);
  return d && d.cle === cle && d.portee === portee ? (d as unknown as DefinitionRecalcul) : null;
}
