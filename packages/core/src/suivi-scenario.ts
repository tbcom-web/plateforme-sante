// Studio de recettes : la composition SUIT les paramètres (bug signalé par Paul le 2026-10-07 : « j'ai l'impression qu'il ne
// respecte pas les paramètres que j'applique »). Causes trouvées (audit des contrôles, captures Playwright des deux cadres) :
// 1. changer les couleurs préférées du scénario ne changeait pas la gamme : la composition était seulement « réparée » (gamme
//    gardée tant qu'elle n'était pas exclue) ; les couleurs choisies ne comptaient qu'au prochain dé Couleurs, et encore comme
//    simple préférence (poids 3, couleur libre possible) ;
// 2. changer les sujets gardait les photos et le héros de l'ancien sujet n° 1 (photos jamais relues, héros gardé s'il restait
//    parmi les principaux) ;
// 3. un verrou ne protégeait pas sa dimension des réparations d'un autre dé : « Tout changer » ou le dé Structure pouvaient
//    changer le style des illustrations verrouillé (structure Technique : relevé ou photos seulement), le dé Style remplacer les
//    photos verrouillées, etc.
// Correctifs : suivreScenario (couleurs → gamme parmi celles des couleurs choisies, sujets → photos et héros des nouveaux sujets),
// respecterVerrous (après tout tirage, chaque dimension verrouillée est remise telle quelle ; si la nouvelle structure ne permet
// pas le style verrouillé, la structure d'avant est gardée). Module pur.

import { gammesDesCouleurs } from './propositions';
import { gamme as gammeParId } from './gammes';
import {
  alea, herosPossibles, photosCompatibles, photosIntegreesBanque, reparerComposition, stylesPermis, sujetsActifs, tirerDimension, tirerPhotos,
  type CompositionRecette, type ContexteRecette,
} from './recettes';

const memes = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** Gammes des couleurs choisies (ordre de préférence), permises pour le scénario */
export function gammesPreferees(c: ContexteRecette): string[] {
  return gammesDesCouleurs({ priorites: { principaux: sujetsActifs(c.sujets), secondaires: [] }, couleursPreferees: c.couleursPreferees ?? [] });
}

/**
 * Composition après un changement de scénario (sujets, couleurs) : remise dans les garde-fous, puis
 * - couleurs choisies changées (dimension non verrouillée) : gamme parmi celles des couleurs choisies (la gamme actuelle si elle
 *   en fait partie, sinon un tirage déterministe jusqu'à en obtenir une) ;
 * - sujets changés : photos hors des nouveaux sujets retirées (photos non verrouillées), style « photos » sans photo → nouveau
 *   tirage ; sujet n° 1 changé (style non verrouillé) : héros du nouveau sujet n° 1.
 */
export function suivreScenario(x: CompositionRecette, avant: ContexteRecette, apres: ContexteRecette, verrous: readonly string[], graine: number): CompositionRecette {
  let y = reparerComposition(x, apres);
  const couleursAvant = avant.couleursPreferees ?? [];
  const couleursApres = apres.couleursPreferees ?? [];
  if (!verrous.includes('couleurs') && !memes(couleursAvant, couleursApres) && couleursApres.length) {
    const pref = gammesPreferees(apres);
    if (pref.length && !pref.includes(y.gamme)) {
      // Un dé d'abord (pondéré par les notes) ; sinon la première gamme des couleurs choisies que les garde-fous gardent
      let trouvee = false;
      for (let k = 0; k < 12 && !trouvee; k++) {
        const z = tirerDimension(y, 'couleurs', apres, graine + k);
        if (pref.includes(z.gamme)) { y = z; trouvee = true; }
      }
      for (const g of pref) {
        if (trouvee) break;
        const z = reparerComposition({ ...y, gamme: g, couleur: gammeParId(g)?.accent ?? y.couleur }, apres);
        if (z.gamme === g) { y = z; trouvee = true; }
      }
    }
  }
  const sujetsChanges = !memes(sujetsActifs(avant.sujets), sujetsActifs(apres.sujets));
  if (sujetsChanges && !verrous.includes('photos')) {
    const permises = new Set(photosCompatibles(apres.photos ?? photosIntegreesBanque(), { ...apres, nonImportees: true }).map((p) => p.p.url));
    y = { ...y, photos: y.photos.filter((u) => permises.has(u)) };
    if (y.visuels.style === 'photos' && !y.photos.length) y = { ...y, photos: tirerPhotos(apres, alea(graine, 'photos-scenario')) };
  }
  if (sujetsActifs(avant.sujets)[0] !== sujetsActifs(apres.sujets)[0] && !verrous.includes('visuels')) {
    const h = herosPossibles(apres)[0] ?? null;
    y = { ...y, visuels: { ...y.visuels, herosSujet: h } };
  }
  return reparerComposition(y, apres);
}

/**
 * Après un tirage (« Tout changer », dé d'une dimension) : chaque dimension VERROUILLÉE retrouve sa valeur d'avant. Style des
 * illustrations verrouillé que la nouvelle structure ne permet pas : la structure (et la composition des pages) d'avant est gardée.
 */
export function respecterVerrous(avant: CompositionRecette, apres: CompositionRecette, verrous: readonly string[], c: ContexteRecette): CompositionRecette {
  if (!verrous.length) return apres;
  let y = { ...apres };
  if (verrous.includes('structure')) y = { ...y, structure: avant.structure, sections: avant.sections };
  if (verrous.includes('visuels')) {
    if (!stylesPermis(c, y.structure).includes(avant.visuels.style)) y = { ...y, structure: avant.structure, sections: avant.sections };
    y = { ...y, visuels: { ...avant.visuels } };
  }
  if (verrous.includes('couleurs')) y = { ...y, gamme: avant.gamme, couleur: avant.couleur };
  if (verrous.includes('polices')) y = { ...y, police: avant.police };
  if (verrous.includes('photos') && y.visuels.style === 'photos' && avant.photos.length) y = { ...y, photos: [...avant.photos] };
  if (verrous.includes('effets')) y = { ...y, effets: avant.effets };
  for (const k of ['traitement', 'typo', 'details', 'menu'] as const) {
    if (verrous.includes(k) && k in avant) y = { ...y, [k]: (avant as Record<string, unknown>)[k] } as CompositionRecette;
  }
  return reparerComposition(y, c);
}
